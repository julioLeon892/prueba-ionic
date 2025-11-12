import { Injectable } from '@angular/core';
import {
  Firestore,
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Task } from '../../core/models/task';
import { TaskRepository } from '../../core/repositories/task.repository';
import { FirebaseAppService } from '../../infrastructure/firebase/firebase-app.service';
import { IonicStorageService } from '../../infrastructure/storage/ionic-storage.service';
import { CloudSyncService } from '../../infrastructure/firebase/cloud-sync.service';

interface TaskDoc {
  title: string;
  completed: boolean;
  categoryId?: string | null;
  createdAt: number;
  updatedAt: number;
}

const TASKS_CACHE_KEY = 'cache:firestore:tasks';

@Injectable({ providedIn: 'root' })
export class FirestoreTaskRepository implements TaskRepository {
  private readonly db: Firestore;
  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);
  private unsubscribe?: Unsubscribe;

  constructor(
    firebase: FirebaseAppService,
    private storage: IonicStorageService,
    private cloudSync: CloudSyncService,
  ) {
    this.db = this.bootstrapDb(firebase);
    this.cloudSync.update('tasks', 'connecting');
    void this.restoreCache();
    this.listenToRemote();
  }

  private bootstrapDb(firebase: FirebaseAppService): Firestore {
    try {
      return initializeFirestore(firebase.app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch (error) {
      return getFirestore(firebase.app);
    }
  }

  private async restoreCache() {
    const cached = await this.storage.get<Task[]>(TASKS_CACHE_KEY, []);
    if (cached.length) {
      this.tasksSubject.next(cached);
    }
  }

  private listenToRemote() {
    const tasksRef = collection(this.db, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    this.unsubscribe = onSnapshot(q, async snapshot => {
      const tasks = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as TaskDoc;
        return {
          id: docSnap.id,
          title: data.title,
          completed: !!data.completed,
          categoryId: data.categoryId ?? undefined,
          createdAt: data.createdAt ?? Date.now(),
          updatedAt: data.updatedAt ?? data.createdAt ?? Date.now(),
        } satisfies Task;
      });

      try {
        await this.persistLocally(tasks);
        this.cloudSync.update('tasks', 'online');
      } catch (error) {
        console.warn('[FirestoreTaskRepository] cache sync failed', error);
      }
    }, error => {
      console.error('[FirestoreTaskRepository] snapshot error', error);
      this.cloudSync.update('tasks', 'offline', this.describeError(error));
    });
  }

  tasks$(): Observable<Task[]> {
    return this.tasksSubject.asObservable();
  }

  private describeError(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.message;
    }
    return undefined;
  }

  private async persistLocally(tasks: Task[]) {
    this.tasksSubject.next(tasks);
    await this.storage.set(TASKS_CACHE_KEY, tasks);
  }

  private snapshotState(): Task[] {
    return this.tasksSubject.value.map(task => ({ ...task }));
  }

  private revertTo(previous: Task[]) {
    return this.persistLocally(previous);
  }

  private async performRemote<T>(operation: () => Promise<T>): Promise<T> {
    this.cloudSync.update('tasks', 'syncing');
    try {
      const result = await operation();
      this.cloudSync.update('tasks', 'online');
      return result;
    } catch (error) {
      this.cloudSync.update('tasks', 'offline', this.describeError(error));
      throw error;
    }
  }

  async create(title: string, categoryId?: string): Promise<void> {
    const now = Date.now();
    const id = uuid();
    const ref = doc(this.db, 'tasks', id);
    const previous = this.snapshotState();
    await this.persistLocally([
      {
        id,
        title,
        completed: false,
        categoryId,
        createdAt: now,
        updatedAt: now,
      },
      ...previous,
    ]);

    try {
      await this.performRemote(() => setDoc(ref, {
        title,
        completed: false,
        categoryId: categoryId ?? null,
        createdAt: now,
        updatedAt: now,
      } satisfies TaskDoc));
    } catch (error) {
      await this.revertTo(previous);
      throw error;
    }
  }

  async toggleComplete(id: string): Promise<void> {
    const ref = doc(this.db, 'tasks', id);
    const previous = this.snapshotState();
    const now = Date.now();
    const optimistic = previous.map(task =>
      task.id === id ? { ...task, completed: !task.completed, updatedAt: now } : task,
    );
    await this.persistLocally(optimistic);

    try {
      await this.performRemote(() => runTransaction(this.db, async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data() as TaskDoc;
        tx.update(ref, {
          completed: !data.completed,
          updatedAt: Date.now(),
        });
      }));
    } catch (error) {
      await this.revertTo(previous);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const previous = this.snapshotState();
    await this.persistLocally(previous.filter(task => task.id !== id));

    try {
      await this.performRemote(() => deleteDoc(doc(this.db, 'tasks', id)));
    } catch (error) {
      await this.revertTo(previous);
      throw error;
    }
  }

  async setCategory(id: string, categoryId?: string): Promise<void> {
    const ref = doc(this.db, 'tasks', id);
    const previous = this.snapshotState();
    const now = Date.now();
    await this.persistLocally(previous.map(task =>
      task.id === id ? { ...task, categoryId, updatedAt: now } : task,
    ));

    try {
      await this.performRemote(() => updateDoc(ref, {
        categoryId: categoryId ?? null,
        updatedAt: Date.now(),
      }));
    } catch (error) {
      await this.revertTo(previous);
      throw error;
    }
  }

  async setAllCompleted(completed: boolean): Promise<void> {
    const previous = this.snapshotState();
    const now = Date.now();
    await this.persistLocally(previous.map(task =>
      task.completed === completed ? task : { ...task, completed, updatedAt: now },
    ));

    try {
      await this.performRemote(async () => {
        const snapshot = await getDocs(collection(this.db, 'tasks'));
        const batch = writeBatch(this.db);
        let hasUpdates = false;
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data() as TaskDoc;
          if (data.completed !== completed) {
            batch.update(docSnap.ref, { completed, updatedAt: Date.now() });
            hasUpdates = true;
          }
        });
        if (hasUpdates) {
          await batch.commit();
        }
      });
    } catch (error) {
      await this.revertTo(previous);
      throw error;
    }
  }

  async removeCompleted(): Promise<void> {
    const previous = this.snapshotState();
    await this.persistLocally(previous.filter(task => !task.completed));

    try {
      await this.performRemote(async () => {
        const q = query(collection(this.db, 'tasks'), where('completed', '==', true));
        const snapshot = await getDocs(q);
        const batch = writeBatch(this.db);
        let hasDeletes = false;
        snapshot.docs.forEach(docSnap => {
          batch.delete(docSnap.ref);
          hasDeletes = true;
        });
        if (hasDeletes) {
          await batch.commit();
        }
      });
    } catch (error) {
      await this.revertTo(previous);
      throw error;
    }
  }

  async clearCategoryAssignments(categoryId: string): Promise<void> {
    const previous = this.snapshotState();
    const now = Date.now();
    await this.persistLocally(previous.map(task =>
      task.categoryId === categoryId ? { ...task, categoryId: undefined, updatedAt: now } : task,
    ));

    try {
      await this.performRemote(async () => {
        const q = query(collection(this.db, 'tasks'), where('categoryId', '==', categoryId));
        const snapshot = await getDocs(q);
        const batch = writeBatch(this.db);
        const updatedAt = Date.now();
        let hasUpdates = false;
        snapshot.docs.forEach(docSnap => {
          batch.update(docSnap.ref, { categoryId: null, updatedAt });
          hasUpdates = true;
        });
        if (hasUpdates) {
          await batch.commit();
        }
      });
    } catch (error) {
      await this.revertTo(previous);
      throw error;
    }
  }
}

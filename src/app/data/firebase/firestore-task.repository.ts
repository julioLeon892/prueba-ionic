import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import { Observable, shareReplay } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Task } from '../../core/models/task';
import { TaskRepository } from '../../core/repositories/task.repository';
import { FirebaseAppService } from '../../infrastructure/firebase/firebase-app.service';

interface TaskDoc {
  title: string;
  completed: boolean;
  categoryId?: string | null;
  createdAt: number;
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class FirestoreTaskRepository implements TaskRepository {
  private readonly db: Firestore;
  private cached$?: Observable<Task[]>;

  constructor(firebase: FirebaseAppService) {
    this.db = getFirestore(firebase.app);
  }

  tasks$(): Observable<Task[]> {
    if (!this.cached$) {
      const tasksRef = collection(this.db, 'tasks');
      const q = query(tasksRef, orderBy('createdAt', 'desc'));
      this.cached$ = new Observable<Task[]>(subscriber => {
        const unsubscribe = onSnapshot(q, snapshot => {
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
          subscriber.next(tasks);
        }, error => subscriber.error(error));
        return { unsubscribe };
      }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.cached$;
  }

  async create(title: string, categoryId?: string): Promise<void> {
    const now = Date.now();
    const id = uuid();
    const ref = doc(this.db, 'tasks', id);
    await setDoc(ref, {
      title,
      completed: false,
      categoryId: categoryId ?? null,
      createdAt: now,
      updatedAt: now,
    } satisfies TaskDoc);
  }

  async toggleComplete(id: string): Promise<void> {
    const ref = doc(this.db, 'tasks', id);
    await runTransaction(this.db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() as TaskDoc;
      tx.update(ref, {
        completed: !data.completed,
        updatedAt: Date.now(),
      });
    });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, 'tasks', id));
  }

  async setCategory(id: string, categoryId?: string): Promise<void> {
    const ref = doc(this.db, 'tasks', id);
    await updateDoc(ref, {
      categoryId: categoryId ?? null,
      updatedAt: Date.now(),
    });
  }

  async setAllCompleted(completed: boolean): Promise<void> {
    const snapshot = await getDocs(collection(this.db, 'tasks'));
    const batch = writeBatch(this.db);
    const now = Date.now();
    let hasUpdates = false;
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data() as TaskDoc;
      if (data.completed !== completed) {
        batch.update(docSnap.ref, { completed, updatedAt: now });
        hasUpdates = true;
      }
    });
    if (hasUpdates) {
      await batch.commit();
    }
  }

  async removeCompleted(): Promise<void> {
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
  }

  async clearCategoryAssignments(categoryId: string): Promise<void> {
    const q = query(collection(this.db, 'tasks'), where('categoryId', '==', categoryId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(this.db);
    const now = Date.now();
    let hasUpdates = false;
    snapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { categoryId: null, updatedAt: now });
      hasUpdates = true;
    });
    if (hasUpdates) {
      await batch.commit();
    }
  }
}

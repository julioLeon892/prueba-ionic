import { Injectable } from '@angular/core';
import {
  Firestore,
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Category } from '../../core/models/category';
import { CategoryRepository } from '../../core/repositories/category.repository';
import { FirebaseAppService } from '../../infrastructure/firebase/firebase-app.service';
import { IonicStorageService } from '../../infrastructure/storage/ionic-storage.service';
import { CloudSyncService } from '../../infrastructure/firebase/cloud-sync.service';

interface CategoryDoc {
  name: string;
  color?: string | null;
}

const CATEGORY_CACHE_KEY = 'cache:firestore:categories';

@Injectable({ providedIn: 'root' })
export class FirestoreCategoryRepository implements CategoryRepository {
  private readonly db: Firestore;
  private readonly categoriesSubject = new BehaviorSubject<Category[]>([]);
  private unsubscribe?: Unsubscribe;

  constructor(
    firebase: FirebaseAppService,
    private storage: IonicStorageService,
    private cloudSync: CloudSyncService,
  ) {
    this.db = this.bootstrapDb(firebase);
    this.cloudSync.update('categories', 'connecting');
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
    const cached = await this.storage.get<Category[]>(CATEGORY_CACHE_KEY, []);
    if (cached.length) {
      this.categoriesSubject.next(cached);
    }
  }

  private listenToRemote() {
    const ref = collection(this.db, 'categories');
    const q = query(ref, orderBy('name', 'asc'));
    this.unsubscribe = onSnapshot(q, async snapshot => {
      const categories = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as CategoryDoc;
        return {
          id: docSnap.id,
          name: data.name,
          color: data.color ?? undefined,
        } satisfies Category;
      });

      try {
        await this.persistLocally(categories);
        this.cloudSync.update('categories', 'online');
      } catch (error) {
        console.warn('[FirestoreCategoryRepository] cache sync failed', error);
      }
    }, error => {
      console.error('[FirestoreCategoryRepository] snapshot error', error);
      this.cloudSync.update('categories', 'offline', this.describeError(error));
    });
  }

  categories$(): Observable<Category[]> {
    return this.categoriesSubject.asObservable();
  }

  private describeError(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.message;
    }
    return undefined;
  }

  private async persistLocally(categories: Category[]) {
    this.categoriesSubject.next(categories);
    await this.storage.set(CATEGORY_CACHE_KEY, categories);
  }

  private snapshotState(): Category[] {
    return this.categoriesSubject.value.map(category => ({ ...category }));
  }

  private async performRemote<T>(operation: () => Promise<T>): Promise<T> {
    this.cloudSync.update('categories', 'syncing');
    try {
      const result = await operation();
      this.cloudSync.update('categories', 'online');
      return result;
    } catch (error) {
      this.cloudSync.update('categories', 'offline', this.describeError(error));
      throw error;
    }
  }

  async create(name: string, color?: string): Promise<void> {
    const id = uuid();
    const ref = doc(this.db, 'categories', id);
    const previous = this.snapshotState();
    await this.persistLocally(
      [{ id, name, color }, ...previous].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
      ),
    );

    try {
      await this.performRemote(() => setDoc(ref, { name, color: color ?? null } satisfies CategoryDoc));
    } catch (error) {
      await this.persistLocally(previous);
      throw error;
    }
  }

  async update(id: string, name: string, color?: string): Promise<void> {
    const ref = doc(this.db, 'categories', id);
    const previous = this.snapshotState();
    const updated = previous.map(category =>
      category.id === id ? { ...category, name, color } : category,
    ).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    await this.persistLocally(updated);

    try {
      await this.performRemote(() => updateDoc(ref, { name, color: color ?? null }));
    } catch (error) {
      await this.persistLocally(previous);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const previous = this.snapshotState();
    await this.persistLocally(previous.filter(category => category.id !== id));

    try {
      await this.performRemote(() => deleteDoc(doc(this.db, 'categories', id)));
    } catch (error) {
      await this.persistLocally(previous);
      throw error;
    }
  }
}

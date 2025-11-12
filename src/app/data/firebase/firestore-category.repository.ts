import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Observable, shareReplay } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Category } from '../../core/models/category';
import { CategoryRepository } from '../../core/repositories/category.repository';
import { FirebaseAppService } from '../../infrastructure/firebase/firebase-app.service';

interface CategoryDoc {
  name: string;
  color?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FirestoreCategoryRepository implements CategoryRepository {
  private readonly db: Firestore;
  private cached$?: Observable<Category[]>;

  constructor(firebase: FirebaseAppService) {
    this.db = getFirestore(firebase.app);
  }

  categories$(): Observable<Category[]> {
    if (!this.cached$) {
      const ref = collection(this.db, 'categories');
      const q = query(ref, orderBy('name', 'asc'));
      this.cached$ = new Observable<Category[]>(subscriber => {
        const unsubscribe = onSnapshot(q, snapshot => {
          const categories = snapshot.docs.map(docSnap => {
            const data = docSnap.data() as CategoryDoc;
            return {
              id: docSnap.id,
              name: data.name,
              color: data.color ?? undefined,
            } satisfies Category;
          });
          subscriber.next(categories);
        }, error => subscriber.error(error));
        return { unsubscribe };
      }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.cached$;
  }

  async create(name: string, color?: string): Promise<void> {
    const id = uuid();
    const ref = doc(this.db, 'categories', id);
    await setDoc(ref, { name, color: color ?? null } satisfies CategoryDoc);
  }

  async update(id: string, name: string, color?: string): Promise<void> {
    const ref = doc(this.db, 'categories', id);
    await updateDoc(ref, { name, color: color ?? null });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, 'categories', id));
  }
}

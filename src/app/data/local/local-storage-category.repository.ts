import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Category } from '../../core/models/category';
import { CategoryRepository } from '../../core/repositories/category.repository';
import { IonicStorageService } from '../../infrastructure/storage/ionic-storage.service';

const CATS_KEY = 'categories';

@Injectable({ providedIn: 'root' })
export class LocalStorageCategoryRepository implements CategoryRepository {
  private _categories$ = new BehaviorSubject<Category[]>([]);

  constructor(private store: IonicStorageService) { this.bootstrap(); }

  private async bootstrap() {
    const cats = await this.store.get<Category[]>(CATS_KEY, []);
    this._categories$.next(cats);
  }

  categories$() { return this._categories$.asObservable(); }

  private async persist(categories: Category[]) {
    await this.store.set(CATS_KEY, categories);
    this._categories$.next(categories);
  }

  async create(name: string, color?: string) {
    await this.persist([{ id: uuid(), name, color }, ...this._categories$.value]);
  }

  async update(id: string, name: string, color?: string) {
    await this.persist(this._categories$.value.map(c => c.id === id ? { ...c, name, color } : c));
  }

  async delete(id: string) {
    await this.persist(this._categories$.value.filter(c => c.id !== id));
  }
}

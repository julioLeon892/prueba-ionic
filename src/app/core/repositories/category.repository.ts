import { Observable } from 'rxjs';
import { Category } from '../models/category';

export abstract class CategoryRepository {
  abstract categories$(): Observable<Category[]>;
  abstract create(name: string, color?: string): Promise<void>;
  abstract update(id: string, name: string, color?: string): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

import { Observable } from 'rxjs';
import { Task } from '../models/task';

export abstract class TaskRepository {
  abstract tasks$(): Observable<Task[]>;
  abstract create(title: string, categoryId?: string): Promise<void>;
  abstract toggleComplete(id: string): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract setCategory(id: string, categoryId?: string): Promise<void>;
  abstract setAllCompleted(completed: boolean): Promise<void>;
  abstract removeCompleted(): Promise<void>;
  abstract clearCategoryAssignments(categoryId: string): Promise<void>;
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Task } from '../../core/models/task';
import { TaskRepository } from '../../core/repositories/task.repository';
import { IonicStorageService } from '../../infrastructure/storage/ionic-storage.service';

const TASKS_KEY = 'tasks';

@Injectable({ providedIn: 'root' })
export class LocalStorageTaskRepository implements TaskRepository {
  private _tasks$ = new BehaviorSubject<Task[]>([]);

  constructor(private store: IonicStorageService) { this.bootstrap(); }

  private async bootstrap() {
    const tasks = await this.store.get<Task[]>(TASKS_KEY, []);
    this._tasks$.next(tasks);
  }

  tasks$() { return this._tasks$.asObservable(); }

  private async persist(tasks: Task[]) {
    await this.store.set(TASKS_KEY, tasks);
    this._tasks$.next(tasks);
  }

  async create(title: string, categoryId?: string) {
    const now = Date.now();
    const newTask: Task = { id: uuid(), title, completed: false, categoryId, createdAt: now, updatedAt: now };
    await this.persist([newTask, ...this._tasks$.value]);
  }

  async toggleComplete(id: string) {
    const tasks = this._tasks$.value.map(t => t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t);
    await this.persist(tasks);
  }

  async delete(id: string) {
    await this.persist(this._tasks$.value.filter(t => t.id !== id));
  }

  async setCategory(id: string, categoryId?: string) {
    const tasks = this._tasks$.value.map(t => t.id === id ? { ...t, categoryId, updatedAt: Date.now() } : t);
    await this.persist(tasks);
  }
}

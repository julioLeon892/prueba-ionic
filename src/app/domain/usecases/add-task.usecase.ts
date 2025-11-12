import { Injectable } from '@angular/core';
import { TaskRepository } from '../../core/repositories/task.repository';

@Injectable({ providedIn: 'root' })
export class AddTaskUseCase {
  constructor(private repo: TaskRepository) {}
  execute(title: string, categoryId?: string) { return this.repo.create(title, categoryId); }
}

import { Injectable } from '@angular/core';
import { TaskRepository } from '../../core/repositories/task.repository';

@Injectable({ providedIn: 'root' })
export class SetTaskCategoryUseCase {
  constructor(private repo: TaskRepository) {}

  execute(taskId: string, categoryId?: string) {
    return this.repo.setCategory(taskId, categoryId);
  }
}

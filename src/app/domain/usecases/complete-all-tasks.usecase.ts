import { Injectable } from '@angular/core';
import { TaskRepository } from '../../core/repositories/task.repository';

@Injectable({ providedIn: 'root' })
export class CompleteAllTasksUseCase {
  constructor(private repo: TaskRepository) {}

  execute(completed: boolean) {
    return this.repo.setAllCompleted(completed);
  }
}

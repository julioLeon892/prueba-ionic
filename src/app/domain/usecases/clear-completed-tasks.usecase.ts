import { Injectable } from '@angular/core';
import { TaskRepository } from '../../core/repositories/task.repository';

@Injectable({ providedIn: 'root' })
export class ClearCompletedTasksUseCase {
  constructor(private repo: TaskRepository) {}

  execute() {
    return this.repo.removeCompleted();
  }
}

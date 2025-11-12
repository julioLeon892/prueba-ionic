import { Injectable } from '@angular/core';
import { TaskRepository } from '../../core/repositories/task.repository';

@Injectable({ providedIn: 'root' })
export class ToggleTaskUseCase {
  constructor(private repo: TaskRepository) {}
  execute(id: string) { return this.repo.toggleComplete(id); }
}

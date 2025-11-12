import { Injectable } from '@angular/core';
import { TaskRepository } from '../../core/repositories/task.repository';

@Injectable({ providedIn: 'root' })
export class DeleteTaskUseCase {
  constructor(private repo: TaskRepository) {}
  execute(id: string) { return this.repo.delete(id); }
}

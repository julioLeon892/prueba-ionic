import { Injectable } from '@angular/core';
import { CategoryRepository } from '../../core/repositories/category.repository';
import { TaskRepository } from '../../core/repositories/task.repository';

@Injectable({ providedIn: 'root' })
export class DeleteCategoryUseCase {
  constructor(
    private categories: CategoryRepository,
    private tasks: TaskRepository,
  ) {}

  async execute(id: string) {
    await this.categories.delete(id);
    await this.tasks.clearCategoryAssignments(id);
  }
}

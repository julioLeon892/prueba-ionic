import { Injectable } from '@angular/core';
import { CategoryRepository } from '../../core/repositories/category.repository';

@Injectable({ providedIn: 'root' })
export class UpdateCategoryUseCase {
  constructor(private repo: CategoryRepository) {}

  execute(id: string, name: string, color?: string) {
    return this.repo.update(id, name, color);
  }
}

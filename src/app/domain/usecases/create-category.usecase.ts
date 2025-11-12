import { Injectable } from '@angular/core';
import { CategoryRepository } from '../../core/repositories/category.repository';

@Injectable({ providedIn: 'root' })
export class CreateCategoryUseCase {
  constructor(private repo: CategoryRepository) {}

  execute(name: string, color?: string) {
    return this.repo.create(name, color);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { TaskRepository } from '../repositories/task.repository';
import { CategoryRepository } from '../repositories/category.repository';

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private selectedCategoryId$ = new BehaviorSubject<string | 'all'>('all');

  tasks$ = this.taskRepo.tasks$();
  categories$ = this.catRepo.categories$();

  filteredTasks$ = combineLatest([this.tasks$, this.selectedCategoryId$]).pipe(
    map(([tasks, catId]) => catId === 'all' ? tasks : tasks.filter(t => t.categoryId === catId))
  );

  constructor(private taskRepo: TaskRepository, private catRepo: CategoryRepository) {}

  selectCategory(catId: string | 'all') { this.selectedCategoryId$.next(catId); }
}

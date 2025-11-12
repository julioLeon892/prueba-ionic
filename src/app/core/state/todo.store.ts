import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { TaskRepository } from '../repositories/task.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { TaskWithCategory } from '../models/task-with-category';
import { TodoStats } from '../models/todo-stats';
import { CategorySummary } from '../models/category-summary';

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private selectedCategoryId$ = new BehaviorSubject<string | 'all' | 'none'>('all');

  readonly tasks$ = this.taskRepo.tasks$();
  readonly categories$ = this.catRepo.categories$();

  private readonly tasksWithCategory$ = combineLatest([this.tasks$, this.categories$]).pipe(
    map(([tasks, categories]) => tasks.map<TaskWithCategory>(task => ({
      ...task,
      category: task.categoryId ? categories.find(c => c.id === task.categoryId) : undefined,
    }))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly filteredTasks$ = combineLatest([this.tasksWithCategory$, this.selectedCategoryId$]).pipe(
    map(([tasks, catId]) => {
      if (catId === 'all') return tasks;
      if (catId === 'none') return tasks.filter(t => !t.categoryId);
      return tasks.filter(t => t.categoryId === catId);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly stats$ = this.tasksWithCategory$.pipe(
    map(tasks => {
      const total = tasks.length;
      const completed = tasks.reduce((acc, task) => acc + (task.completed ? 1 : 0), 0);
      return {
        total,
        completed,
        pending: total - completed,
      } as TodoStats;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly categorySummary$ = combineLatest([this.categories$, this.tasksWithCategory$]).pipe(
    map(([categories, tasks]) =>
      categories.map(category => {
        const tasksForCategory: TaskWithCategory[] = tasks.filter(task => task.categoryId === category.id);
        const completed = tasksForCategory.reduce((acc, task) => acc + (task.completed ? 1 : 0), 0);
        return {
          category,
          total: tasksForCategory.length,
          completed,
        } satisfies CategorySummary;
      })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly uncategorizedSummary$ = this.tasksWithCategory$.pipe(
    map(tasks => {
      const uncategorized = tasks.filter(task => !task.categoryId);
      const total = uncategorized.length;
      const completed = uncategorized.reduce((acc, task) => acc + (task.completed ? 1 : 0), 0);
      return {
        total,
        completed,
        pending: total - completed,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(private taskRepo: TaskRepository, private catRepo: CategoryRepository) {}

  selectCategory(catId: string | 'all' | 'none') { this.selectedCategoryId$.next(catId); }
}

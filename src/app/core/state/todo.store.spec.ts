import { BehaviorSubject, firstValueFrom, skip, take } from 'rxjs';
import { TodoStore } from './todo.store';
import { TaskRepository } from '../repositories/task.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { Task } from '../models/task';
import { Category } from '../models/category';

class StubTaskRepository extends TaskRepository {
  constructor(private subject: BehaviorSubject<Task[]>) { super(); }

  tasks$() { return this.subject.asObservable(); }
  create(): Promise<void> { return Promise.resolve(); }
  toggleComplete(): Promise<void> { return Promise.resolve(); }
  delete(): Promise<void> { return Promise.resolve(); }
  setCategory(): Promise<void> { return Promise.resolve(); }
  setAllCompleted(): Promise<void> { return Promise.resolve(); }
  removeCompleted(): Promise<void> { return Promise.resolve(); }
  clearCategoryAssignments(): Promise<void> { return Promise.resolve(); }
}

class StubCategoryRepository extends CategoryRepository {
  constructor(private subject: BehaviorSubject<Category[]>) { super(); }

  categories$() { return this.subject.asObservable(); }
  create(): Promise<void> { return Promise.resolve(); }
  update(): Promise<void> { return Promise.resolve(); }
  delete(): Promise<void> { return Promise.resolve(); }
}

describe('TodoStore', () => {
  let taskSubject: BehaviorSubject<Task[]>;
  let categorySubject: BehaviorSubject<Category[]>;
  let store: TodoStore;

  beforeEach(() => {
    taskSubject = new BehaviorSubject<Task[]>([
      { id: '1', title: 'Comprar', completed: false, categoryId: 'personal', createdAt: 1, updatedAt: 1 },
      { id: '2', title: 'Enviar informe', completed: true, categoryId: 'work', createdAt: 1, updatedAt: 1 },
      { id: '3', title: 'Revisar facturas', completed: false, createdAt: 1, updatedAt: 1 }
    ]);

    categorySubject = new BehaviorSubject<Category[]>([
      { id: 'work', name: 'Trabajo', color: '#3880ff' },
      { id: 'personal', name: 'Personal', color: '#eb445a' }
    ]);

    const taskRepo = new StubTaskRepository(taskSubject);
    const categoryRepo = new StubCategoryRepository(categorySubject);
    store = new TodoStore(taskRepo, categoryRepo);
  });

  it('filters tasks by selected category', async () => {
    const initial = await firstValueFrom(store.filteredTasks$.pipe(take(1)));
    expect(initial.length).toBe(3);

    store.selectCategory('work');
    const workTasks = await firstValueFrom(store.filteredTasks$.pipe(skip(1), take(1)));
    expect(workTasks.length).toBe(1);
    expect(workTasks[0].title).toBe('Enviar informe');

    store.selectCategory('none');
    const uncategorized = await firstValueFrom(store.filteredTasks$.pipe(skip(1), take(1)));
    expect(uncategorized.length).toBe(1);
    expect(uncategorized[0].id).toBe('3');
  });

  it('computes statistics for all tasks', async () => {
    const stats = await firstValueFrom(store.stats$.pipe(take(1)));
    expect(stats).toEqual({ total: 3, completed: 1, pending: 2 });
  });

  it('provides category summaries and uncategorized stats', async () => {
    const summary = await firstValueFrom(store.categorySummary$.pipe(take(1)));
    expect(summary).toEqual([
      { category: { id: 'work', name: 'Trabajo', color: '#3880ff' }, total: 1, completed: 1 },
      { category: { id: 'personal', name: 'Personal', color: '#eb445a' }, total: 1, completed: 0 }
    ]);

    const uncategorized = await firstValueFrom(store.uncategorizedSummary$.pipe(take(1)));
    expect(uncategorized).toEqual({ total: 1, completed: 0, pending: 1 });
  });
});

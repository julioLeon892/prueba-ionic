import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { TodoStore } from '../../../core/state/todo.store';
import { AddTaskUseCase } from '../../../domain/usecases/add-task.usecase';
import { ToggleTaskUseCase } from '../../../domain/usecases/toggle-task.usecase';
import { DeleteTaskUseCase } from '../../../domain/usecases/delete-task.usecase';
import { Task } from '../../../core/models/task';
import { Category } from '../../../core/models/category';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage {
  tasks$: Observable<Task[]> = this.store.filteredTasks$;
  categories$: Observable<Category[]> = this.store.categories$;
  selectedCat: string | 'all' = 'all';
  newTitle = '';

  constructor(
    private store: TodoStore,
    private addTask: AddTaskUseCase,
    private toggleUC: ToggleTaskUseCase,
    private delUC: DeleteTaskUseCase
  ) {}

  async add() {
    if (!this.newTitle.trim()) return;
    await this.addTask.execute(this.newTitle, this.selectedCat === 'all' ? undefined : this.selectedCat);
    this.newTitle = '';
  }

  onCatChange(v: string | 'all') { this.selectedCat = v; this.store.selectCategory(v); }
  toggle(id: string) { return this.toggleUC.execute(id); }
  remove(id: string) { return this.delUC.execute(id); }
  trackById = (_: number, x: { id: string }) => x.id;
}

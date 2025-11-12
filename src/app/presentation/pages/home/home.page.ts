import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';

// Componentes standalone de Ionic usados en el HTML
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonInput, IonSelect, IonSelectOption,
  IonButton, IonList, IonLabel, IonCheckbox,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonCardSubtitle, IonChip, IonText, IonItemDivider,
  IonIcon, IonProgressBar, IonNote
} from '@ionic/angular/standalone';

import { combineLatest } from 'rxjs';
import { TodoStore } from '../../../core/state/todo.store';
import { AddTaskUseCase } from '../../../domain/usecases/add-task.usecase';
import { ToggleTaskUseCase } from '../../../domain/usecases/toggle-task.usecase';
import { DeleteTaskUseCase } from '../../../domain/usecases/delete-task.usecase';
import { TaskWithCategory } from '../../../core/models/task-with-category';
import { Category } from '../../../core/models/category';
import { RemoteConfigService } from '../../../infrastructure/remote-config/remote-config.service';
import { CreateCategoryUseCase } from '../../../domain/usecases/create-category.usecase';
import { UpdateCategoryUseCase } from '../../../domain/usecases/update-category.usecase';
import { DeleteCategoryUseCase } from '../../../domain/usecases/delete-category.usecase';
import { SetTaskCategoryUseCase } from '../../../domain/usecases/set-task-category.usecase';
import { CompleteAllTasksUseCase } from '../../../domain/usecases/complete-all-tasks.usecase';
import { ClearCompletedTasksUseCase } from '../../../domain/usecases/clear-completed-tasks.usecase';
import { CategorySummary } from '../../../core/models/category-summary';

@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonInput, IonSelect, IonSelectOption,
    IonButton, IonList, IonLabel, IonCheckbox,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonCardSubtitle, IonChip, IonText, IonItemDivider,
    IonIcon, IonProgressBar, IonNote
  ]
})
export class HomePage {
  readonly vm$ = combineLatest({
    tasks: this.store.filteredTasks$,
    categories: this.store.categories$,
    categorySummary: this.store.categorySummary$,
    uncategorized: this.store.uncategorizedSummary$,
    stats: this.store.stats$,
  });

  // estado local
  selectedCat: string | 'all' | 'none' = 'all';
  newTitle = '';
  newTaskCategory: string | 'none' = 'none';

  // Remote Config
  bulkEnabled = false;
  welcome = 'Hola';

  constructor(
    private store: TodoStore,
    private addTask: AddTaskUseCase,
    private toggleUC: ToggleTaskUseCase,
    private delUC: DeleteTaskUseCase,
    private setTaskCategory: SetTaskCategoryUseCase,
    private createCategory: CreateCategoryUseCase,
    private updateCategory: UpdateCategoryUseCase,
    private deleteCategory: DeleteCategoryUseCase,
    private completeAllTasks: CompleteAllTasksUseCase,
    private clearCompletedTasks: ClearCompletedTasksUseCase,
    private rc: RemoteConfigService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    // APP_INITIALIZER ya llamó rc.init(); aquí solo leemos valores
    this.bulkEnabled = this.rc.isBulkActionsEnabled();
    this.welcome = this.rc.getWelcomeMessage();
  }

  async add() {
    const title = this.newTitle.trim();
    if (!title) return;
    const category = this.newTaskCategory === 'none' ? undefined : this.newTaskCategory;
    await this.addTask.execute(title, category);
    this.newTitle = '';
    this.newTaskCategory = 'none';
  }

  onCatChange(v: string | 'all' | 'none') {
    this.selectedCat = v;
    this.store.selectCategory(v);
  }

  toggle(id: string) { return this.toggleUC.execute(id); }
  remove(id: string) { return this.delUC.execute(id); }

  assignCategory(taskId: string, categoryId: string | 'none') {
    const normalized = categoryId === 'none' ? undefined : categoryId;
    return this.setTaskCategory.execute(taskId, normalized);
  }

  async openCategoryForm(category?: Category) {
    const alert = await this.alertCtrl.create({
      header: category ? 'Editar categoría' : 'Nueva categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: category?.name ?? '',
          attributes: { maxlength: 30 },
          placeholder: 'Nombre',
        },
        {
          name: 'color',
          type: 'text',
          value: category?.color ?? '#3880ff',
          attributes: { type: 'color' },
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: category ? 'Actualizar' : 'Crear',
          handler: (data: { name: string; color: string }) => {
            const name = data?.name?.trim();
            if (!name) { return false; }
            const color = data.color ? String(data.color) : undefined;
            if (category) {
              void this.updateCategory.execute(category.id, name, color);
            } else {
              void this.createCategory.execute(name, color);
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmDeleteCategory(category: Category) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar categoría',
      message: 'Las tareas vinculadas quedarán sin categoría. ¿Deseas continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => { void this.deleteCategory.execute(category.id); }
        }
      ]
    });

    await alert.present();
  }

  setAll(completed: boolean) { return this.completeAllTasks.execute(completed); }
  clearCompleted() { return this.clearCompletedTasks.execute(); }

  trackTask = (_: number, task: TaskWithCategory) => task.id;
  trackCategory = (_: number, category: Category) => category.id;
  trackCategorySummary = (_: number, summary: CategorySummary) => summary.category.id;

  selectFilter(cat: string | 'all' | 'none') {
    if (this.selectedCat === cat) {
      return;
    }
    this.onCatChange(cat);
  }

  isFilterActive(cat: string | 'all' | 'none') {
    return this.selectedCat === cat;
  }
}

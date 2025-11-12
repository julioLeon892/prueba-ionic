import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, ModalController, ToastController } from '@ionic/angular';

// Componentes standalone de Ionic usados en el HTML
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonSelect, IonSelectOption,
  IonButton, IonList, IonLabel, IonCheckbox,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonBadge, IonChip, IonText, IonItemDivider,
  IonIcon, IonSpinner
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
import { CloudSyncService } from '../../../infrastructure/firebase/cloud-sync.service';
import { TaskFormModalComponent, TaskModalResult } from '../../modals/task-form/task-form.modal';
import { CategoryFormModalComponent } from '../../modals/category-form/category-form.modal';
import { FirebaseError } from 'firebase/app';

@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonSelect, IonSelectOption,
    IonButton, IonList, IonLabel, IonCheckbox,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonBadge, IonChip, IonText, IonItemDivider,
    IonIcon, IonSpinner
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

  readonly sync$ = this.cloudSync.state$();

  // estado local
  selectedCat: string | 'all' | 'none' = 'all';
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
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private cloudSync: CloudSyncService,
  ) {}

  ngOnInit() {
    // APP_INITIALIZER ya llamó rc.init(); aquí solo leemos valores
    this.bulkEnabled = this.rc.isBulkActionsEnabled();
    this.welcome = this.rc.getWelcomeMessage();
  }

  onCatChange(v: string | 'all' | 'none') {
    this.selectedCat = v;
    this.store.selectCategory(v);
  }

  toggle(id: string) { this.safeRun(() => this.toggleUC.execute(id), 'No pudimos actualizar la tarea'); }
  remove(id: string) { this.safeRun(() => this.delUC.execute(id), 'No pudimos eliminar la tarea'); }

  assignCategory(taskId: string, categoryId: string | 'none') {
    const normalized = categoryId === 'none' ? undefined : categoryId;
    this.safeRun(() => this.setTaskCategory.execute(taskId, normalized), 'No pudimos actualizar la categoría');
  }

  async openTaskModal(categories: ReadonlyArray<Category>) {
    const modal = await this.modalCtrl.create({
      component: TaskFormModalComponent,
      componentProps: { categories },
      breakpoints: [0, 0.55, 0.85],
      initialBreakpoint: 0.6,
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss<TaskModalResult>();
    if (role === 'confirm' && data) {
      await this.runAction(
        () => this.addTask.execute(data.title, data.categoryId),
        'No pudimos crear la tarea',
      );
    }
  }

  async openCategoryForm(category?: Category) {
    const modal = await this.modalCtrl.create({
      component: CategoryFormModalComponent,
      componentProps: { category },
      breakpoints: [0, 0.55, 0.85],
      initialBreakpoint: 0.6,
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss<{ name: string; color?: string }>();
    if (role !== 'confirm' || !data) {
      return;
    }

    if (category) {
      await this.runAction(
        () => this.updateCategory.execute(category.id, data.name, data.color),
        'No pudimos actualizar la categoría',
      );
    } else {
      await this.runAction(
        () => this.createCategory.execute(data.name, data.color),
        'No pudimos crear la categoría',
      );
    }
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
          handler: () => { this.safeRun(() => this.deleteCategory.execute(category.id), 'No pudimos eliminar la categoría'); }
        }
      ]
    });

    await alert.present();
  }

  setAll(completed: boolean) { this.safeRun(() => this.completeAllTasks.execute(completed), 'No pudimos actualizar las tareas'); }
  clearCompleted() { this.safeRun(() => this.clearCompletedTasks.execute(), 'No pudimos limpiar las tareas completadas'); }

  trackTask = (_: number, task: TaskWithCategory) => task.id;
  trackCategory = (_: number, category: Category) => category.id;
  trackCategorySummary = (_: number, summary: CategorySummary) => summary.category.id;

  private safeRun(action: () => Promise<void>, errorMessage: string) {
    void this.runAction(action, errorMessage);
  }

  private async runAction(action: () => Promise<void>, errorMessage: string): Promise<boolean> {
    try {
      await action();
      return true;
    } catch (error) {
      await this.presentErrorToast(errorMessage, error);
      return false;
    }
  }

  private async presentErrorToast(message: string, error: unknown) {
    console.error(message, error);
    const toast = await this.toastCtrl.create({
      message: `${message}. ${this.describeError(error)}`,
      color: 'danger',
      duration: 4000,
      position: 'bottom',
      buttons: [{ text: 'Cerrar', role: 'cancel' }],
    });
    await toast.present();
  }

  private describeError(error: unknown): string {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'permission-denied':
          return 'Verifica las reglas de seguridad de tu proyecto Firebase.';
        case 'unavailable':
          return 'El servicio de Firestore no está disponible temporalmente.';
        default:
          return error.message;
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Inténtalo nuevamente.';
  }
}

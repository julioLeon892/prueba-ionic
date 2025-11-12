import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Componentes standalone de Ionic usados en el HTML
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonInput, IonSelect, IonSelectOption,
  IonButton, IonList, IonLabel, IonCheckbox,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent
} from '@ionic/angular/standalone';

import { Observable } from 'rxjs';
import { TodoStore } from '../../../core/state/todo.store';
import { AddTaskUseCase } from '../../../domain/usecases/add-task.usecase';
import { ToggleTaskUseCase } from '../../../domain/usecases/toggle-task.usecase';
import { DeleteTaskUseCase } from '../../../domain/usecases/delete-task.usecase';
import { Task } from '../../../core/models/task';
import { Category } from '../../../core/models/category';
import { RemoteConfigService } from '../../../infrastructure/remote-config/remote-config.service';

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
    IonCard, IonCardHeader, IonCardTitle, IonCardContent
  ]
})
export class HomePage {
  // streams
  tasks$: Observable<Task[]> = this.store.filteredTasks$;
  categories$: Observable<Category[]> = this.store.categories$;

  // estado local
  selectedCat: string | 'all' = 'all';
  newTitle = '';

  // Remote Config
  bulkEnabled = false;
  welcome = 'Hola';

  constructor(
    private store: TodoStore,
    private addTask: AddTaskUseCase,
    private toggleUC: ToggleTaskUseCase,
    private delUC: DeleteTaskUseCase,
    private rc: RemoteConfigService
  ) {}

  ngOnInit() {
    // APP_INITIALIZER ya llamó rc.init(); aquí solo leemos valores
    this.bulkEnabled = this.rc.isBulkActionsEnabled();
    this.welcome = this.rc.getWelcomeMessage();
  }

  async add() {
    if (!this.newTitle.trim()) return;
    await this.addTask.execute(
      this.newTitle,
      this.selectedCat === 'all' ? undefined : this.selectedCat
    );
    this.newTitle = '';
  }

  onCatChange(v: string | 'all') {
    this.selectedCat = v;
    this.store.selectCategory(v);
  }

  toggle(id: string) { return this.toggleUC.execute(id); }
  remove(id: string) { return this.delUC.execute(id); }

  trackById = (_: number, x: { id: string }) => x.id;
}

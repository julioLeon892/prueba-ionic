import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import { Category } from '../../../core/models/category';

export interface TaskModalResult {
  title: string;
  categoryId?: string;
}

@Component({
  standalone: true,
  selector: 'app-task-form-modal',
  templateUrl: './task-form.modal.html',
  styleUrls: ['./task-form.modal.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonFooter,
    IonChip,
    IonIcon,
  ],
})
export class TaskFormModalComponent {
  @Input() categories: ReadonlyArray<Category> = [];

  title = '';
  categoryId: string | 'none' = 'none';

  get previewCategory(): Category | undefined {
    if (this.categoryId === 'none') {
      return undefined;
    }

    return this.categories.find((category) => category.id === this.categoryId);
  }

  constructor(private modalCtrl: ModalController) {}

  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm(): void {
    const trimmed = this.title.trim();
    if (!trimmed) {
      return;
    }

    const payload: TaskModalResult = {
      title: trimmed,
      categoryId: this.categoryId === 'none' ? undefined : this.categoryId,
    };

    void this.modalCtrl.dismiss(payload, 'confirm');
  }
}

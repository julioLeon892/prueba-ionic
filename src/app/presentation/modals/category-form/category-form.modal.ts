import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonInput,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';
import { Category } from '../../../core/models/category';

interface CategoryModalResult {
  name: string;
  color?: string;
}

@Component({
  standalone: true,
  selector: 'app-category-form-modal',
  templateUrl: './category-form.modal.html',
  styleUrls: ['./category-form.modal.scss'],
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
    IonInput,
    IonLabel,
    IonFooter,
  ],
})
export class CategoryFormModalComponent implements OnInit {
  @Input() category?: Category;

  readonly palette = ['#ff6b6b', '#ffa502', '#ffce00', '#2ed573', '#1e90ff', '#3742fa', '#a55eea', '#ff4757'];

  name = '';
  selectedPreset?: string;
  customColor = '#5260ff';
  colorMode: 'none' | 'preset' | 'custom' = 'none';

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.name = this.category?.name ?? '';
    const existingColor = this.category?.color;
    if (!existingColor) {
      this.selectNone();
      return;
    }

    const normalized = existingColor.toLowerCase();
    if (this.palette.includes(normalized)) {
      this.colorMode = 'preset';
      this.selectedPreset = normalized;
    } else {
      this.colorMode = 'custom';
      this.customColor = existingColor;
    }
  }

  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm(): void {
    const trimmed = this.name.trim();
    if (!trimmed) {
      return;
    }

    const color = this.resolveColor();
    const payload: CategoryModalResult = {
      name: trimmed,
      color: color ?? undefined,
    };

    void this.modalCtrl.dismiss(payload, 'confirm');
  }

  selectPreset(color: string): void {
    this.colorMode = 'preset';
    this.selectedPreset = color;
  }

  selectNone(): void {
    this.colorMode = 'none';
    this.selectedPreset = undefined;
  }

  selectCustom(color: string): void {
    this.colorMode = 'custom';
    this.customColor = color;
  }

  isPresetSelected(color: string): boolean {
    return this.colorMode === 'preset' && this.selectedPreset === color;
  }

  private resolveColor(): string | undefined {
    if (this.colorMode === 'none') {
      return undefined;
    }

    if (this.colorMode === 'preset') {
      return this.selectedPreset;
    }

    return this.customColor;
  }
}

import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({ providedIn: 'root' })
export class IonicStorageService {
  private ready = this.storage.create();
  constructor(private storage: Storage) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    await this.ready;
    const val = await this.storage.get(key);
    return val ?? fallback;
  }

  async set<T>(key: string, value: T) {
    await this.ready;
    await this.storage.set(key, value);
  }
}

import { Injectable } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '../../firebase.config';

@Injectable({ providedIn: 'root' })
export class FirebaseAppService {
  private readonly appInstance: FirebaseApp;

  constructor() {
    const apps = getApps();
    this.appInstance = apps.length ? getApp() : initializeApp(firebaseConfig);
  }

  get app(): FirebaseApp {
    return this.appInstance;
  }
}

import { Injectable } from '@angular/core';
import {
  RemoteConfig,
  fetchAndActivate,
  getBoolean,
  getRemoteConfig,
  getString,
} from 'firebase/remote-config';
import { FirebaseAppService } from '../firebase/firebase-app.service';

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  private readonly rc: RemoteConfig;

  constructor(firebase: FirebaseAppService) {
    this.rc = getRemoteConfig(firebase.app);

    this.rc.settings = {
      fetchTimeoutMillis: 10_000,
      minimumFetchIntervalMillis: 60_000,
    };

    this.rc.defaultConfig = {
      feature_enableBulkActions: false,
      ui_welcome: 'Hola',
    };
  }

  async init() {
    try {
      await fetchAndActivate(this.rc);
    } catch (error) {
      console.warn('[RemoteConfig] fetch failed, using defaults', error);
    }
  }

  isBulkActionsEnabled() {
    return getBoolean(this.rc, 'feature_enableBulkActions');
  }

  getWelcomeMessage() {
    return getString(this.rc, 'ui_welcome') || 'Hola';
  }
}

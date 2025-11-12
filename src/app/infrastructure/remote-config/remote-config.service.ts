import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getRemoteConfig,
  fetchAndActivate,
  getBoolean,
  getString,
  RemoteConfig
} from 'firebase/remote-config';
import { firebaseConfig } from '../../firebase.config'; // o tu environments

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  private app = initializeApp(firebaseConfig);
  private rc: RemoteConfig = getRemoteConfig(this.app);

  constructor() {
    // ✅ Incluye ambos campos: fetchTimeoutMillis y minimumFetchIntervalMillis
    this.rc.settings = {
      fetchTimeoutMillis: 10_000,          // espera máx. 10s por la respuesta
      minimumFetchIntervalMillis: 60_000,  // cachea 60s en dev (en prod suele ser 12h)
    };

    // ✅ Defaults tipados sin "as any"
    this.rc.defaultConfig = {
      feature_enableBulkActions: false,
      ui_welcome: 'Hola',
    };
  }

  async init() {
    await fetchAndActivate(this.rc);
  }

  isBulkActionsEnabled() {
    return getBoolean(this.rc, 'feature_enableBulkActions');
  }

  getWelcomeMessage() {
    return getString(this.rc, 'ui_welcome') || 'Hola';
  }
}

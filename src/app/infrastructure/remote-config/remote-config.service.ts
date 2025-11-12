import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  fetchAndActivate,
  getBoolean,
  getRemoteConfig,
  getString,
  RemoteConfig,
} from 'firebase/remote-config';
import { firebaseConfig } from '../../firebase.config';
import { IonicStorageService } from '../storage/ionic-storage.service';

interface RemoteConfigSnapshot {
  featureEnableBulkActions: boolean;
  welcome: string;
  fetchedAt?: string;
}

const RC_CACHE_KEY = 'remote-config:last-snapshot';
const DEFAULT_SNAPSHOT: RemoteConfigSnapshot = {
  featureEnableBulkActions: false,
  welcome: 'Hola',
};

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  private app = initializeApp(firebaseConfig);
  private rc: RemoteConfig = getRemoteConfig(this.app);
  private snapshot: RemoteConfigSnapshot = { ...DEFAULT_SNAPSHOT };
  private restored = false;

  constructor(private storage: IonicStorageService) {
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
    await this.restoreFromCache();

    try {
      await fetchAndActivate(this.rc);
      await this.refreshSnapshotFromRemote();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[RemoteConfig] fetch failed, using cached/default values', err);
    }

    return this.snapshot;
  }

  isBulkActionsEnabled() {
    return this.snapshot.featureEnableBulkActions;
  }

  getWelcomeMessage() {
    return this.snapshot.welcome || DEFAULT_SNAPSHOT.welcome;
  }

  getLastSync(): string | undefined {
    return this.snapshot.fetchedAt;
  }

  private async restoreFromCache() {
    if (this.restored) {
      return;
    }

    this.restored = true;
    const cached = await this.storage.get<RemoteConfigSnapshot | null>(RC_CACHE_KEY, null);
    if (cached) {
      this.snapshot = { ...cached };
    }
  }

  private async refreshSnapshotFromRemote() {
    const latest: RemoteConfigSnapshot = {
      featureEnableBulkActions: getBoolean(this.rc, 'feature_enableBulkActions'),
      welcome: getString(this.rc, 'ui_welcome') || DEFAULT_SNAPSHOT.welcome,
      fetchedAt: new Date().toISOString(),
    };

    this.snapshot = latest;
    await this.storage.set(RC_CACHE_KEY, latest);
  }
}

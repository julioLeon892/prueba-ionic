import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  fetchAndActivate,
  getBoolean,
  getRemoteConfig,
  getString,
  RemoteConfig,
} from 'firebase/remote-config';
import { Firestore, doc, getFirestore, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '../../firebase.config';
import { IonicStorageService } from '../storage/ionic-storage.service';

export interface RemoteConfigSnapshot {
  featureEnableBulkActions: boolean;
  welcome: string;
  fetchedAt?: string;
}

export type RemoteConfigPersistenceStatus =
  | { status: 'idle' }
  | { status: 'from-cache'; fetchedAt?: string }
  | { status: 'success'; storedAt: string }
  | { status: 'error'; message: string };

const RC_CACHE_KEY = 'remote-config:last-snapshot';
const DEFAULT_SNAPSHOT: RemoteConfigSnapshot = {
  featureEnableBulkActions: false,
  welcome: 'Hola',
};

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  private app = initializeApp(firebaseConfig);
  private rc: RemoteConfig = getRemoteConfig(this.app);
  private firestore: Firestore = getFirestore(this.app);
  private snapshot: RemoteConfigSnapshot = { ...DEFAULT_SNAPSHOT };
  private restored = false;
  private persistenceState: RemoteConfigPersistenceStatus = { status: 'idle' };

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
      if (this.persistenceState.status === 'idle') {
        this.persistenceState = {
          status: 'error',
          message:
            err instanceof Error ? err.message : 'Error desconocido al sincronizar Remote Config',
        };
      }
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

  getPersistenceState(): RemoteConfigPersistenceStatus {
    return { ...this.persistenceState };
  }

  private async restoreFromCache() {
    if (this.restored) {
      return;
    }

    this.restored = true;
    const cached = await this.storage.get<RemoteConfigSnapshot | null>(RC_CACHE_KEY, null);
    if (cached) {
      this.snapshot = { ...cached };
      this.persistenceState = { status: 'from-cache', fetchedAt: cached.fetchedAt };
    }
  }

  private async refreshSnapshotFromRemote() {
    const latest: RemoteConfigSnapshot = {
      featureEnableBulkActions: getBoolean(this.rc, 'feature_enableBulkActions'),
      welcome: getString(this.rc, 'ui_welcome') || DEFAULT_SNAPSHOT.welcome,
      fetchedAt: new Date().toISOString(),
    };

    this.snapshot = latest;
    await this.persistSnapshot(latest);
  }

  private async persistSnapshot(snapshot: RemoteConfigSnapshot) {
    await this.storage.set(RC_CACHE_KEY, snapshot);

    try {
      const latestDoc = doc(this.firestore, 'remoteConfigSnapshots', 'latest');
      const storedAt = new Date().toISOString();
      await setDoc(latestDoc, {
        ...snapshot,
        storedAt,
      });
      this.persistenceState = { status: 'success', storedAt };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[RemoteConfig] failed to persist snapshot in Firestore', err);
      this.persistenceState = {
        status: 'error',
        message: err instanceof Error ? err.message : 'No se pudo guardar el snapshot en Firestore',
      };
    }
  }
}

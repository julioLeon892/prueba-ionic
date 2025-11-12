import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type CloudSyncPhase = 'connecting' | 'syncing' | 'online' | 'offline';

interface ChannelState {
  state: CloudSyncPhase;
  message?: string;
}

export interface CloudSyncSnapshot {
  state: CloudSyncPhase;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class CloudSyncService {
  private readonly channels = new Map<string, ChannelState>();
  private readonly aggregate$ = new BehaviorSubject<CloudSyncSnapshot>({ state: 'connecting' });

  update(channel: string, state: CloudSyncPhase, message?: string) {
    const previous = this.channels.get(channel);
    if (previous?.state === state && previous?.message === message) {
      return;
    }

    this.channels.set(channel, { state, message });
    this.computeSnapshot();
  }

  state$(): Observable<CloudSyncSnapshot> {
    return this.aggregate$.asObservable();
  }

  private computeSnapshot() {
    if (!this.channels.size) {
      this.aggregate$.next({ state: 'connecting' });
      return;
    }

    const states = Array.from(this.channels.values());
    const offline = states.find(entry => entry.state === 'offline');
    if (offline) {
      this.aggregate$.next({ state: 'offline', message: offline.message });
      return;
    }

    const connecting = states.find(entry => entry.state === 'connecting');
    if (connecting) {
      this.aggregate$.next({ state: 'connecting' });
      return;
    }

    const syncing = states.find(entry => entry.state === 'syncing');
    if (syncing) {
      this.aggregate$.next({ state: 'syncing' });
      return;
    }

    this.aggregate$.next({ state: 'online' });
  }
}

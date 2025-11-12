import { TestBed } from '@angular/core/testing';
import { RemoteConfigService } from './remote-config.service';
import { IonicStorageService } from '../storage/ionic-storage.service';
import * as firebaseApp from 'firebase/app';
import * as firebaseRemoteConfig from 'firebase/remote-config';

class IonicStorageStub {
  store: Record<string, unknown> = {};

  async get<T>(key: string, fallback: T): Promise<T> {
    if (Object.prototype.hasOwnProperty.call(this.store, key)) {
      return this.store[key] as T;
    }
    return fallback;
  }

  async set<T>(key: string, value: T) {
    this.store[key] = value;
  }
}

describe('RemoteConfigService', () => {
  let storage: IonicStorageStub;
  let service: RemoteConfigService;
  let fetchSpy: jasmine.Spy;
  let booleanSpy: jasmine.Spy;
  let stringSpy: jasmine.Spy;

  beforeEach(() => {
    storage = new IonicStorageStub();

    spyOn(firebaseApp, 'initializeApp').and.returnValue({} as firebaseApp.FirebaseApp);
    const rcInstance = { settings: {}, defaultConfig: {} } as unknown as firebaseRemoteConfig.RemoteConfig;
    spyOn(firebaseRemoteConfig, 'getRemoteConfig').and.returnValue(rcInstance);
    fetchSpy = spyOn(firebaseRemoteConfig, 'fetchAndActivate');
    booleanSpy = spyOn(firebaseRemoteConfig, 'getBoolean');
    stringSpy = spyOn(firebaseRemoteConfig, 'getString');

    TestBed.configureTestingModule({
      providers: [
        RemoteConfigService,
        { provide: IonicStorageService, useValue: storage },
      ],
    });

    service = TestBed.inject(RemoteConfigService);
  });

  it('persists fetched values when the remote config call succeeds', async () => {
    fetchSpy.and.resolveTo(true);
    booleanSpy.and.returnValue(true);
    stringSpy.and.returnValue('Hola Remote Config');

    await service.init();

    expect(service.isBulkActionsEnabled()).toBeTrue();
    expect(service.getWelcomeMessage()).toBe('Hola Remote Config');
    expect(storage.store['remote-config:last-snapshot']).toEqual(
      jasmine.objectContaining({
        featureEnableBulkActions: true,
        welcome: 'Hola Remote Config',
      })
    );
  });

  it('falls back to cached values when the remote config call fails', async () => {
    storage.store['remote-config:last-snapshot'] = {
      featureEnableBulkActions: true,
      welcome: 'Mensaje cacheado',
      fetchedAt: '2024-05-01T00:00:00.000Z',
    };

    fetchSpy.and.rejectWith(new Error('network error'));
    booleanSpy.and.returnValue(false);
    stringSpy.and.returnValue('');

    await service.init();

    expect(service.isBulkActionsEnabled()).toBeTrue();
    expect(service.getWelcomeMessage()).toBe('Mensaje cacheado');
  });
});

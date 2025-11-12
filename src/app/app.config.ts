import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular/standalone';
import { RouteReuseStrategy } from '@angular/router';
import { IonicStorageModule } from '@ionic/storage-angular';

import { TaskRepository } from './core/repositories/task.repository';
import { CategoryRepository } from './core/repositories/category.repository';
import { FirestoreTaskRepository } from './data/firebase/firestore-task.repository';
import { FirestoreCategoryRepository } from './data/firebase/firestore-category.repository';

import { RemoteConfigService } from './infrastructure/remote-config/remote-config.service';

function initRemoteConfig(rc: RemoteConfigService) {
  return () => rc.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    provideRouter(routes),
    provideIonicAngular(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    importProvidersFrom(IonicStorageModule.forRoot()),
    { provide: TaskRepository, useClass: FirestoreTaskRepository },
    { provide: CategoryRepository, useClass: FirestoreCategoryRepository },
    { provide: APP_INITIALIZER, useFactory: initRemoteConfig, deps: [RemoteConfigService], multi: true },
  ],
};

import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular/standalone';
import { RouteReuseStrategy } from '@angular/router';
import { IonicStorageModule } from '@ionic/storage-angular';

import { TaskRepository } from './core/repositories/task.repository';
import { CategoryRepository } from './core/repositories/category.repository';
import { LocalStorageTaskRepository } from './data/local/local-storage-task.repository';
import { LocalStorageCategoryRepository } from './data/local/local-storage-category.repository';

import { RemoteConfigService } from './infrastructure/remote-config/remote-config.service';

function initRemoteConfig(rc: RemoteConfigService) {
  return () => rc.init(); // se espera a que fetchAndActivate termine
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideIonicAngular(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    importProvidersFrom(IonicStorageModule.forRoot()),
    { provide: TaskRepository, useClass: LocalStorageTaskRepository },
    { provide: CategoryRepository, useClass: LocalStorageCategoryRepository },
    { provide: APP_INITIALIZER, useFactory: initRemoteConfig, deps: [RemoteConfigService], multi: true },
  ],
};

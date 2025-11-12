import { bootstrapApplication } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import {
  add as addIcon,
  bookmark,
  bookmarkOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  cloudUploadOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

addIcons({
  add: addIcon,
  bookmark,
  'bookmark-outline': bookmarkOutline,
  'cloud-done-outline': cloudDoneOutline,
  'cloud-offline-outline': cloudOfflineOutline,
  'cloud-upload-outline': cloudUploadOutline,
  'create-outline': createOutline,
  'trash-outline': trashOutline,
});

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));

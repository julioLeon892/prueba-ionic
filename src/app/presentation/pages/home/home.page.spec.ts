import { of } from 'rxjs';
import { HomePage } from './home.page';
import { TodoStore } from '../../../core/state/todo.store';
import { AddTaskUseCase } from '../../../domain/usecases/add-task.usecase';
import { ToggleTaskUseCase } from '../../../domain/usecases/toggle-task.usecase';
import { DeleteTaskUseCase } from '../../../domain/usecases/delete-task.usecase';
import { SetTaskCategoryUseCase } from '../../../domain/usecases/set-task-category.usecase';
import { CreateCategoryUseCase } from '../../../domain/usecases/create-category.usecase';
import { UpdateCategoryUseCase } from '../../../domain/usecases/update-category.usecase';
import { DeleteCategoryUseCase } from '../../../domain/usecases/delete-category.usecase';
import { CompleteAllTasksUseCase } from '../../../domain/usecases/complete-all-tasks.usecase';
import { ClearCompletedTasksUseCase } from '../../../domain/usecases/clear-completed-tasks.usecase';
import { RemoteConfigService } from '../../../infrastructure/remote-config/remote-config.service';
import { AlertController, ModalController, ToastController } from '@ionic/angular/standalone';
import { CloudSyncService } from '../../../infrastructure/firebase/cloud-sync.service';
import { Category } from '../../../core/models/category';

describe('HomePage', () => {
  let component: HomePage;
  let store: TodoStore & { selectCategory: jasmine.Spy };
  let addTask: jasmine.SpyObj<AddTaskUseCase>;
  let toggleTask: jasmine.SpyObj<ToggleTaskUseCase>;
  let deleteTask: jasmine.SpyObj<DeleteTaskUseCase>;
  let setTaskCategory: jasmine.SpyObj<SetTaskCategoryUseCase>;
  let createCategory: jasmine.SpyObj<CreateCategoryUseCase>;
  let updateCategory: jasmine.SpyObj<UpdateCategoryUseCase>;
  let deleteCategory: jasmine.SpyObj<DeleteCategoryUseCase>;
  let completeAll: jasmine.SpyObj<CompleteAllTasksUseCase>;
  let clearCompleted: jasmine.SpyObj<ClearCompletedTasksUseCase>;
  let remoteConfig: jasmine.SpyObj<RemoteConfigService>;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let latestAlertOptions: any;
  let cloudSync: jasmine.SpyObj<CloudSyncService>;
  let modalCtrl: jasmine.SpyObj<ModalController>;
  let modalDismissResponse: { data: any; role: string };
  let latestModalOptions: any;

  beforeEach(() => {
    store = {
      filteredTasks$: of([]),
      categories$: of([]),
      categorySummary$: of([]),
      uncategorizedSummary$: of({ total: 0, completed: 0, pending: 0 }),
      stats$: of({ total: 0, completed: 0, pending: 0 }),
      selectCategory: jasmine.createSpy('selectCategory')
    } as unknown as TodoStore & { selectCategory: jasmine.Spy };

    addTask = jasmine.createSpyObj<AddTaskUseCase>('AddTaskUseCase', ['execute']);
    toggleTask = jasmine.createSpyObj<ToggleTaskUseCase>('ToggleTaskUseCase', ['execute']);
    deleteTask = jasmine.createSpyObj<DeleteTaskUseCase>('DeleteTaskUseCase', ['execute']);
    setTaskCategory = jasmine.createSpyObj<SetTaskCategoryUseCase>('SetTaskCategoryUseCase', ['execute']);
    createCategory = jasmine.createSpyObj<CreateCategoryUseCase>('CreateCategoryUseCase', ['execute']);
    updateCategory = jasmine.createSpyObj<UpdateCategoryUseCase>('UpdateCategoryUseCase', ['execute']);
    deleteCategory = jasmine.createSpyObj<DeleteCategoryUseCase>('DeleteCategoryUseCase', ['execute']);
    completeAll = jasmine.createSpyObj<CompleteAllTasksUseCase>('CompleteAllTasksUseCase', ['execute']);
    clearCompleted = jasmine.createSpyObj<ClearCompletedTasksUseCase>('ClearCompletedTasksUseCase', ['execute']);

    remoteConfig = jasmine.createSpyObj<RemoteConfigService>('RemoteConfigService', ['isBulkActionsEnabled', 'getWelcomeMessage']);
    remoteConfig.isBulkActionsEnabled.and.returnValue(true);
    remoteConfig.getWelcomeMessage.and.returnValue('Hola remoto');

    const presentSpy = jasmine.createSpy('present').and.resolveTo();
    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertCtrl.create.and.callFake(async (opts) => {
      latestAlertOptions = opts;
      return { present: presentSpy } as any;
    });

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({ present: presentSpy } as any);

    cloudSync = jasmine.createSpyObj<CloudSyncService>('CloudSyncService', ['update', 'state$']);
    cloudSync.state$.and.returnValue(of({ state: 'online' }));

    modalDismissResponse = { data: null, role: 'cancel' };
    modalCtrl = jasmine.createSpyObj<ModalController>('ModalController', ['create']);
    modalCtrl.create.and.callFake(async (options) => {
      latestModalOptions = options;
      return {
        present: presentSpy,
        onWillDismiss: jasmine
          .createSpy('onWillDismiss')
          .and.resolveTo(modalDismissResponse),
      } as any;
    });

    component = new HomePage(
      store,
      addTask,
      toggleTask,
      deleteTask,
      setTaskCategory,
      createCategory,
      updateCategory,
      deleteCategory,
      completeAll,
      clearCompleted,
      remoteConfig,
      alertCtrl,
      modalCtrl,
      toastCtrl,
      cloudSync,
    );
  });

  it('should read remote config on init', () => {
    component.ngOnInit();
    expect(component.bulkEnabled).toBeTrue();
    expect(component.welcome).toBe('Hola remoto');
  });

  it('should create a modal for a new task and persist on confirm', async () => {
    addTask.execute.and.resolveTo();
    modalDismissResponse = { data: { title: 'Nueva tarea', categoryId: 'cat-1' }, role: 'confirm' };

    await component.openTaskModal([{ id: 'cat-1', name: 'Trabajo', color: '#f00' }]);

    expect(modalCtrl.create).toHaveBeenCalled();
    expect(latestModalOptions.component).toBeDefined();
    expect(latestModalOptions.cssClass).toBe('dialog-modal');
    expect(addTask.execute).toHaveBeenCalledWith('Nueva tarea', 'cat-1');
  });

  it('should skip task creation when modal is cancelled', async () => {
    modalDismissResponse = { data: null, role: 'cancel' };

    await component.openTaskModal([]);

    expect(addTask.execute).not.toHaveBeenCalled();
  });

  it('should surface an error toast if the task modal fails to open', async () => {
    toastCtrl.create.calls.reset();
    modalCtrl.create.and.callFake(async () => { throw new Error('boom'); });

    await component.openTaskModal([]);

    expect(toastCtrl.create).toHaveBeenCalled();
  });

  it('should change filter and propagate to store', () => {
    component.onCatChange('work');
    expect(component.selectedCat).toBe('work');
    expect(store.selectCategory).toHaveBeenCalledWith('work');
  });

  it('should assign categories to tasks', () => {
    setTaskCategory.execute.and.resolveTo();
    component.assignCategory('task-1', 'none');
    expect(setTaskCategory.execute).toHaveBeenCalledWith('task-1', undefined);
    component.assignCategory('task-1', 'cat');
    expect(setTaskCategory.execute).toHaveBeenCalledWith('task-1', 'cat');
  });

  it('should delegate bulk operations', () => {
    completeAll.execute.and.resolveTo();
    clearCompleted.execute.and.resolveTo();
    component.setAll(true);
    component.clearCompleted();
    expect(completeAll.execute).toHaveBeenCalledWith(true);
    expect(clearCompleted.execute).toHaveBeenCalled();
  });

  it('should open create category modal and call use case on confirm', async () => {
    createCategory.execute.and.resolveTo();
    modalDismissResponse = { data: { name: 'Trabajo', color: '#123456' }, role: 'confirm' };

    await component.openCategoryForm();

    expect(modalCtrl.create).toHaveBeenCalled();
    expect(latestModalOptions.cssClass).toBe('dialog-modal');
    expect(createCategory.execute).toHaveBeenCalledWith('Trabajo', '#123456');
  });

  it('should open edit category modal and call update on confirm', async () => {
    updateCategory.execute.and.resolveTo();
    const category: Category = { id: '1', name: 'Original', color: '#ffffff' };
    modalDismissResponse = { data: { name: 'Actualizada', color: '#abcdef' }, role: 'confirm' };

    await component.openCategoryForm(category);

    expect(updateCategory.execute).toHaveBeenCalledWith('1', 'Actualizada', '#abcdef');
    expect(latestModalOptions.cssClass).toBe('dialog-modal');
  });

  it('should surface an error toast if the category modal fails to open', async () => {
    toastCtrl.create.calls.reset();
    modalCtrl.create.and.callFake(async () => { throw new Error('boom'); });

    await component.openCategoryForm();

    expect(toastCtrl.create).toHaveBeenCalled();
  });

  it('should confirm deletion of category', async () => {
    deleteCategory.execute.and.resolveTo();
    const category: Category = { id: '2', name: 'Borrar', color: '#fff' };
    await component.confirmDeleteCategory(category);
    const handler = latestAlertOptions.buttons[1].handler as () => void;
    handler();
    expect(deleteCategory.execute).toHaveBeenCalledWith('2');
  });
});

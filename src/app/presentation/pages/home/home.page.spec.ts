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
import { AlertController } from '@ionic/angular';
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
  let latestAlertOptions: any;

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
    );
  });

  it('should read remote config on init', () => {
    component.ngOnInit();
    expect(component.bulkEnabled).toBeTrue();
    expect(component.welcome).toBe('Hola remoto');
  });

  it('should add a task and reset local state', async () => {
    addTask.execute.and.resolveTo();
    component.newTitle = 'Nueva tarea';
    component.newTaskCategory = 'cat-1';

    await component.add();

    expect(addTask.execute).toHaveBeenCalledWith('Nueva tarea', 'cat-1');
    expect(component.newTitle).toBe('');
    expect(component.newTaskCategory).toBe('none');
  });

  it('should ignore empty titles', async () => {
    component.newTitle = '  ';
    await component.add();
    expect(addTask.execute).not.toHaveBeenCalled();
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

  it('should open create category dialog and call use case', async () => {
    createCategory.execute.and.resolveTo();
    await component.openCategoryForm();
    expect(alertCtrl.create).toHaveBeenCalled();
    const handler = latestAlertOptions.buttons[1].handler as (data: any) => boolean;
    handler({ name: 'Trabajo', color: '#123456' });
    expect(createCategory.execute).toHaveBeenCalledWith('Trabajo', '#123456');
  });

  it('should open edit category dialog and call update', async () => {
    updateCategory.execute.and.resolveTo();
    const category: Category = { id: '1', name: 'Original', color: '#ffffff' };
    await component.openCategoryForm(category);
    const handler = latestAlertOptions.buttons[1].handler as (data: any) => boolean;
    handler({ name: 'Actualizada', color: '#abcdef' });
    expect(updateCategory.execute).toHaveBeenCalledWith('1', 'Actualizada', '#abcdef');
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

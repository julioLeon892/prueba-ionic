import { CreateCategoryUseCase } from './create-category.usecase';
import { UpdateCategoryUseCase } from './update-category.usecase';
import { DeleteCategoryUseCase } from './delete-category.usecase';
import { SetTaskCategoryUseCase } from './set-task-category.usecase';
import { CompleteAllTasksUseCase } from './complete-all-tasks.usecase';
import { ClearCompletedTasksUseCase } from './clear-completed-tasks.usecase';
import { CategoryRepository } from '../../core/repositories/category.repository';
import { TaskRepository } from '../../core/repositories/task.repository';

function createCategoryRepo() {
  return jasmine.createSpyObj<CategoryRepository>('CategoryRepository', [
    'categories$', 'create', 'update', 'delete'
  ]);
}

function createTaskRepo() {
  return jasmine.createSpyObj<TaskRepository>('TaskRepository', [
    'tasks$', 'create', 'toggleComplete', 'delete', 'setCategory',
    'setAllCompleted', 'removeCompleted', 'clearCategoryAssignments'
  ]);
}

describe('Category & task use cases', () => {
  let categoryRepo: jasmine.SpyObj<CategoryRepository>;
  let taskRepo: jasmine.SpyObj<TaskRepository>;

  beforeEach(() => {
    categoryRepo = createCategoryRepo();
    taskRepo = createTaskRepo();
  });

  it('creates categories', () => {
    const useCase = new CreateCategoryUseCase(categoryRepo);
    categoryRepo.create.and.resolveTo();
    useCase.execute('Trabajo', '#ff0000');
    expect(categoryRepo.create).toHaveBeenCalledWith('Trabajo', '#ff0000');
  });

  it('updates categories', () => {
    const useCase = new UpdateCategoryUseCase(categoryRepo);
    categoryRepo.update.and.resolveTo();
    useCase.execute('1', 'Nuevo nombre', '#00ff00');
    expect(categoryRepo.update).toHaveBeenCalledWith('1', 'Nuevo nombre', '#00ff00');
  });

  it('deletes categories and clears assignments', async () => {
    const useCase = new DeleteCategoryUseCase(categoryRepo, taskRepo);
    categoryRepo.delete.and.resolveTo();
    taskRepo.clearCategoryAssignments.and.resolveTo();
    await useCase.execute('5');
    expect(categoryRepo.delete).toHaveBeenCalledWith('5');
    expect(taskRepo.clearCategoryAssignments).toHaveBeenCalledWith('5');
  });

  it('assigns a category to a task', () => {
    const useCase = new SetTaskCategoryUseCase(taskRepo);
    taskRepo.setCategory.and.resolveTo();
    useCase.execute('task-1', 'cat-1');
    expect(taskRepo.setCategory).toHaveBeenCalledWith('task-1', 'cat-1');
  });

  it('completes all tasks', () => {
    const useCase = new CompleteAllTasksUseCase(taskRepo);
    taskRepo.setAllCompleted.and.resolveTo();
    useCase.execute(true);
    expect(taskRepo.setAllCompleted).toHaveBeenCalledWith(true);
  });

  it('clears completed tasks', () => {
    const useCase = new ClearCompletedTasksUseCase(taskRepo);
    taskRepo.removeCompleted.and.resolveTo();
    useCase.execute();
    expect(taskRepo.removeCompleted).toHaveBeenCalled();
  });
});

import { Category } from './category';
import { Task } from './task';

export interface TaskWithCategory extends Task {
  category?: Category;
}

export interface Task {
  id: string; title: string; completed: boolean;
  categoryId?: string; createdAt: number; updatedAt: number;
}

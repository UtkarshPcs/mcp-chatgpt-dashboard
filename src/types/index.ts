export type TaskStatus = 'current' | 'upcoming' | 'backlog' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  subject?: string;
  chapter?: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  priority: TaskPriority;
  estimatedTime?: string;
  dueDate?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

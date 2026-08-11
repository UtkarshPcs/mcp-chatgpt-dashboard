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

export type ChapterStatus = 'not_started' | 'in_progress' | 'revision' | 'completed';

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  progress: number; // 0-100
  status: ChapterStatus;
  priority: TaskPriority;
  estimatedTime?: string;
  targetDate?: string;
  notes?: string;
  nextRevisionDate?: string;
  lastRevisionDate?: string;
  revisionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type Section = 'Science' | 'Mathematics' | 'Social Science (SST)' | 'English' | 'Hindi' | 'Information Technology (IT)' | 'Other';

export interface Subject {
  id: string;
  name: string;
  section: Section;
  color?: string; // e.g., 'blue', 'red', 'emerald'
  createdAt: string;
  updatedAt: string;
}

export interface AIRecommendation {
  chapterId: string;
  subjectId: string;
  reason: string;
  estimatedTime: string;
  priority: TaskPriority;
  updatedAt: string;
}

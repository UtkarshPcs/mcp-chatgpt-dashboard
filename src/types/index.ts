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

export interface ChapterTaskState {
  status: 'completed' | 'not_started';
  completedAt?: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  progress: number; // 0-100 (Legacy/Fallback progress)
  status: ChapterStatus;
  priority: TaskPriority;
  estimatedTime?: string;
  targetDate?: string;
  notes?: string;
  nextRevisionDate?: string;
  lastRevisionDate?: string;
  revisionCount?: number;
  tasks?: Record<string, ChapterTaskState>; // Maps SubjectTaskTemplate.id to ChapterTaskState
  createdAt: string;
  updatedAt: string;
}

export type Section = 'Science' | 'Mathematics' | 'Social Science (SST)' | 'English' | 'Hindi' | 'Information Technology (IT)' | 'Other';

export interface SubjectTaskTemplate {
  id: string;
  name: string;
  weight: number;
  order: number;
}

export interface Subject {
  id: string;
  name: string;
  section: Section;
  color?: string; // e.g., 'blue', 'red', 'emerald'
  tasks?: SubjectTaskTemplate[]; // Dynamic task template for this subject
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

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

export type ExamLocation = 'School' | 'Coaching';

export interface Exam {
  id: string;
  name: string;
  date: string; // ISO Date String
  location: ExamLocation;
  chapterIds: string[]; // References to actual chapter IDs
  createdAt: string;
  updatedAt: string;
}

export type MistakeStatus = 'weak' | 'resolved';

export interface MistakeLog {
  id: string;
  chapterId: string;
  subjectId: string;
  topic: string;
  question?: string;
  notes?: string;
  status: MistakeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLog {
  id: string;
  chapterId: string;
  subjectId: string;
  taskId: string;            // Framework task ID or 'revision' or custom task type
  taskName: string;          // Human-readable task name
  timeSpentMinutes: number;  // Time spent in minutes
  timestamp: string;         // ISO date string
  sessionDate?: string;      // YYYY-MM-DD
  startTime?: string;        // HH:mm or formatted time (e.g. "16:30" or "04:30 PM")
  endTime?: string;          // HH:mm or formatted time (e.g. "17:30" or "05:30 PM")
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyStudyPoint {
  date: string;              // YYYY-MM-DD
  label: string;             // e.g. "Thu, Oct 22"
  shortDay: string;          // e.g. "Thu"
  minutes: number;
  formatted: string;         // e.g. "2h 30m"
  sessionCount: number;
  isToday: boolean;
}

export interface WeeklyStudyPoint {
  weekKey: string;           // e.g. "2026-W43"
  label: string;             // e.g. "Oct 19 - Oct 25"
  minutes: number;
  formatted: string;
  sessionCount: number;
  isCurrentWeek: boolean;
}

export interface MonthlyStudyPoint {
  monthKey: string;          // e.g. "2026-10"
  label: string;             // e.g. "Oct 2026"
  minutes: number;
  formatted: string;
  sessionCount: number;
  isCurrentMonth: boolean;
}

export interface PeriodicStudyStats {
  todayMinutes: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  dailyAverageMinutes: number;
  weeklyAverageMinutes: number;
  dailyTrend: DailyStudyPoint[];
  weeklyTrend: WeeklyStudyPoint[];
  monthlyTrend: MonthlyStudyPoint[];
}

export interface TaskBenchmark {
  taskId: string;
  taskName: string;
  totalMinutes: number;
  sessionCount: number;
  averageMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  subjectName?: string;
}

export interface ChapterTimeStat {
  chapterId: string;
  chapterTitle: string;
  subjectId: string;
  subjectName: string;
  totalMinutes: number;
  sessionCount: number;
  taskBreakdown: Record<string, { taskName: string; minutes: number; sessionCount: number }>;
}



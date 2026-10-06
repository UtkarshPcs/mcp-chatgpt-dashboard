import { Chapter, Subject, AIRecommendation, ChapterStatus } from "../types";

export const getChapterFrameworkProgress = (chapter: Chapter, subject?: Subject) => {
  if (!subject || !subject.tasks || subject.tasks.length === 0) return 0;
  
  const totalWeight = subject.tasks.reduce((sum, task) => sum + task.weight, 0);
  if (totalWeight === 0) return 0;

  const completedWeight = subject.tasks.reduce((sum, task) => {
    const taskState = chapter.tasks?.[task.id];
    if (taskState?.status === 'completed') {
      return sum + task.weight;
    }
    return sum;
  }, 0);

  return Math.round((completedWeight / totalWeight) * 100);
};

export const getChapterFrameworkStatus = (chapter: Chapter, subject?: Subject): ChapterStatus => {
  if (!subject || !subject.tasks || subject.tasks.length === 0) return 'not_started';
  
  const progress = getChapterFrameworkProgress(chapter, subject);
  if (progress === 0) return 'not_started';
  if (progress === 100) return 'completed';
  return 'in_progress';
};

export const getActiveFrameworkChapters = (chapters: Chapter[], subjects: Subject[]): Chapter[] => {
  return chapters.map(chapter => {
    const subject = subjects.find(s => s.id === chapter.subjectId);
    const hasFramework = subject && subject.tasks && subject.tasks.length > 0;
    
    if (!hasFramework) {
      // Isolate from legacy data if no framework
      return {
        ...chapter,
        progress: 0,
        status: 'not_started',
        nextRevisionDate: undefined,
        lastRevisionDate: undefined,
        revisionCount: 0,
      };
    }
    
    // If it has framework, progress and status MUST be derived from framework
    const frameworkProgress = getChapterFrameworkProgress(chapter, subject);
    const frameworkStatus = getChapterFrameworkStatus(chapter, subject);
    
    return {
      ...chapter,
      progress: frameworkProgress,
      status: frameworkStatus,
      // If we want to strictly drop legacy revisions even if framework exists but tasks aren't started:
      // We can clear revision if frameworkProgress === 0 to ensure fresh start
      ...(frameworkProgress === 0 ? {
        nextRevisionDate: undefined,
        lastRevisionDate: undefined,
        revisionCount: 0,
      } : {})
    };
  });
};

export const getActiveRecommendation = (rec: AIRecommendation | null, subjects: Subject[]): AIRecommendation | null => {
  if (!rec) return null;
  const subject = subjects.find(s => s.id === rec.subjectId);
  if (!subject || !subject.tasks || subject.tasks.length === 0) return null;
  return rec;
};

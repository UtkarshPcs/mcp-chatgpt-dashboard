import { TimeLog, Subject, Chapter, TaskBenchmark, ChapterTimeStat } from "@/types";

export const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return "0m";
  const roundMins = Math.round(minutes);
  if (roundMins < 60) return `${roundMins}m`;
  
  const hours = Math.floor(roundMins / 60);
  const remaining = roundMins % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
};

export const calculateTotalStudyTime = (timeLogs: TimeLog[]): number => {
  if (!timeLogs || timeLogs.length === 0) return 0;
  return timeLogs.reduce((acc, curr) => acc + (curr.timeSpentMinutes || 0), 0);
};

export const calculateAverageSessionTime = (timeLogs: TimeLog[]): number => {
  if (!timeLogs || timeLogs.length === 0) return 0;
  const total = calculateTotalStudyTime(timeLogs);
  return Math.round(total / timeLogs.length);
};

export const calculateChapterTime = (chapterId: string, timeLogs: TimeLog[]): number => {
  if (!timeLogs || timeLogs.length === 0) return 0;
  return timeLogs
    .filter(log => log.chapterId === chapterId)
    .reduce((acc, curr) => acc + (curr.timeSpentMinutes || 0), 0);
};

export const calculateTaskTime = (chapterId: string, taskId: string, timeLogs: TimeLog[]): number => {
  if (!timeLogs || timeLogs.length === 0) return 0;
  return timeLogs
    .filter(log => log.chapterId === chapterId && log.taskId === taskId)
    .reduce((acc, curr) => acc + (curr.timeSpentMinutes || 0), 0);
};

export const calculateSubjectTime = (subjectId: string, timeLogs: TimeLog[]): number => {
  if (!timeLogs || timeLogs.length === 0) return 0;
  return timeLogs
    .filter(log => log.subjectId === subjectId)
    .reduce((acc, curr) => acc + (curr.timeSpentMinutes || 0), 0);
};

export const calculateTaskTypeBenchmarks = (
  timeLogs: TimeLog[], 
  subjects: Subject[] = []
): TaskBenchmark[] => {
  if (!timeLogs || timeLogs.length === 0) return [];

  // Group by a normalized key: taskId or taskName
  const groups: Record<string, {
    taskId: string;
    taskName: string;
    durations: number[];
    subjectIds: Set<string>;
  }> = {};

  for (const log of timeLogs) {
    const key = log.taskId || log.taskName || "general_study";
    if (!groups[key]) {
      let displayName = log.taskName;
      if (!displayName) {
        // Try looking up in subjects
        for (const sub of subjects) {
          const found = sub.tasks?.find(t => t.id === log.taskId);
          if (found) {
            displayName = found.name;
            break;
          }
        }
      }
      if (!displayName) {
        displayName = log.taskId === "revision" ? "Chapter Revision" : log.taskId;
      }

      groups[key] = {
        taskId: log.taskId,
        taskName: displayName,
        durations: [],
        subjectIds: new Set(),
      };
    }

    groups[key].durations.push(log.timeSpentMinutes || 0);
    if (log.subjectId) {
      groups[key].subjectIds.add(log.subjectId);
    }
  }

  const benchmarks: TaskBenchmark[] = Object.values(groups).map(g => {
    const totalMinutes = g.durations.reduce((sum, d) => sum + d, 0);
    const count = g.durations.length;
    const averageMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;
    const minMinutes = count > 0 ? Math.min(...g.durations) : 0;
    const maxMinutes = count > 0 ? Math.max(...g.durations) : 0;

    let subjectName: string | undefined = undefined;
    if (g.subjectIds.size === 1) {
      const sId = Array.from(g.subjectIds)[0];
      subjectName = subjects.find(s => s.id === sId)?.name;
    }

    return {
      taskId: g.taskId,
      taskName: g.taskName,
      totalMinutes,
      sessionCount: count,
      averageMinutes,
      minMinutes,
      maxMinutes,
      subjectName,
    };
  });

  // Sort by highest total study time first
  return benchmarks.sort((a, b) => b.totalMinutes - a.totalMinutes);
};

export const calculateChapterTimeStats = (
  timeLogs: TimeLog[],
  chapters: Chapter[],
  subjects: Subject[]
): ChapterTimeStat[] => {
  if (!timeLogs || timeLogs.length === 0) return [];

  const chapterMap: Record<string, ChapterTimeStat> = {};

  for (const log of timeLogs) {
    if (!chapterMap[log.chapterId]) {
      const chap = chapters.find(c => c.id === log.chapterId);
      const sub = subjects.find(s => s.id === (log.subjectId || chap?.subjectId));

      chapterMap[log.chapterId] = {
        chapterId: log.chapterId,
        chapterTitle: chap ? chap.title : "Unknown Chapter",
        subjectId: log.subjectId || chap?.subjectId || "",
        subjectName: sub ? sub.name : "Unknown Subject",
        totalMinutes: 0,
        sessionCount: 0,
        taskBreakdown: {},
      };
    }

    const cStat = chapterMap[log.chapterId];
    cStat.totalMinutes += log.timeSpentMinutes || 0;
    cStat.sessionCount += 1;

    const tKey = log.taskId || "study";
    if (!cStat.taskBreakdown[tKey]) {
      cStat.taskBreakdown[tKey] = {
        taskName: log.taskName || tKey,
        minutes: 0,
        sessionCount: 0,
      };
    }
    cStat.taskBreakdown[tKey].minutes += log.timeSpentMinutes || 0;
    cStat.taskBreakdown[tKey].sessionCount += 1;
  }

  return Object.values(chapterMap).sort((a, b) => b.totalMinutes - a.totalMinutes);
};

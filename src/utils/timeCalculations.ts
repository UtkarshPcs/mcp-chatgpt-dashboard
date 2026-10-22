import { 
  TimeLog, 
  Subject, 
  Chapter, 
  TaskBenchmark, 
  ChapterTimeStat,
  PeriodicStudyStats,
  DailyStudyPoint,
  WeeklyStudyPoint,
  MonthlyStudyPoint
} from "@/types";
import { 
  format, 
  isToday, 
  isThisWeek, 
  isThisMonth, 
  subDays, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  subMonths,
  getISOWeek
} from "date-fns";

export const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return "0m";
  const roundMins = Math.round(minutes);
  if (roundMins < 60) return `${roundMins}m`;
  
  const hours = Math.floor(roundMins / 60);
  const remaining = roundMins % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
};

/**
 * Parses "16:30", "4:30 PM", or "04:30 pm" into total minutes from start of day (0-1439).
 */
export const parseTimeStringToMinutes = (str: string): number | null => {
  if (!str) return null;
  const match = str.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes >= 60) return null;
  
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  if (hours < 0 || hours >= 24) return null;
  
  return hours * 60 + minutes;
};

/**
 * Calculates duration in minutes between start and end time.
 * Handles overnight crossover if endTime <= startTime.
 */
export const parseTimeRangeToMinutes = (startTime: string, endTime: string): number | null => {
  const s = parseTimeStringToMinutes(startTime);
  const e = parseTimeStringToMinutes(endTime);
  if (s === null || e === null) return null;
  let diff = e - s;
  if (diff <= 0) diff += 24 * 60; // Overnight session
  return diff;
};

/**
 * Formats a time string ("16:30" or "04:30 PM") into "4:30 PM".
 */
export const formatTime12h = (timeStr: string): string => {
  const mins = parseTimeStringToMinutes(timeStr);
  if (mins === null) return timeStr;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
};

/**
 * Formats a start and end time pair into a human-readable range, e.g. "4:30 PM – 5:30 PM".
 */
export const formatTimeRangeDisplay = (startTime?: string, endTime?: string): string | null => {
  if (!startTime && !endTime) return null;
  if (startTime && endTime) {
    return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
  }
  return formatTime12h(startTime || endTime || "");
};

/**
 * Normalizes log date from sessionDate ("YYYY-MM-DD") or timestamp.
 */
export const getLogDate = (log: TimeLog): Date => {
  if (log.sessionDate) {
    const parts = log.sessionDate.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
  }
  const iso = log.timestamp || log.createdAt;
  if (iso) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

/**
 * Calculates periodic study hours: Today, This Week, This Month, plus trends.
 */
export const calculatePeriodicStudyStats = (timeLogs: TimeLog[]): PeriodicStudyStats => {
  const now = new Date();
  const safeLogs = timeLogs || [];

  let todayMinutes = 0;
  let thisWeekMinutes = 0;
  let thisMonthMinutes = 0;

  // Group minutes by day key ("YYYY-MM-DD")
  const dayBuckets: Record<string, { minutes: number; count: number }> = {};
  // Group minutes by month key ("YYYY-MM")
  const monthBuckets: Record<string, { minutes: number; count: number }> = {};

  for (const log of safeLogs) {
    const logDate = getLogDate(log);
    const mins = log.timeSpentMinutes || 0;

    if (isToday(logDate)) {
      todayMinutes += mins;
    }
    if (isThisWeek(logDate, { weekStartsOn: 1 })) {
      thisWeekMinutes += mins;
    }
    if (isThisMonth(logDate)) {
      thisMonthMinutes += mins;
    }

    const dayKey = format(logDate, "yyyy-MM-dd");
    if (!dayBuckets[dayKey]) dayBuckets[dayKey] = { minutes: 0, count: 0 };
    dayBuckets[dayKey].minutes += mins;
    dayBuckets[dayKey].count += 1;

    const monthKey = format(logDate, "yyyy-MM");
    if (!monthBuckets[monthKey]) monthBuckets[monthKey] = { minutes: 0, count: 0 };
    monthBuckets[monthKey].minutes += mins;
    monthBuckets[monthKey].count += 1;
  }

  // 1. Daily Trend: Last 14 days continuous
  const past14Days = eachDayOfInterval({ start: subDays(now, 13), end: now });
  const dailyTrend: DailyStudyPoint[] = past14Days.map(day => {
    const dateKey = format(day, "yyyy-MM-dd");
    const bucket = dayBuckets[dateKey] || { minutes: 0, count: 0 };
    return {
      date: dateKey,
      label: format(day, "EEE, MMM d"),
      shortDay: format(day, "EEE"),
      minutes: bucket.minutes,
      formatted: formatDuration(bucket.minutes),
      sessionCount: bucket.count,
      isToday: isToday(day)
    };
  });

  // 2. Weekly Trend: Last 6 weeks (Monday-Sunday)
  const weeklyTrend: WeeklyStudyPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subWeeks(now, i);
    const s = startOfWeek(d, { weekStartsOn: 1 });
    const e = endOfWeek(d, { weekStartsOn: 1 });
    const weekKey = `${format(s, "yyyy")}-W${getISOWeek(s)}`;
    
    // Sum logs falling in this week's interval
    let weekMins = 0;
    let weekCount = 0;
    for (const log of safeLogs) {
      const lDate = getLogDate(log);
      if (lDate >= s && lDate <= e) {
        weekMins += log.timeSpentMinutes || 0;
        weekCount += 1;
      }
    }

    weeklyTrend.push({
      weekKey,
      label: `${format(s, "MMM d")} – ${format(e, "MMM d")}`,
      minutes: weekMins,
      formatted: formatDuration(weekMins),
      sessionCount: weekCount,
      isCurrentWeek: i === 0
    });
  }

  // 3. Monthly Trend: Last 6 months
  const monthlyTrend: MonthlyStudyPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const mKey = format(d, "yyyy-MM");
    const bucket = monthBuckets[mKey] || { minutes: 0, count: 0 };
    monthlyTrend.push({
      monthKey: mKey,
      label: format(d, "MMM yyyy"),
      minutes: bucket.minutes,
      formatted: formatDuration(bucket.minutes),
      sessionCount: bucket.count,
      isCurrentMonth: i === 0
    });
  }

  // Averages across active periods
  const activeDays = Object.values(dayBuckets).filter(b => b.minutes > 0);
  const dailyAverageMinutes = activeDays.length > 0
    ? Math.round(activeDays.reduce((acc, curr) => acc + curr.minutes, 0) / activeDays.length)
    : 0;

  const activeWeeks = weeklyTrend.filter(w => w.minutes > 0);
  const weeklyAverageMinutes = activeWeeks.length > 0
    ? Math.round(activeWeeks.reduce((acc, curr) => acc + curr.minutes, 0) / activeWeeks.length)
    : 0;

  return {
    todayMinutes,
    thisWeekMinutes,
    thisMonthMinutes,
    dailyAverageMinutes,
    weeklyAverageMinutes,
    dailyTrend,
    weeklyTrend,
    monthlyTrend
  };
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

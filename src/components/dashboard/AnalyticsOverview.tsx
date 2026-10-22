import { Chapter, TimeLog } from "@/types";
import { calculateCompletion, calculateRevisionProgress } from "@/utils/calculations";
import { 
  calculateTotalStudyTime, 
  calculateAverageSessionTime, 
  calculatePeriodicStudyStats, 
  formatDuration 
} from "@/utils/timeCalculations";
import { Clock, Timer, Flame, Calendar, TrendingUp, Sparkles } from "lucide-react";

interface AnalyticsOverviewProps {
  chapters: Chapter[];
  timeLogs?: TimeLog[];
}

export function AnalyticsOverview({ chapters, timeLogs = [] }: AnalyticsOverviewProps) {
  const overallCompletion = calculateCompletion(chapters);
  const overallRevisionCompletion = calculateRevisionProgress(chapters);
  const completedChaptersCount = chapters.filter(c => c.status === 'completed').length;
  const inProgressCount = chapters.filter(c => c.status === 'in_progress' || c.status === 'revision').length;
  const notStartedCount = chapters.filter(c => c.status === 'not_started').length;

  const totalMinutes = calculateTotalStudyTime(timeLogs);
  const avgSessionMinutes = calculateAverageSessionTime(timeLogs);
  const periodicStats = calculatePeriodicStudyStats(timeLogs);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Overall Progress Radial */}
      <div className="col-span-1 lg:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <h2 className="text-zinc-400 font-semibold mb-6">Overall Syllabus</h2>
        <div className="relative w-40 h-40 flex items-center justify-center mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-zinc-800"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="currentColor" strokeWidth="3"
            />
            <path
              className="text-blue-500 transition-all duration-1000 ease-out"
              strokeDasharray={`${overallCompletion}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-bold text-white">{overallCompletion}%</span>
            <span className="text-xs text-zinc-500 mt-1">COMPLETED</span>
          </div>
        </div>
        <div className="w-full mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-purple-400">Revisions (Max 3)</span>
            <span className="text-xs font-bold text-zinc-300">{overallRevisionCompletion}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-1000 ease-out" style={{ width: `${overallRevisionCompletion}%` }}></div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="col-span-1 lg:col-span-3 flex flex-col justify-between gap-4">
        {/* Chapter Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Chapters', val: chapters.length, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Completed', val: completedChaptersCount, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { label: 'In Progress', val: inProgressCount, color: 'text-amber-400', bg: 'bg-amber-400/10' },
            { label: 'Not Started', val: notStartedCount, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center">
              <span className="text-zinc-500 text-xs font-medium mb-1.5">{stat.label}</span>
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.val}</div>
            </div>
          ))}
        </div>

        {/* Study Hours Rhythm Bar - Daily, Weekly, Monthly, Total */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <span className="text-zinc-500 text-[11px] font-medium block">Today</span>
              <span className="text-lg font-bold text-cyan-300">
                {formatDuration(periodicStats.todayMinutes)}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <span className="text-zinc-500 text-[11px] font-medium block">This Week</span>
              <span className="text-lg font-bold text-indigo-300">
                {formatDuration(periodicStats.thisWeekMinutes)}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <span className="text-zinc-500 text-[11px] font-medium block">This Month</span>
              <span className="text-lg font-bold text-emerald-300">
                {formatDuration(periodicStats.thisMonthMinutes)}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="min-w-0">
              <span className="text-zinc-500 text-[11px] font-medium block">All-Time</span>
              <span className="text-lg font-bold text-purple-300">
                {formatDuration(totalMinutes)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Subject, Chapter, TimeLog } from "@/types";
import { 
  formatDuration, 
  calculateTotalStudyTime, 
  calculateAverageSessionTime, 
  calculateTaskTypeBenchmarks,
  calculateChapterTimeStats,
  calculateSubjectTime 
} from "@/utils/timeCalculations";
import { getSubjectColor, getSubjectText } from "@/utils/theme";
import { 
  Clock, 
  Timer, 
  TrendingUp, 
  Plus, 
  Trash2, 
  BookOpen, 
  Sparkles, 
  Layers, 
  AlertCircle,
  X
} from "lucide-react";

interface TimeAnalyticsViewProps {
  subjects: Subject[];
  chapters: Chapter[];
  timeLogs: TimeLog[];
  onLogTime: (entry: {
    chapterId: string;
    subjectId: string;
    taskId: string;
    taskName: string;
    timeSpentMinutes: number;
    notes?: string;
    timestamp?: string;
    markTaskCompleted?: boolean;
  }) => Promise<void>;
  onDeleteTimeLog: (id: string) => Promise<void>;
}

export function TimeAnalyticsView({
  subjects,
  chapters,
  timeLogs,
  onLogTime,
  onDeleteTimeLog
}: TimeAnalyticsViewProps) {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Modal form state
  const [formChapterId, setFormChapterId] = useState("");
  const [formTaskId, setFormTaskId] = useState("");
  const [formCustomTaskName, setFormCustomTaskName] = useState("");
  const [formMinutes, setFormMinutes] = useState("45");
  const [formNotes, setFormNotes] = useState("");
  const [formMarkComplete, setFormMarkComplete] = useState(false);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return timeLogs.filter(log => {
      if (selectedSubjectFilter !== "all" && log.subjectId !== selectedSubjectFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const chap = chapters.find(c => c.id === log.chapterId);
        const sub = subjects.find(s => s.id === log.subjectId);
        const matchesChapter = chap?.title.toLowerCase().includes(query);
        const matchesSubject = sub?.name.toLowerCase().includes(query);
        const matchesTask = log.taskName?.toLowerCase().includes(query) || log.taskId?.toLowerCase().includes(query);
        const matchesNotes = log.notes?.toLowerCase().includes(query);
        if (!matchesChapter && !matchesSubject && !matchesTask && !matchesNotes) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());
  }, [timeLogs, selectedSubjectFilter, searchQuery, chapters, subjects]);

  // Overall metrics
  const totalMinutes = useMemo(() => calculateTotalStudyTime(timeLogs), [timeLogs]);
  const avgSessionMinutes = useMemo(() => calculateAverageSessionTime(timeLogs), [timeLogs]);
  
  // Empirical task benchmarks
  const taskBenchmarks = useMemo(() => calculateTaskTypeBenchmarks(timeLogs, subjects), [timeLogs, subjects]);

  // Chapter time sinks
  const chapterTimeStats = useMemo(() => calculateChapterTimeStats(timeLogs, chapters, subjects), [timeLogs, chapters, subjects]);

  // Subject time breakdown
  const subjectBreakdown = useMemo(() => {
    return subjects.map(sub => {
      const minutes = calculateSubjectTime(sub.id, timeLogs);
      const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
      return {
        subject: sub,
        minutes,
        percentage
      };
    }).sort((a, b) => b.minutes - a.minutes);
  }, [subjects, timeLogs, totalMinutes]);

  const topSubject = subjectBreakdown.length > 0 && subjectBreakdown[0].minutes > 0 ? subjectBreakdown[0].subject.name : "None yet";

  // Selected chapter in modal
  const selectedChapter = chapters.find(c => c.id === formChapterId);
  const selectedChapterSubject = subjects.find(s => s.id === selectedChapter?.subjectId);
  const chapterFrameworkTasks = selectedChapterSubject?.tasks || [];

  const handleOpenModal = (prefillChapterId?: string) => {
    if (prefillChapterId) {
      setFormChapterId(prefillChapterId);
    } else if (chapters.length > 0 && !formChapterId) {
      setFormChapterId(chapters[0].id);
    }
    setFormMinutes("45");
    setFormNotes("");
    setFormMarkComplete(false);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChapterId) {
      setModalError("Please select a chapter");
      return;
    }
    const mins = parseInt(formMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      setModalError("Please enter a valid study duration in minutes");
      return;
    }

    const chap = chapters.find(c => c.id === formChapterId);
    if (!chap) {
      setModalError("Chapter not found");
      return;
    }

    const finalTaskId = formTaskId || "revision";
    let finalTaskName = formCustomTaskName.trim();

    if (!finalTaskName) {
      const matched = chapterFrameworkTasks.find(t => t.id === finalTaskId);
      if (matched) {
        finalTaskName = matched.name;
      } else if (finalTaskId === "revision") {
        finalTaskName = "Chapter Revision";
      } else {
        finalTaskName = finalTaskId;
      }
    }

    setIsSubmitting(true);
    setModalError("");

    try {
      await onLogTime({
        chapterId: formChapterId,
        subjectId: chap.subjectId,
        taskId: finalTaskId,
        taskName: finalTaskName,
        timeSpentMinutes: mins,
        notes: formNotes,
        markTaskCompleted: formMarkComplete
      });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log study time";
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Study Time Intelligence & Schedule Baselines</h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Calculates empirical session averages, identifies heavy tasks, and provides realistic completion estimates for AI scheduling based on actual student performance.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Log Study Session
        </button>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Total Study Time</span>
            <span className="text-2xl font-bold text-white">{formatDuration(totalMinutes)}</span>
            <span className="text-[10px] text-cyan-400 block mt-0.5">{totalMinutes} total minutes</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Timer className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Average Session</span>
            <span className="text-2xl font-bold text-white">{formatDuration(avgSessionMinutes)}</span>
            <span className="text-[10px] text-indigo-400 block mt-0.5">per study sitting</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Total Sessions</span>
            <span className="text-2xl font-bold text-white">{timeLogs.length}</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">historical records</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Most Studied Subject</span>
            <span className="text-lg font-bold text-white truncate max-w-[140px] block">{topSubject}</span>
            <span className="text-[10px] text-purple-400 block mt-0.5">highest time allocation</span>
          </div>
        </div>
      </div>

      {/* Empirical Task Benchmarks (The core request for AI schedule baselines) */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-zinc-100">Empirical Task Benchmarks & AI Scheduling Baselines</h3>
          </div>
          <span className="text-xs text-amber-400/90 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 font-medium">
            Computed from actual session logs
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          The AI references these actual averages (e.g. revision taking ~40m, or mock papers taking ~85m) instead of generic estimates to build realistic, achievable daily study schedules.
        </p>

        {taskBenchmarks.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-sm italic">
            No session benchmarks recorded yet. Log sessions to establish empirical baselines.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {taskBenchmarks.map(bm => (
              <div 
                key={bm.taskId} 
                className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm font-semibold text-zinc-200 leading-tight">
                    {bm.taskName}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex-shrink-0">
                    avg {formatDuration(bm.averageMinutes)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/50">
                  <span>{bm.sessionCount} session{bm.sessionCount === 1 ? '' : 's'} logged</span>
                  <span className="font-mono text-zinc-500">Total: {formatDuration(bm.totalMinutes)}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Range: {bm.minMinutes}m – {bm.maxMinutes}m</span>
                  {bm.subjectName && <span className="text-zinc-400 font-medium">{bm.subjectName}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Grid: Subject Time Allocation & Chapter Time Sinks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-zinc-100">Study Time by Subject</h3>
          </div>

          <div className="space-y-3">
            {subjectBreakdown.map(item => (
              <div key={item.subject.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-semibold ${getSubjectText(item.subject.color)}`}>
                    {item.subject.name}
                  </span>
                  <span className="text-zinc-400 font-mono">
                    {formatDuration(item.minutes)} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full bg-gradient-to-r ${getSubjectColor(item.subject.color)} transition-all duration-500`}
                    style={{ width: `${Math.max(item.percentage, item.minutes > 0 ? 3 : 0)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Time Consuming Chapters (Outlier / Heavy Task Detection) */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-400" />
              <h3 className="text-lg font-bold text-zinc-100">Top Time-Consuming Chapters</h3>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Identifies Time Sinks</span>
          </div>

          {chapterTimeStats.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm italic">
              No chapter study time recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {chapterTimeStats.slice(0, 8).map(chap => (
                <div 
                  key={chap.chapterId}
                  className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-zinc-200 block truncate">
                      {chap.chapterTitle}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {chap.subjectName} · {chap.sessionCount} session{chap.sessionCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {formatDuration(chap.totalMinutes)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Session History & Filter */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Historical Study Sessions</h3>
            <p className="text-xs text-zinc-400">Complete immutable record of all individual sittings.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 w-44"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-sm italic">
            No study sessions found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Chapter</th>
                  <th className="py-2.5 px-3">Task</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredLogs.map(log => {
                  const chap = chapters.find(c => c.id === log.chapterId);
                  const sub = subjects.find(s => s.id === log.subjectId);
                  const dateStr = new Date(log.timestamp || log.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-3 text-zinc-400 font-mono whitespace-nowrap">{dateStr}</td>
                      <td className="py-3 px-3 font-medium text-zinc-300">{sub ? sub.name : "Unknown"}</td>
                      <td className="py-3 px-3 text-zinc-200 font-medium max-w-[200px] truncate">{chap ? chap.title : "Unknown"}</td>
                      <td className="py-3 px-3 text-cyan-300 font-medium">{log.taskName || log.taskId}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                          {formatDuration(log.timeSpentMinutes)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400 max-w-[240px] truncate">{log.notes || "—"}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Delete time log entry for '${log.taskName || log.taskId}'?`)) {
                              onDeleteTimeLog(log.id);
                            }
                          }}
                          className="text-zinc-600 hover:text-rose-400 p-1 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Study Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Log Study Session</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLog} className="space-y-4 text-xs">
              {/* Chapter Selection */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Chapter *</label>
                <select
                  value={formChapterId}
                  onChange={(e) => {
                    setFormChapterId(e.target.value);
                    setFormTaskId("");
                    setFormCustomTaskName("");
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select Chapter...</option>
                  {chapters.map(c => {
                    const sub = subjects.find(s => s.id === c.subjectId);
                    return (
                      <option key={c.id} value={c.id}>
                        {sub ? `[${sub.name}] ` : ''}{c.title}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Task Selection */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Task Type *</label>
                <select
                  value={formTaskId}
                  onChange={(e) => {
                    setFormTaskId(e.target.value);
                    const matched = chapterFrameworkTasks.find(t => t.id === e.target.value);
                    if (matched) {
                      setFormCustomTaskName(matched.name);
                    } else if (e.target.value === "revision") {
                      setFormCustomTaskName("Chapter Revision");
                    }
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="revision">Chapter Revision</option>
                  {chapterFrameworkTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      Framework: {t.name} ({t.weight}%)
                    </option>
                  ))}
                  <option value="custom">Custom Task Name</option>
                </select>
              </div>

              {/* Custom Task Name Input if needed */}
              {formTaskId === "custom" && (
                <div className="space-y-1.5">
                  <label className="text-zinc-400 font-medium">Custom Task Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. NCERT Exemplar Problems, Mind Map"
                    value={formCustomTaskName}
                    onChange={(e) => setFormCustomTaskName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Time Spent (Minutes) */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Time Spent (Minutes) *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={formMinutes}
                    onChange={(e) => setFormMinutes(e.target.value)}
                    className="w-32 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-zinc-500">minutes ({formatDuration(parseInt(formMinutes, 10) || 0)})</span>
                </div>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Solved 15 pyqs, reviewed formulas"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Mark task completed checkbox */}
              {chapterFrameworkTasks.some(t => t.id === formTaskId) && (
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formMarkComplete}
                    onChange={(e) => setFormMarkComplete(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-zinc-300">Also mark this task as completed for this chapter</span>
                </label>
              )}

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? "Logging..." : "Save Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

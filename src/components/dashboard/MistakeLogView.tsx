"use client";

import { useState } from "react";
import { MistakeLog, MistakeStatus, Subject, Chapter } from "@/types";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Search, 
  Filter, 
  BookOpen, 
  HelpCircle, 
  Sparkles,
  Calendar,
  Layers
} from "lucide-react";
import { getSubjectText } from "@/utils/theme";

interface MistakeLogViewProps {
  mistakes: MistakeLog[];
  subjects: Subject[];
  chapters: Chapter[];
  onToggleStatus: (id: string, current: MistakeStatus) => Promise<void>;
  onDeleteMistake: (id: string) => Promise<void>;
}

export function MistakeLogView({
  mistakes,
  subjects,
  chapters,
  onToggleStatus,
  onDeleteMistake
}: MistakeLogViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'weak' | 'resolved'>('weak');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const weakCount = mistakes.filter(m => m.status === 'weak').length;
  const resolvedCount = mistakes.filter(m => m.status === 'resolved').length;
  const totalCount = mistakes.length;
  const resolutionRate = totalCount === 0 ? 100 : Math.round((resolvedCount / totalCount) * 100);

  // Filter logic
  const filteredMistakes = mistakes.filter(m => {
    // Status
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;

    // Subject
    const chapter = chapters.find(c => c.id === m.chapterId);
    const resolvedSubjectId = m.subjectId || chapter?.subjectId;
    if (subjectFilter !== 'all' && resolvedSubjectId !== subjectFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTopic = m.topic.toLowerCase().includes(q);
      const matchQuestion = m.question?.toLowerCase().includes(q) || false;
      const matchNotes = m.notes?.toLowerCase().includes(q) || false;
      const matchChapter = chapter?.title.toLowerCase().includes(q) || false;
      if (!matchTopic && !matchQuestion && !matchNotes && !matchChapter) return false;
    }

    return true;
  });

  // Group by Subject -> Chapter
  const groupedBySubject = subjects.map(subject => {
    const subjectChapters = chapters.filter(c => c.subjectId === subject.id);
    const chaptersWithMistakes = subjectChapters.map(chapter => {
      const chapterMistakes = filteredMistakes.filter(m => m.chapterId === chapter.id);
      return {
        chapter,
        mistakes: chapterMistakes
      };
    }).filter(group => group.mistakes.length > 0);

    return {
      subject,
      chapterGroups: chaptersWithMistakes,
      totalMistakesInSubject: chaptersWithMistakes.reduce((sum, g) => sum + g.mistakes.length, 0)
    };
  }).filter(sGroup => sGroup.chapterGroups.length > 0);

  // Also catch mistakes for chapters that might not have a mapped subject
  const unmappedMistakes = filteredMistakes.filter(m => {
    const chapter = chapters.find(c => c.id === m.chapterId);
    const sId = m.subjectId || chapter?.subjectId;
    return !subjects.some(s => s.id === sId);
  });

  return (
    <div className="space-y-8">
      {/* Header Stat Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Logged Mistakes</span>
          <div className="text-3xl font-extrabold text-white mt-2">{totalCount}</div>
          <span className="text-xs text-zinc-500 mt-1">Cross-syllabus weak points</span>
        </div>

        <div className="bg-zinc-900/60 border border-rose-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-rose-500/10 blur-xl rounded-full"></div>
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Unresolved Weak Areas
          </span>
          <div className="text-3xl font-extrabold text-rose-300 mt-2">{weakCount}</div>
          <span className="text-xs text-rose-400/80 mt-1">Target for next revision</span>
        </div>

        <div className="bg-zinc-900/60 border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full"></div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mastered Concepts
          </span>
          <div className="text-3xl font-extrabold text-emerald-300 mt-2">{resolvedCount}</div>
          <span className="text-xs text-emerald-400/80 mt-1">Successfully cleared</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Resolution Rate</span>
            <span className="text-xs font-extrabold text-indigo-400">{resolutionRate}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 mt-3">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
              style={{ width: `${resolutionRate}%` }}
            ></div>
          </div>
          <span className="text-xs text-zinc-500 mt-2">Overall mastery progress</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Status Toggle Pills */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setStatusFilter('weak')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              statusFilter === 'weak' 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Weak Areas ({weakCount})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              statusFilter === 'resolved' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mastered ({resolvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'all' 
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({totalCount})
          </button>
        </div>

        {/* Right side: Subject selector & Search input */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 md:max-w-xl justify-end">
          <div className="relative min-w-[160px]">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search topic, question, or chapter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content: Grouped by Subject & Chapter */}
      {groupedBySubject.length === 0 && unmappedMistakes.length === 0 ? (
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mb-3" />
          <h3 className="text-lg font-bold text-zinc-200">No Mistakes Found</h3>
          <p className="text-sm text-zinc-400 max-w-md mt-1">
            {statusFilter === 'weak' 
              ? "All caught up! There are no unresolved weak topics matching your current filter." 
              : "No mistake entries match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedBySubject.map(({ subject, chapterGroups }) => (
            <div key={subject.id} className="space-y-4">
              {/* Subject Section Header */}
              <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-2">
                <span className={`text-base font-extrabold uppercase ${getSubjectText(subject.color)}`}>
                  {subject.name}
                </span>
                <span className="text-xs text-zinc-500">
                  • {subject.section}
                </span>
                <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                  {chapterGroups.reduce((acc, cg) => acc + cg.mistakes.length, 0)} {chapterGroups.reduce((acc, cg) => acc + cg.mistakes.length, 0) === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Chapters in this Subject */}
              <div className="grid grid-cols-1 gap-5">
                {chapterGroups.map(({ chapter, mistakes: chapMistakes }) => (
                  <div 
                    key={chapter.id} 
                    className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700/80 transition-all shadow-md"
                  >
                    {/* Chapter Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-800/50">
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-base font-bold text-zinc-100">{chapter.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-400">
                          {chapMistakes.filter(m => m.status === 'weak').length} weak / {chapMistakes.length} total
                        </span>
                      </div>
                    </div>

                    {/* Mistake Items Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {chapMistakes.map(m => (
                        <div 
                          key={m.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                            m.status === 'weak' 
                              ? 'bg-rose-950/10 border-rose-500/20 hover:border-rose-500/40' 
                              : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="space-y-2.5">
                            {/* Topic & Status Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-sm font-bold text-zinc-100 leading-snug">
                                {m.topic}
                              </h5>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${
                                m.status === 'weak'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {m.status === 'weak' ? 'Weak' : 'Mastered'}
                              </span>
                            </div>

                            {/* Question context if provided */}
                            {m.question && (
                              <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80 text-xs text-zinc-300 font-mono flex items-start gap-2">
                                <HelpCircle className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{m.question}</span>
                              </div>
                            )}

                            {/* Remedial Notes / Concept gap */}
                            {m.notes && (
                              <p className="text-xs text-zinc-400 border-l-2 border-zinc-800 pl-2.5 italic">
                                {m.notes}
                              </p>
                            )}
                          </div>

                          {/* Footer Actions & Timestamp */}
                          <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onToggleStatus(m.id, m.status)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                                  m.status === 'weak'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30'
                                }`}
                                title={m.status === 'weak' ? 'Mark as Mastered' : 'Mark as Weak'}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {m.status === 'weak' ? 'Mark Mastered' : 'Re-open'}
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(`Delete mistake entry "${m.topic}"?`)) {
                                    onDeleteMistake(m.id);
                                  }
                                }}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete mistake entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Unmapped mistakes if any */}
          {unmappedMistakes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <span className="text-base font-extrabold uppercase text-zinc-400">Other Logged Mistakes</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unmappedMistakes.map(m => (
                  <div key={m.id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-zinc-100">{m.topic}</h5>
                      {m.notes && <p className="text-xs text-zinc-400 mt-1 italic">{m.notes}</p>}
                    </div>
                    <div className="mt-4 pt-2 border-t border-zinc-800 flex justify-between items-center">
                      <span className="text-[10px] uppercase text-zinc-500">{m.status}</span>
                      <button
                        onClick={() => onToggleStatus(m.id, m.status)}
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        Toggle Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { MistakeLog, MistakeStatus, Subject, Chapter } from "@/types";
import { AlertTriangle, CheckCircle2, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { getSubjectText } from "@/utils/theme";

interface MistakesCardProps {
  mistakes: MistakeLog[];
  subjects: Subject[];
  chapters: Chapter[];
  onToggleStatus: (id: string, current: MistakeStatus) => Promise<void>;
  onViewAll: () => void;
}

export function MistakesCard({ mistakes, subjects, chapters, onToggleStatus, onViewAll }: MistakesCardProps) {
  const weakMistakes = mistakes.filter(m => m.status === 'weak');
  const recentWeak = [...weakMistakes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 shadow-2xl flex flex-col justify-between">
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-rose-500/10 blur-3xl rounded-full pointer-events-none"></div>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-rose-400 uppercase">Mistakes & Weak Topics</h2>
              <p className="text-xs text-zinc-400">Active revision gaps logged by AI</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            weakMistakes.length > 0 
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}>
            {weakMistakes.length > 0 ? `${weakMistakes.length} Unresolved` : 'All Mastered'}
          </span>
        </div>

        {/* Content List */}
        {weakMistakes.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-zinc-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/70 mb-2" />
            <p className="text-sm font-medium text-zinc-300">No weak topics logged!</p>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              When you or your AI note conceptual gaps or test errors, they will appear here for spaced practice.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {recentWeak.map(m => {
              const chapter = chapters.find(c => c.id === m.chapterId);
              const subject = subjects.find(s => s.id === (m.subjectId || chapter?.subjectId));

              return (
                <div 
                  key={m.id} 
                  className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {subject && (
                        <span className={`text-[10px] font-bold uppercase ${getSubjectText(subject.color)}`}>
                          {subject.name}
                        </span>
                      )}
                      {chapter && (
                        <span className="text-[11px] text-zinc-400 truncate max-w-[200px]" title={chapter.title}>
                          • {chapter.title}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-rose-300 transition-colors">
                      {m.topic}
                    </h4>
                    {m.notes && (
                      <p className="text-xs text-zinc-400 line-clamp-1 italic">
                        "{m.notes}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => onToggleStatus(m.id, m.status)}
                    className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-emerald-400 bg-zinc-900 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Mark topic as Mastered"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resolve</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          Total logs: <strong className="text-zinc-300">{mistakes.length}</strong> ({mistakes.filter(m => m.status === 'resolved').length} mastered)
        </span>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors group"
        >
          <span>Open Full Mistake Log</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Chapter, Subject } from "@/types";
import { BookOpen, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { SECTIONS } from "@/utils/constants";
import { calculateCompletion } from "@/utils/calculations";
import { getSubjectColor, getSubjectText } from "@/utils/theme";

interface SyllabusBreakdownProps {
  subjects: Subject[];
  chapters: Chapter[];
}

export function SyllabusBreakdown({ subjects, chapters }: SyllabusBreakdownProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Science': true,
    'Mathematics': true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-zinc-400" />
        <h2 className="text-2xl font-semibold text-zinc-100">Syllabus Breakdown</h2>
      </div>

      {SECTIONS.map(sectionName => {
        const sectionSubjects = subjects.filter(s => (s.section === sectionName) || (!s.section && sectionName === 'Other'));
        if (sectionSubjects.length === 0 && sectionName === 'Other') return null; // Hide empty 'Other'
        
        // Calculate section completion
        const sectionChapters = chapters.filter(c => sectionSubjects.some(s => s.id === c.subjectId));
        const sectionCompletion = calculateCompletion(sectionChapters);
        const isExpanded = expandedSections[sectionName] || false;

        return (
          <div key={sectionName} className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden transition-all duration-300">
            {/* Section Header */}
            <button 
              onClick={() => toggleSection(sectionName)}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/30 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-4">
                {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
                <h3 className="text-xl font-bold text-white">{sectionName}</h3>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md">{sectionSubjects.length} Subjects</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block w-32 bg-zinc-800 rounded-full h-2">
                  <div className="h-2 rounded-full bg-zinc-500 transition-all duration-500" style={{ width: `${sectionCompletion}%` }}></div>
                </div>
                <span className="text-sm font-bold text-zinc-300 w-10 text-right">{sectionCompletion}%</span>
              </div>
            </button>

            {/* Section Content */}
            {isExpanded && (
              <div className="p-5 pt-0 border-t border-zinc-800/50 bg-zinc-900/10">
                {sectionSubjects.length === 0 ? (
                  <p className="text-zinc-600 text-sm italic py-4">No subjects mapped to this section yet.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {sectionSubjects.map(subject => {
                      const subjectChapters = chapters.filter(c => c.subjectId === subject.id);
                      const subjectCompletion = calculateCompletion(subjectChapters);

                      return (
                        <div key={subject.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className={`text-lg font-bold ${getSubjectText(subject.color)}`}>{subject.name}</h4>
                            <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-2 py-1 rounded">{subjectCompletion}%</span>
                          </div>

                          <div className="space-y-2">
                            {subjectChapters.length === 0 ? (
                              <p className="text-xs text-zinc-600 italic">No chapters</p>
                            ) : (
                              subjectChapters.map(chapter => {
                                const hasTasks = subject.tasks && subject.tasks.length > 0;
                                let taskCompletion = 0;
                                if (hasTasks) {
                                  taskCompletion = subject.tasks!.reduce((sum, t) => {
                                    const isCompleted = chapter.tasks?.[t.id]?.status === 'completed';
                                    return sum + (isCompleted ? t.weight : 0);
                                  }, 0);
                                }

                                return (
                                  <div key={chapter.id} className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                                    <div className="flex justify-between items-start gap-3">
                                      <span className="text-sm font-medium text-zinc-300 leading-tight">
                                        {chapter.title}
                                      </span>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded border border-indigo-400/20">
                                          {Math.min(chapter.revisionCount || 0, 3)}/3 Rev
                                        </span>
                                        {chapter.status === 'revision' && <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20">Revise</span>}
                                        {chapter.status === 'completed' && !hasTasks && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        {hasTasks ? (
                                          <span className="text-xs text-zinc-400 font-bold">{Math.round(taskCompletion)}%</span>
                                        ) : (
                                          chapter.status !== 'completed' && <span className="text-xs text-zinc-500 font-medium">{chapter.progress}%</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Task Checklist Bubbles */}
                                    {hasTasks && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {subject.tasks!.sort((a,b) => a.order - b.order).map(t => {
                                          const isCompleted = chapter.tasks?.[t.id]?.status === 'completed';
                                          return (
                                            <span 
                                              key={t.id} 
                                              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                                isCompleted 
                                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                  : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                                              }`}
                                              title={t.name}
                                            >
                                              {t.name}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Legacy Progress Bar (Only show if not completed and no tasks) */}
                                    {chapter.status !== 'completed' && !hasTasks && (
                                      <div className="w-full bg-zinc-900 rounded-full h-1 mt-1">
                                        <div 
                                          className={`h-1 rounded-full bg-gradient-to-r ${getSubjectColor(subject.color)}`} 
                                          style={{ width: `${chapter.progress}%` }}
                                        ></div>
                                      </div>
                                    )}
                                    
                                    {/* New Task Progress Bar */}
                                    {hasTasks && (
                                      <div className="w-full bg-zinc-900 rounded-full h-1 mt-1">
                                        <div 
                                          className={`h-1 rounded-full bg-emerald-500 transition-all`} 
                                          style={{ width: `${taskCompletion}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

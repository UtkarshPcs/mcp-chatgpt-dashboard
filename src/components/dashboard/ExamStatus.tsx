"use client";

import { Exam, Chapter, Subject } from "@/types";
import { CalendarDays, MapPin, BookOpen, Clock, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { getSubjectText } from "@/utils/theme";

interface ExamStatusProps {
  exams: Exam[];
  chapters: Chapter[];
  subjects: Subject[];
}

export function ExamStatus({ exams, chapters, subjects }: ExamStatusProps) {
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  // Sort exams by date ascending
  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sortedExams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
        <CalendarDays className="w-12 h-12 text-zinc-600 mb-4" />
        <h3 className="text-xl font-bold text-zinc-300">No Upcoming Exams</h3>
        <p className="text-sm text-zinc-500 mt-2 text-center max-w-md">
          Your exam schedule is currently clear. Use the Academic MCP to schedule new exams and link them to syllabus chapters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="w-6 h-6 text-indigo-400" />
        <h2 className="text-2xl font-bold text-zinc-100">Exam Status</h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sortedExams.map(exam => {
          const isExpanded = expandedExam === exam.id;
          
          // Map chapters
          const examChapters = exam.chapterIds.map(id => chapters.find(c => c.id === id)).filter(Boolean) as Chapter[];
          
          // Calculate average progress for the exam
          const totalProgress = examChapters.reduce((acc, curr) => acc + (curr.progress || 0), 0);
          const examProgress = examChapters.length > 0 ? Math.round(totalProgress / examChapters.length) : 0;
          
          // Group chapters by subject
          const chaptersBySubject: Record<string, Chapter[]> = {};
          examChapters.forEach(c => {
            if (!chaptersBySubject[c.subjectId]) chaptersBySubject[c.subjectId] = [];
            chaptersBySubject[c.subjectId].push(c);
          });
          
          const examDate = new Date(exam.date);
          const daysUntil = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          const isPast = daysUntil < 0;

          return (
            <div key={exam.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300">
              {/* Header Card */}
              <button 
                onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-6 hover:bg-zinc-800/40 transition-colors text-left gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isPast ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    {isExpanded ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-3">
                      {exam.name}
                      {isPast && <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-zinc-800 text-zinc-500 uppercase tracking-wider">Completed</span>}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {examDate.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {exam.location}</span>
                      <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {examChapters.length} Chapters</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    isPast ? 'bg-zinc-800 text-zinc-500' :
                    daysUntil <= 7 ? 'bg-red-500/10 text-red-400' : 
                    'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {isPast ? 'Past Exam' : `${daysUntil} Days Left`}
                  </span>
                  
                  <div className="w-full md:w-48">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-zinc-400">Readiness</span>
                      <span className="font-bold text-white">{examProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all duration-1000 ${
                        examProgress === 100 ? 'bg-emerald-500' : 
                        examProgress > 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`} style={{ width: `${examProgress}%` }}></div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded Syllabus Details */}
              {isExpanded && (
                <div className="p-6 pt-0 border-t border-zinc-800/50 bg-zinc-950/30">
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 mt-6">Exam Syllabus</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(chaptersBySubject).map(([subId, chaps]) => {
                      const subject = subjects.find(s => s.id === subId);
                      if (!subject) return null;
                      
                      const subProg = Math.round(chaps.reduce((acc, curr) => acc + (curr.progress || 0), 0) / chaps.length);

                      return (
                        <div key={subId} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-zinc-800/30 border-b border-zinc-800/50 flex justify-between items-center">
                            <span className={`text-sm font-bold ${getSubjectText(subject.color)}`}>{subject.name}</span>
                            <span className="text-xs font-bold text-zinc-300">{subProg}% Ready</span>
                          </div>
                          <div className="p-2 space-y-1">
                            {chaps.map(c => (
                              <div key={c.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                                <span className="text-xs font-medium text-zinc-300 truncate pr-2" title={c.title}>{c.title}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {c.status === 'completed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <span className="text-[10px] text-zinc-500 font-bold">{c.progress}%</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

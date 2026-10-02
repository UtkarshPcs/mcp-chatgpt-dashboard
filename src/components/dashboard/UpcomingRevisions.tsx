"use client";

import { useState } from "react";
import { Chapter, Subject } from "@/types";
import { CalendarClock, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { SECTIONS } from "@/utils/constants";
import { getSubjectText } from "@/utils/theme";

interface UpcomingRevisionsProps {
  chapters: Chapter[];
  subjects: Subject[];
  onCompleteRevision: (chapter: Chapter) => Promise<void>;
}

export function UpcomingRevisions({ chapters, subjects, onCompleteRevision }: UpcomingRevisionsProps) {
  const [revView, setRevView] = useState<'list' | 'calendar'>('list');
  const [revFilterSection, setRevFilterSection] = useState<string>('All');
  const [revFilterSubject, setRevFilterSubject] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const upcomingRevisions = chapters
    .map(c => {
      let nextRev = c.nextRevisionDate;
      let lastRev = c.lastRevisionDate;
      
      // Fallback: ChatGPT might save dates in the notes field
      if (!nextRev && c.notes) {
        const nextMatch = c.notes.match(/Next revision:\s*([A-Za-z]+\s+\d{1,2})/i);
        if (nextMatch) {
          const parsedDate = new Date(`${nextMatch[1]} ${new Date().getFullYear()}`);
          if (!isNaN(parsedDate.getTime())) nextRev = parsedDate.toISOString();
        }
      }
      if (!lastRev && c.notes) {
        const lastMatch = c.notes.match(/Revised on\s*([A-Za-z]+\s+\d{1,2})/i);
        if (lastMatch) {
          const parsedDate = new Date(`${lastMatch[1]} ${new Date().getFullYear()}`);
          if (!isNaN(parsedDate.getTime())) lastRev = parsedDate.toISOString();
        }
      }
      
      return { ...c, nextRevisionDate: nextRev, lastRevisionDate: lastRev };
    })
    .filter(c => c.nextRevisionDate)
    .sort((a, b) => new Date(a.nextRevisionDate!).getTime() - new Date(b.nextRevisionDate!).getTime());

  const subjectFilteredRevisions = upcomingRevisions.filter(chapter => {
    const subject = subjects.find(s => s.id === chapter.subjectId);
    if (!subject) return false;
    if (revFilterSection !== 'All' && subject.section !== revFilterSection) return false;
    if (revFilterSubject !== 'All' && subject.id !== revFilterSubject) return false;
    return true;
  });

  const filteredRevisions = subjectFilteredRevisions.filter(chapter => {
    if (revView === 'calendar' && selectedDate) {
      const revDate = new Date(chapter.nextRevisionDate!);
      revDate.setHours(0,0,0,0);
      const selDate = new Date(selectedDate);
      selDate.setHours(0,0,0,0);
      if (revDate.getTime() !== selDate.getTime()) return false;
    }
    return true;
  });

  // Generate all days for the selected calendar month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }).map((_, i) => new Date(year, month, i + 1));
  };
  const calendarDays = getDaysInMonth(calendarMonth);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-zinc-900 to-zinc-950 border border-zinc-800 p-6 shadow-2xl h-full flex flex-col">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-bold tracking-wider text-purple-400 uppercase">Upcoming Revisions</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="bg-zinc-950 border border-zinc-800 text-xs rounded-md px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-purple-500"
            value={revFilterSection}
            onChange={(e) => {
              setRevFilterSection(e.target.value);
              setRevFilterSubject('All');
            }}
          >
            <option value="All">All Sections</option>
            {SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
          
          {revFilterSection !== 'All' && (
            <select 
              className="bg-zinc-950 border border-zinc-800 text-xs rounded-md px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-purple-500"
              value={revFilterSubject}
              onChange={(e) => setRevFilterSubject(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {subjects.filter(s => s.section === revFilterSection).map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          )}
          
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5 ml-1">
            <button onClick={() => setRevView('list')} className={`p-1 rounded ${revView === 'list' ? 'bg-zinc-800 text-purple-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setRevView('calendar')} className={`p-1 rounded ${revView === 'calendar' ? 'bg-zinc-800 text-purple-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {revView === 'calendar' && (
        <div className="flex flex-col gap-3 mb-2 relative z-10">
          <div className="flex items-center justify-between text-zinc-300">
            <button 
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold tracking-wide uppercase text-zinc-400">
              {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
            {calendarDays.map((d, i) => {
              const isSelected = new Date(selectedDate).toDateString() === d.toDateString();
              const isToday = new Date().toDateString() === d.toDateString();
              const hasRevision = subjectFilteredRevisions.some(c => {
                const cd = new Date(c.nextRevisionDate!);
                return cd.toDateString() === d.toDateString();
              });
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(d.toISOString())}
                  className={`flex flex-col items-center justify-center min-w-[50px] p-2 rounded-xl border transition-colors ${
                    isSelected ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 
                    isToday ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 
                    'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className="text-lg font-bold">{d.getDate()}</span>
                  <div className="h-1.5 w-1.5 rounded-full mt-1 bg-purple-500" style={{ opacity: hasRevision ? 1 : 0 }} />
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar relative z-10">
        {filteredRevisions.length > 0 ? filteredRevisions.slice(0, revView === 'list' ? 4 : undefined).map(chapter => {
          const subject = subjects.find(s => s.id === chapter.subjectId);
          if (!subject) return null;
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const revDate = new Date(chapter.nextRevisionDate!);
          revDate.setHours(0, 0, 0, 0);
          
          const daysUntil = Math.round((revDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          const isOverdue = daysUntil < 0;
          const isToday = daysUntil === 0;

          return (
            <div key={chapter.id} className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group hover:border-purple-500/30 transition-colors">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${getSubjectText(subject.color)}`}>
                    {subject.name}
                  </span>
                  {isOverdue && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">Delayed</span>
                  )}
                </div>
                <span className="text-sm font-medium text-zinc-200 line-clamp-1" title={chapter.title}>
                  {chapter.title}
                </span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-end flex-shrink-0 ml-0 sm:ml-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                    isOverdue ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    isToday ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                  }`}>
                    {isOverdue ? `${Math.abs(daysUntil)}d Overdue` : isToday ? 'Today' : `in ${daysUntil}d`}
                  </span>
                  <button
                    onClick={() => onCompleteRevision(chapter)}
                    disabled={(chapter.revisionCount || 0) >= 3}
                    className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Mark Revision Complete"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
                {chapter.lastRevisionDate && (
                  <span className="text-[9px] text-zinc-500 mt-1 uppercase font-semibold">
                    Last: {new Date(chapter.lastRevisionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 min-h-[120px]">
            <CheckCircle2 className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm font-medium">No revisions scheduled</p>
            <p className="text-xs opacity-70">For the selected filters</p>
          </div>
        )}
      </div>
    </section>
  );
}

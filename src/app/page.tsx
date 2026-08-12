"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Subject, Chapter, AIRecommendation, Section } from "@/types";
import { 
  BookOpen, Target, Clock, Sparkles, 
  BrainCircuit, BarChart3, Loader2, CheckCircle2, ChevronDown, ChevronRight,
  CalendarClock, Filter, Calendar as CalendarIcon, List
} from "lucide-react";

const SECTIONS: Section[] = [
  'Science', 
  'Mathematics', 
  'Social Science (SST)', 
  'English', 
  'Hindi', 
  'Information Technology (IT)'
];

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Science': true,
    'Mathematics': true
  });
  const [revView, setRevView] = useState<'list' | 'calendar'>('list');
  const [revFilterSection, setRevFilterSection] = useState<string>('All');
  const [revFilterSubject, setRevFilterSubject] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const subsRef = ref(db, "subjects");
    const chapsRef = ref(db, "chapters");
    const recRef = ref(db, "recommendation");
    
    let loaded = 0;
    const checkLoaded = () => { loaded++; if (loaded === 3) setLoading(false); };

    const unsubSubs = onValue(subsRef, (snap) => {
      const data = snap.val();
      setSubjects(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      checkLoaded();
    });

    const unsubChaps = onValue(chapsRef, (snap) => {
      const data = snap.val();
      setChapters(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      checkLoaded();
    });

    const unsubRec = onValue(recRef, (snap) => {
      setRecommendation(snap.val() || null);
      checkLoaded();
    });

    return () => { unsubSubs(); unsubChaps(); unsubRec(); };
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSubjectColor = (colorName?: string) => {
    const colors: Record<string, string> = {
      blue: 'from-blue-500 to-cyan-400',
      red: 'from-red-500 to-rose-400',
      emerald: 'from-emerald-500 to-teal-400',
      amber: 'from-amber-500 to-orange-400',
      purple: 'from-purple-500 to-indigo-400',
      rose: 'from-rose-500 to-pink-400',
    };
    return colors[colorName || 'blue'] || colors.blue;
  };

  const getSubjectText = (colorName?: string) => {
    const colors: Record<string, string> = {
      blue: 'text-blue-400', red: 'text-red-400', emerald: 'text-emerald-400',
      amber: 'text-amber-400', purple: 'text-purple-400', rose: 'text-rose-400',
    };
    return colors[colorName || 'blue'] || colors.blue;
  };

  const calculateCompletion = (chaps: Chapter[]) => {
    if (chaps.length === 0) return 0;
    const total = chaps.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    return Math.round(total / chaps.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p>Syncing Syllabus Tracker...</p>
      </div>
    );
  }

  const recSubject = recommendation ? subjects.find(s => s.id === recommendation.subjectId) : null;
  const recChapter = recommendation ? chapters.find(c => c.id === recommendation.chapterId) : null;

  const overallCompletion = calculateCompletion(chapters);
  const completedChaptersCount = chapters.filter(c => c.status === 'completed').length;
  const inProgressCount = chapters.filter(c => c.status === 'in_progress' || c.status === 'revision').length;
  const notStartedCount = chapters.filter(c => c.status === 'not_started').length;

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

  // Generate 14 days for calendar view
  const calendarDays = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 3); // Start 3 days ago
    return d;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-8 selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BrainCircuit className="w-8 h-8 text-blue-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Academics OS
              </h1>
            </div>
            <p className="text-zinc-400 text-lg">AI-Managed Syllabus Tracker</p>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800 shadow-inner w-fit">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-zinc-300">MCP Active</span>
          </div>
        </header>

        {/* Global Analytics */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Overall Progress Radial */}
          <div className="col-span-1 lg:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
             <h2 className="text-zinc-400 font-semibold mb-6">Overall Syllabus</h2>
             <div className="relative w-40 h-40 flex items-center justify-center mb-2">
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
          </div>

          {/* Stats Grid */}
          <div className="col-span-1 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { label: 'Total Chapters', val: chapters.length, color: 'text-blue-400', bg: 'bg-blue-400/10' },
               { label: 'Completed', val: completedChaptersCount, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
               { label: 'In Progress', val: inProgressCount, color: 'text-amber-400', bg: 'bg-amber-400/10' },
               { label: 'Not Started', val: notStartedCount, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
             ].map((stat, i) => (
               <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
                 <span className="text-zinc-500 text-sm font-medium mb-2">{stat.label}</span>
                 <div className={`text-4xl font-bold ${stat.color}`}>{stat.val}</div>
               </div>
             ))}
          </div>
        </section>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Recommendation Card */}
          {recommendation && recSubject && recChapter && (
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6 shadow-2xl h-full">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
              
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold tracking-wider text-amber-400 uppercase">AI Study Recommendation</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-bold uppercase rounded bg-zinc-800 ${getSubjectText(recSubject.color)}`}>
                      {recSubject.section} • {recSubject.name}
                    </span>
                    <span className={`px-2 py-1 text-xs font-bold uppercase rounded border ${
                      recommendation.priority === 'high' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                      recommendation.priority === 'medium' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                      'border-blue-500/30 text-blue-400 bg-blue-500/10'
                    }`}>
                      {recommendation.priority} Priority
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-zinc-100 mb-2">{recChapter.title}</h3>
                  <p className="text-zinc-400 border-l-2 border-zinc-800 pl-4 italic text-sm">
                    "{recommendation.reason}"
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 md:border-l md:border-zinc-800 md:pl-6">
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">Est. Time</span>
                    </div>
                    <div className="font-semibold text-zinc-200">{recommendation.estimatedTime}</div>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Target className="w-4 h-4" />
                        <span className="text-xs font-medium">Progress</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-300">{recChapter.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full bg-gradient-to-r ${getSubjectColor(recSubject.color)}`} style={{ width: `${recChapter.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Upcoming Revisions Card */}
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
              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar relative z-10">
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
            )}
            
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar relative z-10">
              {filteredRevisions.length > 0 ? filteredRevisions.slice(0, revView === 'list' ? 4 : undefined).map(chapter => {
                const subject = subjects.find(s => s.id === chapter.subjectId);
                if (!subject) return null;
                
                // Calculate days from beginning of today to nextRevisionDate
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const revDate = new Date(chapter.nextRevisionDate!);
                revDate.setHours(0, 0, 0, 0);
                
                const daysUntil = Math.round((revDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                const isOverdue = daysUntil < 0;
                const isToday = daysUntil === 0;

                return (
                  <div key={chapter.id} className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 flex justify-between items-center group hover:border-purple-500/30 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${getSubjectText(subject.color)}`}>
                        {subject.name}
                      </span>
                      <span className="text-sm font-medium text-zinc-200 line-clamp-1" title={chapter.title}>
                        {chapter.title}
                      </span>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 ml-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                        isOverdue ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        isToday ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                      }`}>
                        {isOverdue ? `${Math.abs(daysUntil)}d Overdue` : isToday ? 'Today' : `in ${daysUntil}d`}
                      </span>
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
        </div>

        {/* Syllabus Sections Hierarchy */}
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
                                  subjectChapters.map(chapter => (
                                    <div key={chapter.id} className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                                      <div className="flex justify-between items-start gap-3">
                                        <span className="text-sm font-medium text-zinc-300 leading-tight">
                                          {chapter.title}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {chapter.status === 'revision' && <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20">Revise</span>}
                                          {chapter.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                          {chapter.status !== 'completed' && <span className="text-xs text-zinc-500 font-medium">{chapter.progress}%</span>}
                                        </div>
                                      </div>
                                      
                                      {chapter.status !== 'completed' && (
                                        <div className="w-full bg-zinc-900 rounded-full h-1 mt-1">
                                          <div 
                                            className={`h-1 rounded-full bg-gradient-to-r ${getSubjectColor(subject.color)}`} 
                                            style={{ width: `${chapter.progress}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  ))
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

      </div>
    </main>
  );
}

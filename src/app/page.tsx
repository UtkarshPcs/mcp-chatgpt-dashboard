"use client";

import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Subject, Chapter, AIRecommendation, Task } from "@/types";
import { 
  BookOpen, Target, Clock, AlertCircle, Sparkles, 
  ChevronRight, BrainCircuit, BarChart3, Loader2, CheckCircle2
} from "lucide-react";

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getSubjectCompletion = (subjectId: string) => {
    const subjectChapters = chapters.filter(c => c.subjectId === subjectId);
    if (subjectChapters.length === 0) return 0;
    const totalProgress = subjectChapters.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    return Math.round(totalProgress / subjectChapters.length);
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

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-8 lg:p-10 selection:bg-blue-500/30">
      <div className="max-w-[1600px] mx-auto space-y-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BrainCircuit className="w-8 h-8 text-blue-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Syllabus Tracker
              </h1>
            </div>
            <p className="text-zinc-400 text-lg">AI-Managed Academic Operating System</p>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800 shadow-inner w-fit">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-zinc-300">MCP Connected & Active</span>
          </div>
        </header>

        {/* AI Recommendation Card */}
        {recommendation && recSubject && recChapter && (
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-8 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold tracking-wider text-amber-400 uppercase">AI Study Recommendation</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg bg-zinc-800 ${getSubjectText(recSubject.color)}`}>
                    {recSubject.name}
                  </span>
                  <span className="text-zinc-500">•</span>
                  <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border ${
                    recommendation.priority === 'high' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                    recommendation.priority === 'medium' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                    'border-blue-500/30 text-blue-400 bg-blue-500/10'
                  }`}>
                    {recommendation.priority} Priority
                  </span>
                </div>
                
                <h3 className="text-3xl font-bold text-zinc-100 mb-4">{recChapter.title}</h3>
                <p className="text-lg text-zinc-400 leading-relaxed border-l-2 border-zinc-800 pl-4 italic">
                  "{recommendation.reason}"
                </p>
              </div>
              
              <div className="flex flex-col gap-4 lg:border-l lg:border-zinc-800 lg:pl-8">
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                  <div className="flex items-center gap-3 text-zinc-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Estimated Time</span>
                  </div>
                  <div className="text-xl font-semibold text-zinc-200">{recommendation.estimatedTime}</div>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                  <div className="flex items-center gap-3 text-zinc-400 mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-sm font-medium">Current Progress</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-zinc-800 rounded-full h-2">
                      <div className={`h-2 rounded-full bg-gradient-to-r ${getSubjectColor(recSubject.color)}`} style={{ width: `${recChapter.progress}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-zinc-300">{recChapter.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Subjects Overview */}
        <section>
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 className="w-5 h-5 text-zinc-400" />
            <h2 className="text-2xl font-semibold text-zinc-100">Syllabus Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {subjects.map(subject => {
              const completion = getSubjectCompletion(subject.id);
              const subjectChapters = chapters.filter(c => c.subjectId === subject.id);
              
              return (
                <div key={subject.id} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex flex-col hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h3 className={`text-2xl font-bold mb-1 ${getSubjectText(subject.color)}`}>{subject.name}</h3>
                      <p className="text-sm text-zinc-500">{subjectChapters.length} Chapters</p>
                    </div>
                    
                    {/* Radial Progress */}
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-zinc-800"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="currentColor" strokeWidth="3"
                        />
                        <path
                          className={getSubjectText(subject.color)}
                          strokeDasharray={`${completion}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-zinc-300">{completion}%</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {subjectChapters.length === 0 ? (
                      <p className="text-zinc-600 text-sm italic">No chapters added yet.</p>
                    ) : (
                      subjectChapters.map(chapter => (
                        <div key={chapter.id} className="group flex flex-col gap-2 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <span className="text-sm font-medium text-zinc-300 line-clamp-1 flex-1">
                              {chapter.title}
                            </span>
                            {chapter.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            {chapter.status === 'revision' && <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20 flex-shrink-0">Revise</span>}
                          </div>
                          
                          {chapter.status !== 'completed' && (
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${getSubjectColor(subject.color)}`} 
                                  style={{ width: `${chapter.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium text-zinc-500 w-8 text-right">{chapter.progress}%</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            
            {subjects.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl">
                <BookOpen className="w-12 h-12 mb-4 text-zinc-700" />
                <p className="text-lg">No subjects created yet.</p>
                <p className="text-sm mt-2">Ask ChatGPT to create your syllabus hierarchy.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}

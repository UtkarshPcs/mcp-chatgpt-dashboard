"use client";

import { useState } from "react";
import { useSyllabusData } from "@/hooks/useSyllabusData";
import { getActiveFrameworkChapters, getActiveRecommendation } from "@/utils/framework";
import { Header } from "@/components/dashboard/Header";
import { AnalyticsOverview } from "@/components/dashboard/AnalyticsOverview";
import { AIRecommendation } from "@/components/dashboard/AIRecommendation";
import { UpcomingRevisions } from "@/components/dashboard/UpcomingRevisions";
import { SyllabusBreakdown } from "@/components/syllabus/SyllabusBreakdown";
import { SubjectFramework } from "@/components/syllabus/SubjectFramework";
import { ExamStatus } from "@/components/dashboard/ExamStatus";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { subjects, chapters, recommendation, exams, loading, handleCompleteRevision } = useSyllabusData();

  const activeChapters = getActiveFrameworkChapters(chapters, subjects);
  const activeRec = getActiveRecommendation(recommendation, subjects);

  const [activeTab, setActiveTab] = useState<'overview' | 'frameworks' | 'exams'>('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p>Syncing Syllabus Tracker...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-8 selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto space-y-10">
        
        <Header />

        {/* Navigation Tabs */}
                <div className="flex border-b border-zinc-800">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
          >
            Dashboard Overview
          </button>
          <button 
            onClick={() => setActiveTab('exams')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'exams' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
          >
            Exam Status
          </button>
          <button 
            onClick={() => setActiveTab('frameworks')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'frameworks' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
          >
            Subject Frameworks
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <AnalyticsOverview chapters={activeChapters} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AIRecommendation 
                recommendation={activeRec} 
                subjects={subjects} 
                chapters={activeChapters} 
              />
              <UpcomingRevisions 
                chapters={activeChapters} 
                subjects={subjects} 
                onCompleteRevision={handleCompleteRevision} 
              />
            </div>

            <SyllabusBreakdown subjects={subjects} chapters={activeChapters} />
          </>
        )}
        {activeTab === 'frameworks' && <SubjectFramework subjects={subjects} />}
        {activeTab === 'exams' && <ExamStatus exams={exams} chapters={activeChapters} subjects={subjects} />}
      </div>
    </main>
  );
}

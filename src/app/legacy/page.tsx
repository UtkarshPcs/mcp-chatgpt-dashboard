"use client";

import { useSyllabusData } from "@/hooks/useSyllabusData";
import { SyllabusBreakdown } from "@/components/syllabus/SyllabusBreakdown";
import { AnalyticsOverview } from "@/components/dashboard/AnalyticsOverview";
import { Database, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LegacyPage() {
  const { subjects, chapters, loading } = useSyllabusData();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mb-4" />
        <p>Loading Historical Data...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-8 h-8 text-zinc-400" />
              <h1 className="text-4xl font-bold text-zinc-300">
                Legacy Historical Data
              </h1>
            </div>
            <p className="text-zinc-500 text-lg">Read-only view of past chapter progress and dates.</p>
          </div>
          
          <Link 
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg border border-blue-500/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Active OS
          </Link>
        </header>

        <div className="opacity-75 pointer-events-none">
          <AnalyticsOverview chapters={chapters} />
          <div className="mt-8">
            <SyllabusBreakdown subjects={subjects} chapters={chapters} />
          </div>
        </div>
      </div>
    </main>
  );
}

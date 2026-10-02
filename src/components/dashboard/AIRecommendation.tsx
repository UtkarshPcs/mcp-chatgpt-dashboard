import { AIRecommendation as AIRecommendationType, Chapter, Subject } from "@/types";
import { Sparkles, Clock, Target } from "lucide-react";
import { getSubjectColor, getSubjectText } from "@/utils/theme";

interface AIRecommendationProps {
  recommendation: AIRecommendationType | null;
  subjects: Subject[];
  chapters: Chapter[];
}

export function AIRecommendation({ recommendation, subjects, chapters }: AIRecommendationProps) {
  if (!recommendation) return null;

  const recSubject = subjects.find(s => s.id === recommendation.subjectId);
  const recChapter = chapters.find(c => c.id === recommendation.chapterId);

  if (!recSubject || !recChapter) return null;

  return (
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
  );
}

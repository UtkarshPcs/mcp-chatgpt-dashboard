"use client";

import { Subject } from "@/types";
import { Settings, Layers } from "lucide-react";
import { getSubjectColor, getSubjectText } from "@/utils/theme";

interface SubjectFrameworkProps {
  subjects: Subject[];
}

export function SubjectFramework({ subjects }: SubjectFrameworkProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-zinc-400" />
        <h2 className="text-2xl font-semibold text-zinc-100">Subject Task Frameworks</h2>
      </div>
      
      <p className="text-zinc-400 text-sm">
        These templates define the granular tasks required to complete a chapter for each subject. ChatGPT manages these frameworks via MCP.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {subjects.map(subject => {
          const hasTasks = subject.tasks && subject.tasks.length > 0;
          const sortedTasks = hasTasks ? [...subject.tasks!].sort((a, b) => a.order - b.order) : [];
          
          return (
            <div key={subject.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <Layers className={`w-4 h-4 ${getSubjectText(subject.color)}`} />
                  <h3 className={`text-lg font-bold ${getSubjectText(subject.color)}`}>{subject.name}</h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                  {hasTasks ? `${sortedTasks.length} Tasks` : 'No Framework'}
                </span>
              </div>
              
              <div className="p-4">
                {!hasTasks ? (
                  <div className="text-zinc-600 text-sm italic py-4 text-center">
                    No task framework established yet. Ask the AI to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedTasks.map(task => (
                      <div key={task.id} className="flex justify-between items-center p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
                        <span className="text-sm font-medium text-zinc-300">{task.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">Weight:</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded bg-zinc-800 ${getSubjectText(subject.color)}`}>
                            {task.weight}%
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 px-1 border-t border-zinc-800/30 mt-3">
                      <span className="text-xs text-zinc-500 uppercase font-bold">Total Weight</span>
                      <span className="text-xs font-bold text-zinc-300">
                        {sortedTasks.reduce((sum, t) => sum + t.weight, 0)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

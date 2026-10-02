import { BrainCircuit } from "lucide-react";

export function Header() {
  return (
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
  );
}

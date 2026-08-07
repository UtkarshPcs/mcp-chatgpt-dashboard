"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to real-time updates
    const q = query(collection(db, "tasks")); // Can't easily order without composite index if we sort by createdAt and completed. Just fetch all.
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      
      // Sort tasks locally: incomplete first, then by creation date
      tasksData.sort((a, b) => {
        if (a.completed === b.completed) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.completed ? 1 : -1;
      });

      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      const taskRef = doc(db, "tasks", id);
      await updateDoc(taskRef, { completed: !completed });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto mt-12 bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-800">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              ChatGPT Task Manager
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-medium border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live
            </div>
          </div>

          <p className="text-zinc-400 mb-8 text-sm">
            This dashboard updates in real-time. Connect the MCP server to ChatGPT and ask it to create a task to see it appear here instantly.
          </p>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-zinc-500">Connecting to database...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-16 bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800">
                <p className="text-zinc-500 text-lg">No tasks yet.</p>
                <p className="text-zinc-600 text-sm mt-2">Try asking ChatGPT: "Create a task to..."</p>
              </div>
            ) : (
              tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                    task.completed 
                      ? "bg-zinc-950/50 border-zinc-800/50 text-zinc-500" 
                      : "bg-zinc-800/50 border-zinc-700/50 text-zinc-100 hover:border-zinc-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id, task.completed)}
                    className="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900 bg-zinc-800 cursor-pointer transition-colors"
                  />
                  <span className={`flex-1 text-lg ${task.completed ? "line-through" : ""}`}>
                    {task.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

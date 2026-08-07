"use client";

import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Task, TaskStatus, TaskPriority } from "@/types";
import { 
  CheckCircle2, Circle, Clock, BookOpen, AlertCircle, 
  Trash2, Edit3, GripVertical, Calendar, Loader2 
} from "lucide-react";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tasksRef = ref(db, "tasks");
    
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      const tasksData: Task[] = [];
      
      if (data) {
        Object.keys(data).forEach((key) => {
          const taskData = data[key];
          // Handle legacy tasks
          if (!taskData.status) {
            taskData.status = taskData.completed ? 'completed' : 'upcoming';
          }
          if (taskData.progress === undefined) {
            taskData.progress = taskData.completed ? 100 : 0;
          }
          tasksData.push({ id: key, ...taskData });
        });
      }
      
      // Sort tasks by updated/created date
      tasksData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleComplete = async (task: Task) => {
    try {
      const taskRef = ref(db, `tasks/${task.id}`);
      const isCompleted = task.status === 'completed';
      
      const newStatus: TaskStatus = isCompleted ? 'current' : 'completed';
      const newProgress = isCompleted ? 0 : 100;
      
      await update(taskRef, { 
        status: newStatus, 
        progress: newProgress,
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <div className={`group relative flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-300 ${
      task.status === 'completed' 
        ? "bg-zinc-900/30 border-zinc-800/30 opacity-70" 
        : "bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
    }`}>
      <div className="flex items-start gap-4">
        <button 
          onClick={() => toggleComplete(task)}
          className="mt-1 flex-shrink-0 text-zinc-500 hover:text-emerald-400 transition-colors"
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold text-lg truncate ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
              {task.title}
            </h3>
            {task.priority && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400">
            {task.subject && (
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>{task.subject} {task.chapter && <span className="text-zinc-500">· {task.chapter}</span>}</span>
              </div>
            )}
            
            {task.estimatedTime && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{task.estimatedTime}</span>
              </div>
            )}
            
            {task.dueDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          {task.description && (
            <p className="mt-3 text-sm text-zinc-400 line-clamp-2">
              {task.description}
            </p>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {task.tags.map(tag => (
                <span key={tag} className="px-2 py-1 text-xs rounded-md bg-zinc-800 text-zinc-300">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {task.status !== 'completed' && task.progress !== undefined && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Progress</span>
                <span>{task.progress}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const Section = ({ title, status, icon: Icon, color }: { title: string, status: TaskStatus, icon: any, color: string }) => {
    const sectionTasks = tasks.filter(t => t.status === status);
    
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6 px-1">
          <Icon className={`w-5 h-5 ${color}`} />
          <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
          <span className="ml-auto bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-xs font-medium">
            {sectionTasks.length}
          </span>
        </div>
        
        <div className="flex-1 bg-zinc-950/50 rounded-3xl p-4 border border-zinc-800/50 flex flex-col gap-4">
          {sectionTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
              No tasks in {title.toLowerCase()}.
            </div>
          ) : (
            sectionTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p>Syncing dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-8 lg:p-10">
      <div className="max-w-[1600px] mx-auto">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Academic Dashboard
            </h1>
            <p className="text-zinc-400 text-lg">Managed exclusively via ChatGPT</p>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-zinc-300">MCP Connected</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          <Section 
            title="Current Focus" 
            status="current" 
            icon={AlertCircle} 
            color="text-rose-400" 
          />
          <Section 
            title="Upcoming" 
            status="upcoming" 
            icon={Calendar} 
            color="text-blue-400" 
          />
          <Section 
            title="Backlog" 
            status="backlog" 
            icon={BookOpen} 
            color="text-amber-400" 
          />
          <Section 
            title="Completed" 
            status="completed" 
            icon={CheckCircle2} 
            color="text-emerald-400" 
          />
        </div>
      </div>
    </main>
  );
}

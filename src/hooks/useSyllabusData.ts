"use client";

import { useState, useEffect } from "react";
import { ref, onValue, update, remove, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { Subject, Chapter, AIRecommendation, Exam, MistakeLog, MistakeStatus, TimeLog } from "@/types";

export function useSyllabusData() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [mistakes, setMistakes] = useState<MistakeLog[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subsRef = ref(db, "subjects");
    const chapsRef = ref(db, "chapters");
    const recRef = ref(db, "recommendation");
    const examsRef = ref(db, "exams");
    const mistakesRef = ref(db, "mistakes");
    const timeLogsRef = ref(db, "timeLogs");
    
    let loaded = 0;
    const checkLoaded = () => { loaded++; if (loaded === 6) setLoading(false); };

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

    const unsubExams = onValue(examsRef, (snap) => {
      const data = snap.val();
      setExams(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      checkLoaded();
    });

    const unsubMistakes = onValue(mistakesRef, (snap) => {
      const data = snap.val();
      setMistakes(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      checkLoaded();
    });

    const unsubTimeLogs = onValue(timeLogsRef, (snap) => {
      const data = snap.val();
      setTimeLogs(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      checkLoaded();
    });

    return () => { 
      unsubSubs(); 
      unsubChaps(); 
      unsubRec(); 
      unsubExams(); 
      unsubMistakes(); 
      unsubTimeLogs(); 
    };

  }, []);

  const handleCompleteRevision = async (chapter: Chapter) => {
    const currentCount = chapter.revisionCount || 0;
    if (currentCount >= 3) return; // Block if already reached 3

    const updates: any = {
      [`chapters/${chapter.id}/revisionCount`]: currentCount + 1,
      [`chapters/${chapter.id}/lastRevisionDate`]: new Date().toISOString(),
      [`chapters/${chapter.id}/nextRevisionDate`]: null,
    };

    try {
      await update(ref(db), updates);
    } catch (e) {
      console.error("Error updating revision", e);
    }
  };

  const handleToggleMistakeStatus = async (mistakeId: string, currentStatus: MistakeStatus) => {
    const newStatus: MistakeStatus = currentStatus === 'weak' ? 'resolved' : 'weak';
    try {
      await update(ref(db, `mistakes/${mistakeId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error toggling mistake status", e);
    }
  };

  const handleDeleteMistake = async (mistakeId: string) => {
    try {
      await remove(ref(db, `mistakes/${mistakeId}`));
    } catch (e) {
      console.error("Error deleting mistake", e);
    }
  };

  const handleLogTime = async (entry: {
    chapterId: string;
    subjectId: string;
    taskId: string;
    taskName: string;
    timeSpentMinutes: number;
    notes?: string;
    timestamp?: string;
    markTaskCompleted?: boolean;
  }) => {
    const now = new Date().toISOString();
    const sessionTime = entry.timestamp || now;
    try {
      if (entry.markTaskCompleted) {
        const updatePath = `chapters/${entry.chapterId}/tasks/${entry.taskId}`;
        await update(ref(db), {
          [`${updatePath}/status`]: 'completed',
          [`${updatePath}/completedAt`]: sessionTime,
          [`chapters/${entry.chapterId}/updatedAt`]: now
        });
      }

      await push(ref(db, "timeLogs"), {
        chapterId: entry.chapterId,
        subjectId: entry.subjectId,
        taskId: entry.taskId,
        taskName: entry.taskName,
        timeSpentMinutes: entry.timeSpentMinutes,
        timestamp: sessionTime,
        notes: entry.notes?.trim() || "",
        createdAt: now,
        updatedAt: now
      });
    } catch (e) {
      console.error("Error logging study time", e);
      throw e;
    }
  };

  const handleDeleteTimeLog = async (id: string) => {
    try {
      await remove(ref(db, `timeLogs/${id}`));
    } catch (e) {
      console.error("Error deleting time log", e);
      throw e;
    }
  };

  return {
    subjects,
    chapters,
    recommendation,
    exams,
    mistakes,
    timeLogs,
    loading,
    handleCompleteRevision,
    handleToggleMistakeStatus,
    handleDeleteMistake,
    handleLogTime,
    handleDeleteTimeLog
  };
}

"use client";

import { useState, useEffect } from "react";
import { ref, onValue, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Subject, Chapter, AIRecommendation, Exam, MistakeLog, MistakeStatus } from "@/types";

export function useSyllabusData() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [mistakes, setMistakes] = useState<MistakeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subsRef = ref(db, "subjects");
    const chapsRef = ref(db, "chapters");
    const recRef = ref(db, "recommendation");
    const examsRef = ref(db, "exams");
    const mistakesRef = ref(db, "mistakes");
    
    let loaded = 0;
    const checkLoaded = () => { loaded++; if (loaded === 5) setLoading(false); };

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

    return () => { unsubSubs(); unsubChaps(); unsubRec(); unsubExams(); unsubMistakes(); };

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

  return {
    subjects,
    chapters,
    recommendation,
    exams,
    mistakes,
    loading,
    handleCompleteRevision,
    handleToggleMistakeStatus,
    handleDeleteMistake
  };
}

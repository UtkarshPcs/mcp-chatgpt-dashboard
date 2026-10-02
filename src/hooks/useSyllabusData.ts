"use client";

import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Subject, Chapter, AIRecommendation } from "@/types";

export function useSyllabusData() {
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

  return {
    subjects,
    chapters,
    recommendation,
    loading,
    handleCompleteRevision
  };
}

import { Chapter } from "@/types";

export const calculateCompletion = (chaps: Chapter[]) => {
  if (chaps.length === 0) return 0;
  const total = chaps.reduce((acc, curr) => acc + (curr.progress || 0), 0);
  return Math.round(total / chaps.length);
};

export const calculateRevisionProgress = (chaps: Chapter[]) => {
  if (chaps.length === 0) return 0;
  const totalPossibleRevisions = chaps.length * 3;
  const currentRevisions = chaps.reduce((acc, curr) => acc + Math.min(curr.revisionCount || 0, 3), 0);
  return Math.round((currentRevisions / totalPossibleRevisions) * 100);
};

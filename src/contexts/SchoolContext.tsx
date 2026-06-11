import * as React from "react";
import type { Course, LearningTrack, ForumQuestion } from "@/src/types";

// =====================================================
// School Context — Manages courses, tracks, and forum
// =====================================================

interface SchoolContextValue {
  courses: Course[];
  tracks: LearningTrack[];
  forumQuestions: ForumQuestion[];
  addCourse: (c: Course) => void;
  updateCourse: (c: Course) => void;
  deleteCourse: (id: string) => void;
  addTrack: (t: LearningTrack) => void;
  answerForumQuestion: (id: string, ans: string, isOfficial: boolean) => void;
}

const SchoolContext = React.createContext<SchoolContextValue | null>(null);

export function useSchool(): SchoolContextValue {
  const ctx = React.useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [tracks, setTracks] = React.useState<LearningTrack[]>([]);
  const [forumQuestions, setForumQuestions] = React.useState<ForumQuestion[]>([]);

  const addCourse = (c: Course) => setCourses(prev => [...prev, c]);
  const updateCourse = (c: Course) => setCourses(prev => prev.map(xc => xc.id === c.id ? c : xc));
  const deleteCourse = (id: string) => setCourses(prev => prev.filter(c => c.id !== id));

  const addTrack = (t: LearningTrack) => setTracks(prev => [...prev, t]);
  const answerForumQuestion = (id: string, ans: string, isOfficial: boolean) =>
    setForumQuestions(prev => prev.map(q => q.id === id ? { ...q, answer: ans, isOfficial } : q));

  return (
    <SchoolContext.Provider value={{
      courses, addCourse, updateCourse, deleteCourse,
      tracks, addTrack,
      forumQuestions, answerForumQuestion
    }}>
      {children}
    </SchoolContext.Provider>
  );
}

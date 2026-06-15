import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import {
  toCoursePayload,
  toEnrollmentPayload,
  toEnrollmentProgressPayload,
  toLearningPathPayload,
  toLessonPayload,
  toModulePayload,
  type CoursePayloadInput,
  type EnrollmentPayloadInput,
  type LearningPathPayloadInput,
  type LessonPayloadInput,
  type ModulePayloadInput,
} from '@/src/lib/domain/payloads';

export async function createCourse(input: CoursePayloadInput) {
  return addDoc(collection(db, COLLECTIONS.courses), {
    ...toCoursePayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createLearningPath(input: LearningPathPayloadInput) {
  return addDoc(collection(db, COLLECTIONS.paths), {
    ...toLearningPathPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateLearningPathCourses(pathId: string, courses: string[]) {
  await updateDoc(doc(db, COLLECTIONS.paths, pathId), {
    courses,
    updatedAt: serverTimestamp(),
  });
}

export async function createCourseModule(input: ModulePayloadInput) {
  return addDoc(collection(db, COLLECTIONS.modules), {
    ...toModulePayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createCourseLesson(input: LessonPayloadInput) {
  return addDoc(collection(db, COLLECTIONS.lessons), {
    ...toLessonPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createEnrollment(input: EnrollmentPayloadInput) {
  return addDoc(collection(db, COLLECTIONS.enrollments), {
    ...toEnrollmentPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateEnrollmentProgress(enrollmentId: string, completedLessons: string[], totalLessons: number) {
  await updateDoc(doc(db, COLLECTIONS.enrollments, enrollmentId), {
    ...toEnrollmentProgressPayload(completedLessons, totalLessons),
    updatedAt: serverTimestamp(),
  });
}

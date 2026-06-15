import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import {
  cleanText,
  toEventEnrollmentPayload,
  type EventEnrollmentPayloadInput,
} from '@/src/lib/domain/payloads';

export function createEventEnrollmentId(eventId: string | number, userId: string) {
  return `${cleanText(eventId, 128)}_${cleanText(userId, 128)}`;
}

export async function createEventEnrollment(input: EventEnrollmentPayloadInput) {
  const enrollmentId = createEventEnrollmentId(input.eventId, input.userId);

  await setDoc(doc(db, COLLECTIONS.eventEnrollments, enrollmentId), {
    ...toEventEnrollmentPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return enrollmentId;
}

export async function updateEventEnrollmentPreference(enrollmentId: string, preferenceId: string) {
  await updateDoc(doc(db, COLLECTIONS.eventEnrollments, enrollmentId), {
    preferenceId: cleanText(preferenceId, 128),
    updatedAt: serverTimestamp(),
  });
}

import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import {
  toPastoralAppointmentPayload,
  toPastoralTaskPayload,
  type PastoralAppointmentPayloadInput,
  type PastoralTaskPayloadInput,
} from '@/src/lib/domain/payloads';
import type { PastoralAppointmentInput, PrayerRequestStatus, VisitorLeadStatus } from '@/src/lib/domain/platform-contracts';

export async function createPastoralAppointment(input: PastoralAppointmentPayloadInput) {
  const appointmentPayload = toPastoralAppointmentPayload(input);
  const ref = await addDoc(collection(db, COLLECTIONS.pastoralAppointments), {
    ...appointmentPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: ref.id, ...appointmentPayload };
}

export async function updatePastoralAppointmentStatus(
  appointmentId: string,
  status: PastoralAppointmentInput['status']
) {
  await updateDoc(doc(db, COLLECTIONS.pastoralAppointments, appointmentId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function createPastoralTask(input: PastoralTaskPayloadInput) {
  return addDoc(collection(db, COLLECTIONS.tasks), {
    ...toPastoralTaskPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTaskStatus(taskId: string, status: string) {
  await updateDoc(doc(db, COLLECTIONS.tasks, taskId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function updateVisitorLeadStatus(leadId: string, status: VisitorLeadStatus) {
  await updateDoc(doc(db, COLLECTIONS.visitorLeads, leadId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePrayerRequestStatus(prayerId: string, status: PrayerRequestStatus) {
  await updateDoc(doc(db, COLLECTIONS.prayerRequests, prayerId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import {
  toSocialAppointmentPayload,
  toSocialProfessionalPayload,
  type SocialAppointmentPayloadInput,
  type SocialProfessionalPayloadInput,
} from '@/src/lib/domain/payloads';
import type { SocialAppointmentInput } from '@/src/lib/domain/platform-contracts';

export async function createSocialAppointment(input: SocialAppointmentPayloadInput) {
  return addDoc(collection(db, COLLECTIONS.socialAppointments), {
    ...toSocialAppointmentPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveSocialProfessional(input: SocialProfessionalPayloadInput & { id?: string }) {
  const payload = toSocialProfessionalPayload(input);

  if (input.id) {
    await updateDoc(doc(db, COLLECTIONS.socialProfessionals, input.id), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
    return input.id;
  }

  const ref = await addDoc(collection(db, COLLECTIONS.socialProfessionals), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function deleteSocialProfessional(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.socialProfessionals, id));
}

export async function updateSocialAppointmentStatus(
  appointmentId: string,
  status: SocialAppointmentInput['status']
) {
  await updateDoc(doc(db, COLLECTIONS.socialAppointments, appointmentId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

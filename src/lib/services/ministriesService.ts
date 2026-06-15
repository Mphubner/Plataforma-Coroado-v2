import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import {
  toBriefingPayload,
  toMinistryPayload,
  toScalePayload,
  type BriefingPayloadInput,
  type MinistryPayloadInput,
  type ScaleAssignmentPayloadInput,
  type ScalePayloadInput,
} from '@/src/lib/domain/payloads';
import type { BriefingInput } from '@/src/lib/domain/platform-contracts';

export async function createMinistry(input: MinistryPayloadInput) {
  return addDoc(collection(db, COLLECTIONS.ministries), {
    ...toMinistryPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createScale(input: ScalePayloadInput) {
  return addDoc(collection(db, COLLECTIONS.scales), {
    ...toScalePayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateScaleAssignments(scaleId: string, assignments: ScaleAssignmentPayloadInput[]) {
  await updateDoc(doc(db, COLLECTIONS.scales, scaleId), {
    assignments: assignments.map(assignment => ({
      memberId: assignment.memberId || '',
      role: assignment.role || '',
      status: assignment.status || 'pending',
    })),
    updatedAt: serverTimestamp(),
  });
}

export async function createBriefing(input: BriefingPayloadInput) {
  return addDoc(collection(db, COLLECTIONS.briefings), {
    ...toBriefingPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBriefingStatus(
  briefingId: string,
  status: BriefingInput['status'],
  declineReason?: string
) {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (declineReason) {
    updateData.declineReason = declineReason;
  }

  await updateDoc(doc(db, COLLECTIONS.briefings, briefingId), updateData);
}

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import {
  toMemberProfileUpdatePayload,
  type MemberProfileUpdatePayloadInput,
} from '@/src/lib/domain/payloads';

export async function updateMemberProfile(memberId: string, input: MemberProfileUpdatePayloadInput) {
  await updateDoc(doc(db, COLLECTIONS.users, memberId), {
    ...toMemberProfileUpdatePayload(input),
    updatedAt: serverTimestamp(),
  });
}

export async function syncMinistryLeader(ministryId: string, leader: { id: string; name?: string }) {
  await updateDoc(doc(db, COLLECTIONS.ministries, ministryId), {
    leaderId: leader.id,
    leaderName: leader.name || '',
    updatedAt: serverTimestamp(),
  });
}

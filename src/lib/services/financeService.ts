import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import { toPendingContributionPayload, type PendingContributionPayloadInput } from '@/src/lib/domain/payloads';

export async function createPendingContribution(input: PendingContributionPayloadInput) {
  const transactionPayload = toPendingContributionPayload(input);

  return addDoc(collection(db, COLLECTIONS.transactions), {
    ...transactionPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

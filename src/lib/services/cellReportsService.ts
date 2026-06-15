import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import { toCellReportPayload, type CellReportPayloadInput } from '@/src/lib/domain/payloads';

export async function createCellReport(input: CellReportPayloadInput) {
  const reportPayload = toCellReportPayload(input);

  return addDoc(collection(db, COLLECTIONS.cellReports), {
    ...reportPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cleanText, DEFAULT_PLATFORM_TENANT_ID } from '@/src/lib/domain/payloads';

export type CellPayloadInput = {
  name: string;
  neighborhood: string;
  day: string;
  time: string;
  phone: string;
  leaderId: string;
  tenantId?: string;
  status?: string;
};

export function toCellPayload(input: CellPayloadInput) {
  return {
    name: cleanText(input.name, 100),
    neighborhood: cleanText(input.neighborhood, 100),
    day: cleanText(input.day, 20),
    time: cleanText(input.time, 20),
    phone: cleanText(input.phone, 20),
    leaderId: cleanText(input.leaderId, 128),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    status: cleanText(input.status, 30) || 'pending_approval',
  };
}

export async function createCell(input: CellPayloadInput) {
  const id = `cell_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = toCellPayload(input);
  await setDoc(doc(db, 'cells', id), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function approveCell(cellId: string) {
  await updateDoc(doc(db, 'cells', cellId), {
    status: 'approved',
    updatedAt: serverTimestamp(),
  });
}

export async function rejectCell(cellId: string) {
  await updateDoc(doc(db, 'cells', cellId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
}

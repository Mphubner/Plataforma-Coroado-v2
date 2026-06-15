import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import {
  toTaskPayload,
  toTaskUpdatePayload,
  type TaskPayloadInput,
  type TaskUpdatePayloadInput,
} from '@/src/lib/domain/payloads';

export async function createTask(input: TaskPayloadInput) {
  return addDoc(collection(db, COLLECTIONS.tasks), {
    ...toTaskPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePlanningTaskStatus(taskId: string, status: string) {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'done') {
    updateData.completedAt = new Date().toISOString().split('T')[0];
  }

  await updateDoc(doc(db, COLLECTIONS.tasks, taskId), updateData);
}

export async function updateTaskDetails(taskId: string, input: Partial<TaskPayloadInput>) {
  await updateDoc(doc(db, COLLECTIONS.tasks, taskId), {
    title: input.title || '',
    description: input.description || '',
    tag: input.tag || 'Geral',
    assigneeId: input.assigneeId || 'Nao atribuido',
    dueDate: input.dueDate || '',
    updatedAt: serverTimestamp(),
  });
}

export async function createTaskUpdate(input: TaskUpdatePayloadInput) {
  return addDoc(collection(db, COLLECTIONS.taskUpdates), {
    ...toTaskUpdatePayload(input),
    createdAt: serverTimestamp(),
  });
}

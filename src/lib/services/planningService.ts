import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import {
  toTaskPayload,
  toTaskUpdatePayload,
  type TaskPayloadInput,
  type TaskUpdatePayloadInput,
} from '@/src/lib/domain/payloads';

function readText(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === 'string' ? value : '';
}

function normalizeTaskInput(input: Partial<TaskPayloadInput> & Record<string, unknown>): TaskPayloadInput {
  return {
    title: input.title || readText(input, 'action_title'),
    description: input.description || readText(input, 'strategy_detail'),
    tag: input.tag || readText(input, 'group_department') || readText(input, 'root_problem') || 'Geral',
    assigneeId: input.assigneeId || readText(input, 'assignee_name') || 'Nao atribuido',
    status: input.status || 'todo',
    tenantId: input.tenantId,
    createdBy: input.createdBy || auth.currentUser?.uid || '',
    dueDate: input.dueDate || readText(input, 'due_date'),
    startDate: input.startDate,
    completedAt: input.completedAt,
  };
}

export async function createTask(input: Partial<TaskPayloadInput> & Record<string, unknown>) {
  return addDoc(collection(db, COLLECTIONS.tasks), {
    ...toTaskPayload(normalizeTaskInput(input)),
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

export async function updateTaskDetails(taskId: string, input: Partial<TaskPayloadInput> & Record<string, unknown>) {
  const normalized = normalizeTaskInput(input);
  const payload: any = {
    title: normalized.title,
    description: normalized.description || '',
    tag: normalized.tag || 'Geral',
    assigneeId: normalized.assigneeId || 'Nao atribuido',
    dueDate: normalized.dueDate || '',
    updatedAt: serverTimestamp(),
  };
  if (input.status) payload.status = normalized.status;
  if (input.startDate !== undefined) payload.startDate = normalized.startDate;
  
  if (input.status === 'done' || input.status === 'Concluído') {
    payload.completedAt = new Date().toISOString().split('T')[0];
  }

  await updateDoc(doc(db, COLLECTIONS.tasks, taskId), payload);
}

export async function createTaskUpdate(input: TaskUpdatePayloadInput) {
  return addDoc(collection(db, COLLECTIONS.taskUpdates), {
    ...toTaskUpdatePayload(input),
    createdAt: serverTimestamp(),
  });
}

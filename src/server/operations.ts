import admin from 'firebase-admin';
import { COLLECTIONS, type PlanRequest, type SchoolProgressRequest, type TransactionReconciliationRequest } from '../lib/domain';
import {
  cleanString,
  DEFAULT_TENANT_ID,
  getAdminDb,
  hasAnyRole,
  OWNER_EMAIL,
  type ServerAuthContext,
} from './context';

export class OperationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const ADMIN_ROLES = ['admin', 'seniorPastor', 'networkPastor', 'auxPastor'];
const EVENT_CHECKIN_ROLES = [...ADMIN_ROLES, 'ministryLeader', 'cellLeader'];

export function getAuthTenantId(ctx: ServerAuthContext) {
  return cleanString(ctx.userProfile?.tenantId, 128) || DEFAULT_TENANT_ID;
}

export function assertAuthenticated(ctx: ServerAuthContext) {
  if (!ctx.authUser?.uid) {
    throw new OperationError(401, 'Autenticacao obrigatoria');
  }
}

export function hasServerRole(ctx: ServerAuthContext, roles: string[]) {
  return ctx.authUser?.email === OWNER_EMAIL || hasAnyRole(ctx.userProfile, roles);
}

export function assertServerRole(ctx: ServerAuthContext, roles: string[]) {
  assertAuthenticated(ctx);
  if (!hasServerRole(ctx, roles)) {
    throw new OperationError(403, 'Permissao insuficiente');
  }
}

export async function checkInEventEnrollment(ctx: ServerAuthContext, enrollmentId: string) {
  assertServerRole(ctx, EVENT_CHECKIN_ROLES);

  const tenantId = getAuthTenantId(ctx);
  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.eventEnrollments).doc(enrollmentId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new OperationError(404, 'Inscricao nao encontrada');
  }

  const enrollment = snap.data() || {};
  if (enrollment.tenantId !== tenantId && ctx.authUser?.email !== OWNER_EMAIL) {
    throw new OperationError(403, 'Inscricao de outra unidade');
  }

  if (enrollment.paymentStatus === 'pending') {
    throw new OperationError(409, 'Ingresso ainda aguardando pagamento');
  }

  if (enrollment.checkedIn) {
    return {
      enrollmentId,
      alreadyCheckedIn: true,
      checkedIn: true,
    };
  }

  await ref.set({
    checkedIn: true,
    checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
    checkedInBy: ctx.authUser?.uid,
    status: 'checked_in',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    enrollmentId,
    alreadyCheckedIn: false,
    checkedIn: true,
  };
}

export async function updateSchoolProgress(ctx: ServerAuthContext, input: SchoolProgressRequest) {
  assertAuthenticated(ctx);

  const tenantId = getAuthTenantId(ctx);
  const db = getAdminDb();
  const enrollmentRef = db.collection(COLLECTIONS.enrollments).doc(input.enrollmentId);
  const enrollmentSnap = await enrollmentRef.get();

  if (!enrollmentSnap.exists) {
    throw new OperationError(404, 'Matricula nao encontrada');
  }

  const enrollment = enrollmentSnap.data() || {};
  const canManage = hasServerRole(ctx, ADMIN_ROLES);

  if (enrollment.userId !== ctx.authUser?.uid && !canManage) {
    throw new OperationError(403, 'Matricula de outro usuario');
  }

  if (enrollment.tenantId !== tenantId && ctx.authUser?.email !== OWNER_EMAIL) {
    throw new OperationError(403, 'Matricula de outra unidade');
  }

  const lessonSnap = await db.collection(COLLECTIONS.lessons).doc(input.lessonId).get();
  if (!lessonSnap.exists) {
    throw new OperationError(404, 'Aula nao encontrada');
  }

  const lesson = lessonSnap.data() || {};
  if (lesson.courseId !== enrollment.courseId) {
    throw new OperationError(400, 'Aula nao pertence a este curso');
  }

  const lessonsSnap = await db.collection(COLLECTIONS.lessons)
    .where('courseId', '==', enrollment.courseId)
    .get();

  const validLessonIds = new Set(lessonsSnap.docs.map(doc => doc.id));
  const completedLessons = Array.from(new Set(
    (Array.isArray(enrollment.completedLessons) ? enrollment.completedLessons : [])
      .map(String)
      .filter(id => validLessonIds.has(id)),
  ));

  const currentIndex = completedLessons.indexOf(input.lessonId);
  if (input.completed && currentIndex === -1) {
    completedLessons.push(input.lessonId);
  }

  if (!input.completed && currentIndex !== -1) {
    completedLessons.splice(currentIndex, 1);
  }

  const totalLessons = validLessonIds.size || 1;
  const progress = Math.min(100, Math.round((completedLessons.length / totalLessons) * 100));
  const status = progress >= 100 ? 'completed' : 'in-progress';

  await enrollmentRef.set({
    completedLessons,
    progress,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    enrollmentId: input.enrollmentId,
    completedLessons,
    progress,
    status,
  };
}

export async function createFinancePlan(ctx: ServerAuthContext, input: PlanRequest) {
  assertServerRole(ctx, ADMIN_ROLES);

  const tenantId = getAuthTenantId(ctx);
  const planRef = await getAdminDb().collection(COLLECTIONS.plans).add({
    name: input.name,
    price: input.price,
    interval: input.interval,
    type: input.type,
    features: input.features,
    tenantId,
    source: 'bff',
    createdBy: ctx.authUser?.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    planId: planRef.id,
  };
}

export async function reconcileTransaction(ctx: ServerAuthContext, transactionId: string, input: TransactionReconciliationRequest) {
  assertServerRole(ctx, ADMIN_ROLES);

  const tenantId = getAuthTenantId(ctx);
  const ref = getAdminDb().collection(COLLECTIONS.transactions).doc(transactionId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new OperationError(404, 'Transacao nao encontrada');
  }

  const transaction = snap.data() || {};
  if (transaction.tenantId !== tenantId && ctx.authUser?.email !== OWNER_EMAIL) {
    throw new OperationError(403, 'Transacao de outra unidade');
  }

  await ref.set({
    status: input.status,
    reconciliationNote: input.note,
    reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
    reconciledBy: ctx.authUser?.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    transactionId,
    status: input.status,
  };
}

export async function recordPaymentEvent(input: {
  provider: 'mercadopago' | 'bank';
  paymentId: string;
  referenceId: string;
  status: string;
  targetType: string;
  amount: number;
  tenantId?: string;
  raw?: unknown;
}) {
  const id = `${input.provider}_${input.paymentId}`;
  await getAdminDb().collection(COLLECTIONS.paymentEvents).doc(id).set({
    ...input,
    raw: input.raw || null,
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

import { can } from '../../lib/permissions';
import { COLLECTIONS } from '../../lib/domain';
import { DEFAULT_TENANT_ID, getAdminDb, OWNER_EMAIL, type ServerAuthContext } from '../context';
import { OperationError } from '../operations';

type Row = FirebaseFirestore.DocumentData & { id: string };

const DEFAULT_SCALE_ROLES = [
  'Estudo / Palavra',
  'Louvor',
  'Oracao inicial',
  'Quebra-gelo',
  'Recepcao',
  'Lanche / comunhao',
];

function asText(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function asNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function toMillis(value: any) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
}

function tenantIdFrom(ctx: ServerAuthContext) {
  return asText(ctx.userProfile?.tenantId, DEFAULT_TENANT_ID) || DEFAULT_TENANT_ID;
}

function profileFrom(ctx: ServerAuthContext) {
  if (!ctx.authUser || !ctx.userProfile) return null;
  return {
    id: ctx.authUser.uid,
    uid: ctx.authUser.uid,
    email: ctx.authUser.email,
    ...ctx.userProfile,
  };
}

async function readTenantCollection(collectionName: string, tenantId: string, limit = 1000) {
  const snap = await getAdminDb()
    .collection(collectionName)
    .where('tenantId', '==', tenantId)
    .limit(limit)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Row);
}

function getRecentReports(reports: Row[], amount = 4) {
  return [...reports]
    .sort((a, b) => toMillis(b.date || b.createdAt) - toMillis(a.date || a.createdAt))
    .slice(0, amount);
}

function presentSet(report: Row) {
  const ids = Array.isArray(report.presentMembersIds) ? report.presentMembersIds.map(String) : [];
  return new Set(ids);
}

export async function getCellOverview(ctx: ServerAuthContext, cellId: string) {
  if (!ctx.authUser || !ctx.userProfile) {
    throw new OperationError(401, 'Autenticacao obrigatoria');
  }

  const tenantId = tenantIdFrom(ctx);
  const profile = profileFrom(ctx);
  const db = getAdminDb();
  const cellSnap = await db.collection(COLLECTIONS.cells).doc(cellId).get();

  if (!cellSnap.exists) {
    throw new OperationError(404, 'Celula nao encontrada');
  }

  const cell = { id: cellSnap.id, ...cellSnap.data() } as Row;
  if (asText(cell.tenantId, tenantId) !== tenantId && ctx.authUser.email !== OWNER_EMAIL) {
    throw new OperationError(403, 'Celula de outra unidade');
  }

  const canManageCell = Boolean(
    profile
    && (
      ctx.authUser.email === OWNER_EMAIL
      || can(profile, 'manage:cell')
      || asText((profile as any).cellId) === cellId
    ),
  );

  if (!canManageCell) {
    throw new OperationError(403, 'Permissao insuficiente');
  }

  const [members, reports, enrollments, courses, tasks] = await Promise.all([
    db.collection(COLLECTIONS.users).where('tenantId', '==', tenantId).where('cellId', '==', cellId).limit(300).get()
      .then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Row)),
    db.collection(COLLECTIONS.cellReports).where('tenantId', '==', tenantId).where('cellId', '==', cellId).limit(300).get()
      .then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Row)),
    readTenantCollection(COLLECTIONS.enrollments, tenantId, 1000),
    readTenantCollection(COLLECTIONS.courses, tenantId, 500),
    readTenantCollection(COLLECTIONS.tasks, tenantId, 500),
  ]);

  const memberIds = new Set(members.map(member => member.id));
  const cellEnrollments = enrollments.filter(enrollment => memberIds.has(asText(enrollment.userId)));
  const recentReports = getRecentReports(reports);
  const totalPresentSlots = recentReports.reduce((sum, report) => sum + asNumber(report.present), 0);
  const attendanceRate = members.length > 0 && recentReports.length > 0
    ? Math.round((totalPresentSlots / (recentReports.length * members.length)) * 100)
    : 0;

  const membersWithEnrollment = new Set(cellEnrollments.map(enrollment => asText(enrollment.userId)).filter(Boolean));
  const avgSchoolProgress = cellEnrollments.length > 0
    ? Math.round(cellEnrollments.reduce((sum, enrollment) => sum + asNumber(enrollment.progress), 0) / cellEnrollments.length)
    : 0;
  const schoolEngagementRate = members.length > 0
    ? Math.round((membersWithEnrollment.size / members.length) * 100)
    : 0;
  const completedCourseCount = cellEnrollments.filter(enrollment => asText(enrollment.status) === 'completed' || asNumber(enrollment.progress) >= 100).length;

  const atRiskMembers = members
    .map(member => {
      const absences = recentReports.filter(report => !presentSet(report).has(member.id)).length;
      const memberEnrollments = cellEnrollments.filter(enrollment => asText(enrollment.userId) === member.id);
      const memberAvgProgress = memberEnrollments.length > 0
        ? Math.round(memberEnrollments.reduce((sum, enrollment) => sum + asNumber(enrollment.progress), 0) / memberEnrollments.length)
        : 0;
      const reasons: string[] = [];

      if (recentReports.length >= 2 && absences >= Math.min(3, recentReports.length)) {
        reasons.push(`Ausente em ${absences} dos ultimos ${recentReports.length} encontros`);
      }

      if (memberEnrollments.length === 0) {
        reasons.push('Sem matricula ativa na Escola IDE');
      } else if (memberAvgProgress < 25) {
        reasons.push(`Progresso IDE baixo (${memberAvgProgress}%)`);
      }

      return {
        id: member.id,
        name: asText(member.name || member.displayName || member.email, 'Membro'),
        phone: asText(member.phone),
        absences,
        schoolProgress: memberAvgProgress,
        reasons,
        riskLevel: absences >= 3 || memberAvgProgress === 0 ? 'alto' : 'medio',
      };
    })
    .filter(member => member.reasons.length > 0)
    .slice(0, 8);

  const activeCellTasks = tasks
    .filter(task => asText(task.cellId) === cellId || asText(task.tag).toLowerCase().includes('celula'))
    .slice(0, 12)
    .map(task => ({
      id: task.id,
      title: asText(task.title, 'Tarefa da celula'),
      assigneeId: asText(task.assigneeId),
      assignee: asText(members.find(member => member.id === task.assigneeId)?.name || task.assigneeName || task.assigneeId),
      status: asText(task.status, 'todo'),
      tag: asText(task.tag),
    }));

  const generatedScale = DEFAULT_SCALE_ROLES.map((title, index) => {
    const member = members.length > 0 ? members[index % members.length] : null;
    return {
      id: `suggested-${index}`,
      title,
      assigneeId: member?.id || '',
      assignee: member ? asText(member.name || member.displayName, 'Membro') : '',
      status: member ? 'Sugerido' : 'Pendente',
      tag: 'Escala de celula',
    };
  });

  const memberSummary = {
    attendanceRate: (() => {
      const userId = ctx.authUser?.uid || '';
      if (!userId || recentReports.length === 0) return 0;
      const present = recentReports.filter(report => presentSet(report).has(userId)).length;
      return Math.round((present / recentReports.length) * 100);
    })(),
    schoolProgress: (() => {
      const userId = ctx.authUser?.uid || '';
      const ownEnrollments = cellEnrollments.filter(enrollment => asText(enrollment.userId) === userId);
      if (ownEnrollments.length === 0) return 0;
      return Math.round(ownEnrollments.reduce((sum, enrollment) => sum + asNumber(enrollment.progress), 0) / ownEnrollments.length);
    })(),
  };

  const memberSchool = members.map(member => {
    const memberEnrollments = cellEnrollments.filter(enrollment => asText(enrollment.userId) === member.id);
    const progress = memberEnrollments.length > 0
      ? Math.round(memberEnrollments.reduce((sum, enrollment) => sum + asNumber(enrollment.progress), 0) / memberEnrollments.length)
      : 0;

    return {
      id: member.id,
      enrollments: memberEnrollments.length,
      progress,
      completedCourses: memberEnrollments.filter(enrollment => asText(enrollment.status) === 'completed' || asNumber(enrollment.progress) >= 100).length,
    };
  });

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    cell: {
      id: cell.id,
      name: asText(cell.name, 'Celula'),
      leaderId: asText(cell.leaderId),
    },
    totals: {
      members: members.length,
      reports: reports.length,
      visitors: reports.reduce((sum, report) => sum + asNumber(report.visitors), 0),
      attendanceRate,
      schoolEngagementRate,
      avgSchoolProgress,
      completedCourseCount,
      publishedCourses: courses.filter(course => ['published', 'Publicado'].includes(asText(course.status))).length,
      multiplicationReadiness: Math.min(100, Math.round(((members.length + completedCourseCount) / 15) * 100)),
    },
    atRiskMembers,
    scaleTasks: activeCellTasks.length > 0 ? activeCellTasks : generatedScale,
    memberSchool,
    memberSummary,
  };
}

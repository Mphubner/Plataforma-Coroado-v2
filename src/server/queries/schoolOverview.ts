import { can } from '../../lib/permissions';
import { COLLECTIONS } from '../../lib/domain';
import { DEFAULT_TENANT_ID, getAdminDb, OWNER_EMAIL, type ServerAuthContext } from '../context';
import { OperationError } from '../operations';

type Row = FirebaseFirestore.DocumentData & { id: string };

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

function toDateLabel(value: any) {
  const millis = toMillis(value);
  return millis > 0 ? new Date(millis).toISOString().slice(0, 10) : '';
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

function last30DaySeries(enrollments: Row[]) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    return { name: key.slice(5), val: 0 };
  });
  const byDay = new Map(days.map(day => [day.name, day]));

  for (const enrollment of enrollments) {
    const key = toDateLabel(enrollment.createdAt).slice(5);
    const item = byDay.get(key);
    if (item) item.val += 1;
  }

  return days;
}

function getCourseMap(courses: Row[]) {
  return new Map(courses.map(course => [course.id, course]));
}

function getUserMap(users: Row[]) {
  return new Map(users.map(user => [user.id, user]));
}

function formatCertificateCode(enrollment: Row, course: Row | undefined) {
  const title = asText(course?.title, 'IDE');
  const initials = title
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 4)
    .toUpperCase() || 'IDE';
  return `CERT-${initials}-${new Date().getFullYear()}-${enrollment.id.slice(0, 6).toUpperCase()}`;
}

export async function getSchoolOverview(ctx: ServerAuthContext) {
  if (!ctx.authUser || !ctx.userProfile) {
    throw new OperationError(401, 'Autenticacao obrigatoria');
  }

  const tenantId = tenantIdFrom(ctx);
  const profile = profileFrom(ctx);
  const canManageSchool = Boolean(profile && (ctx.authUser.email === OWNER_EMAIL || can(profile, 'manage:school')));

  const [courses, modules, lessons, enrollments, subscriptions, orders, users, access] = await Promise.all([
    readTenantCollection(COLLECTIONS.courses, tenantId, 1000),
    readTenantCollection(COLLECTIONS.modules, tenantId, 1000),
    readTenantCollection(COLLECTIONS.lessons, tenantId, 1500),
    readTenantCollection(COLLECTIONS.enrollments, tenantId, 3000),
    readTenantCollection(COLLECTIONS.subscriptions, tenantId, 1000),
    readTenantCollection(COLLECTIONS.orders, tenantId, 1000),
    readTenantCollection(COLLECTIONS.users, tenantId, 2000),
    readTenantCollection(COLLECTIONS.learningAccess, tenantId, 2000),
  ]);

  const courseMap = getCourseMap(courses);
  const userMap = getUserMap(users);
  const schoolOrders = orders.filter(order => asText(order.source) === 'school_purchase');
  const paidSchoolOrders = schoolOrders.filter(order => ['paid', 'completed', 'approved'].includes(asText(order.paymentStatus || order.status)));
  const activeSubscriptions = subscriptions.filter(subscription => (
    asText(subscription.source) === 'school_subscription'
    && ['active', 'authorized'].includes(asText(subscription.status))
  ));

  const distinctStudents = new Set(enrollments.map(enrollment => asText(enrollment.userId)).filter(Boolean));
  const completedEnrollments = enrollments.filter(enrollment => asText(enrollment.status) === 'completed' || asNumber(enrollment.progress) >= 100);
  const completionRate = enrollments.length > 0 ? Math.round((completedEnrollments.length / enrollments.length) * 100) : 0;
  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, enrollment) => sum + asNumber(enrollment.progress), 0) / enrollments.length)
    : 0;
  const recurringRevenue = activeSubscriptions.reduce((sum, subscription) => sum + asNumber(subscription.amount), 0);
  const oneTimeRevenue = paidSchoolOrders.reduce((sum, order) => sum + asNumber(order.total), 0);
  const activeAccesses = access.filter(item => asText(item.status) === 'active').length;

  const enrollmentsByUser = new Map<string, Row[]>();
  for (const enrollment of enrollments) {
    const userId = asText(enrollment.userId);
    if (!userId) continue;
    enrollmentsByUser.set(userId, [...(enrollmentsByUser.get(userId) || []), enrollment]);
  }

  const students = Array.from(enrollmentsByUser.entries())
    .map(([userId, userEnrollments]) => {
      const user = userMap.get(userId);
      const completed = userEnrollments.filter(enrollment => asText(enrollment.status) === 'completed' || asNumber(enrollment.progress) >= 100).length;
      const progress = userEnrollments.length > 0
        ? Math.round(userEnrollments.reduce((sum, enrollment) => sum + asNumber(enrollment.progress), 0) / userEnrollments.length)
        : 0;
      const lastActivity = userEnrollments.reduce((max, enrollment) => Math.max(max, toMillis(enrollment.updatedAt || enrollment.createdAt)), 0);

      return {
        id: userId,
        name: asText(user?.name || user?.displayName || user?.email, 'Aluno'),
        ministry: asText(user?.ministryName || user?.ministryId, 'Sem ministerio'),
        enrollments: userEnrollments.length,
        completed,
        progress,
        lastActivity: lastActivity ? new Date(lastActivity).toISOString() : '',
        status: progress > 0 || completed > 0 ? 'active' : 'inactive',
      };
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 100);

  const ministryCounts = new Map<string, number>();
  for (const student of students) {
    ministryCounts.set(student.ministry, (ministryCounts.get(student.ministry) || 0) + 1);
  }

  const engagementByMinistry = Array.from(ministryCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const certificates = completedEnrollments
    .map(enrollment => {
      const course = courseMap.get(asText(enrollment.courseId));
      const user = userMap.get(asText(enrollment.userId));
      return {
        id: enrollment.id,
        name: asText(user?.name || user?.displayName || user?.email, 'Aluno'),
        course: asText(course?.title, 'Curso Escola IDE'),
        date: toDateLabel(enrollment.updatedAt || enrollment.createdAt) || new Date().toISOString().slice(0, 10),
        code: formatCertificateCode(enrollment, course),
      };
    })
    .slice(0, 100);

  const recentTransactions = [...schoolOrders]
    .sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt))
    .slice(0, 12)
    .map(order => ({
      id: order.id,
      date: toDateLabel(order.updatedAt || order.createdAt),
      user: asText(order.userName, 'Aluno'),
      product: Array.isArray(order.items) && order.items[0] ? asText(order.items[0].name, 'Escola IDE') : asText(order.targetType, 'Escola IDE'),
      amount: asNumber(order.total),
      status: asText(order.paymentStatus || order.status, 'pending'),
    }));

  const userEnrollments = enrollments.filter(enrollment => asText(enrollment.userId) === ctx.authUser?.uid);
  const userCompletedLessons = new Set(userEnrollments.flatMap(enrollment => Array.isArray(enrollment.completedLessons) ? enrollment.completedLessons.map(String) : []));
  const userCompletedCourses = userEnrollments.filter(enrollment => asText(enrollment.status) === 'completed' || asNumber(enrollment.progress) >= 100).length;
  const userAvgProgress = userEnrollments.length > 0
    ? Math.round(userEnrollments.reduce((sum, enrollment) => sum + asNumber(enrollment.progress), 0) / userEnrollments.length)
    : 0;
  const xp = userCompletedLessons.size * 50 + userCompletedCourses * 250;

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    canManageSchool,
    user: {
      enrollments: userEnrollments.length,
      completedCourses: userCompletedCourses,
      completedLessons: userCompletedLessons.size,
      progress: userAvgProgress,
      xp,
      level: xp >= 1500 ? 'Lider em formacao' : xp >= 500 ? 'Discipulo ativo' : 'Aluno IDE',
      certificates: certificates.filter(cert => cert.name === asText(ctx.userProfile.name || ctx.authUser.email, 'Aluno')),
      achievements: [
        { label: 'Primeiro passo', unlocked: userEnrollments.length > 0 },
        { label: 'Dedicado', unlocked: userCompletedLessons.size >= 3 },
        { label: 'Concluinte', unlocked: userCompletedCourses > 0 },
      ],
    },
    admin: canManageSchool ? {
      metrics: {
        activeStudents: distinctStudents.size,
        publishedCourses: courses.filter(course => ['published', 'Publicado'].includes(asText(course.status))).length,
        totalCourses: courses.length,
        totalModules: modules.length,
        totalLessons: lessons.length,
        completionRate,
        avgProgress,
        activeSubscriptions: activeSubscriptions.length,
        activeAccesses,
        recurringRevenue,
        oneTimeRevenue,
        annualRunRate: recurringRevenue * 12,
        pendingOrders: schoolOrders.filter(order => ['pending', 'created', 'pending_payment'].includes(asText(order.paymentStatus || order.status))).length,
      },
      enrollmentSeries: last30DaySeries(enrollments),
      engagementByMinistry,
      students,
      certificates,
      recentTransactions,
      alerts: {
        unansweredQuestions: 0,
        coldStudents: students.filter(student => student.progress === 0 || student.status === 'inactive').length,
        coursesWithoutLessons: courses.filter(course => !lessons.some(lesson => asText(lesson.courseId) === course.id)).length,
      },
    } : null,
  };
}

import { can } from '../../lib/permissions';
import { COLLECTIONS } from '../../lib/domain';
import { DEFAULT_TENANT_ID, getAdminDb, OWNER_EMAIL, type ServerAuthContext } from '../context';

type FirestoreRow = FirebaseFirestore.DocumentData & { id: string };

type EventStats = {
  enrollments: number;
  attendees: number;
  approved: number;
  pendingPayments: number;
  checkins: number;
};

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

function toDateLabel(value: any, fallback = '') {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const millis = toMillis(value);
  return millis > 0 ? new Date(millis).toISOString().slice(0, 10) : fallback;
}

function eventSortKey(event: FirestoreRow) {
  const date = toDateLabel(event.date);
  const time = asText(event.time, '00:00');
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  const millis = new Date(`${date}T${normalizedTime}`).getTime();
  return Number.isFinite(millis) ? millis : toMillis(event.date);
}

function attendeeCount(enrollment: FirestoreRow) {
  const kids = Array.isArray(enrollment.kids) ? enrollment.kids : [];
  return Math.max(kids.length, 1);
}

function checkedInCount(enrollment: FirestoreRow) {
  const kids = Array.isArray(enrollment.kids) ? enrollment.kids : [];
  if (kids.length > 0) {
    return kids.filter((kid: any) => Boolean(kid?.checkedIn)).length;
  }

  return enrollment.checkedIn ? 1 : 0;
}

function isApprovedPayment(status: string) {
  return ['approved', 'paid', 'completed', 'authorized'].includes(status);
}

function emptyStats(): EventStats {
  return {
    enrollments: 0,
    attendees: 0,
    approved: 0,
    pendingPayments: 0,
    checkins: 0,
  };
}

function getTenantId(ctx: ServerAuthContext) {
  return asText(ctx.userProfile?.tenantId, DEFAULT_TENANT_ID) || DEFAULT_TENANT_ID;
}

function getUserProfile(ctx: ServerAuthContext) {
  if (!ctx.authUser || !ctx.userProfile) return null;
  return {
    id: ctx.authUser.uid,
    uid: ctx.authUser.uid,
    email: ctx.authUser.email,
    ...ctx.userProfile,
  };
}

async function readEvents(tenantId: string, includeOperationalDrafts: boolean) {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.events)
    .limit(500)
    .get();

  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as FirestoreRow)
    .filter(event => {
      const eventTenantId = asText(event.tenantId);
      const status = asText(event.status, 'approved') || 'approved';

      if (eventTenantId && eventTenantId !== tenantId) return false;
      if (!eventTenantId && tenantId !== DEFAULT_TENANT_ID) return false;
      if (!includeOperationalDrafts && status !== 'approved') return false;

      return true;
    });
}

async function readTenantEnrollments(tenantId: string) {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.eventEnrollments)
    .where('tenantId', '==', tenantId)
    .limit(1000)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FirestoreRow);
}

async function readUserEnrollments(userId: string, tenantId: string) {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.eventEnrollments)
    .where('userId', '==', userId)
    .limit(200)
    .get();

  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as FirestoreRow)
    .filter(enrollment => {
      const enrollmentTenantId = asText(enrollment.tenantId);
      return !enrollmentTenantId || enrollmentTenantId === tenantId;
    });
}

function buildStats(enrollments: FirestoreRow[]) {
  const statsByEvent = new Map<string, EventStats>();

  for (const enrollment of enrollments) {
    const eventId = asText(enrollment.eventId);
    if (!eventId) continue;

    const stats = statsByEvent.get(eventId) || emptyStats();
    const paymentStatus = asText(enrollment.paymentStatus, 'approved');

    stats.enrollments += 1;
    stats.attendees += attendeeCount(enrollment);
    stats.checkins += checkedInCount(enrollment);

    if (isApprovedPayment(paymentStatus)) {
      stats.approved += 1;
    }

    if (paymentStatus === 'pending') {
      stats.pendingPayments += 1;
    }

    statsByEvent.set(eventId, stats);
  }

  return statsByEvent;
}

export async function getEventsOverview(ctx: ServerAuthContext = {}) {
  const tenantId = getTenantId(ctx);
  const userProfile = getUserProfile(ctx);
  const canManageEvents = Boolean(
    userProfile
    && (ctx.authUser?.email === OWNER_EMAIL || can(userProfile, 'manage:events')),
  );

  const events = await readEvents(tenantId, canManageEvents);
  const enrollments = canManageEvents
    ? await readTenantEnrollments(tenantId)
    : ctx.authUser?.uid
      ? await readUserEnrollments(ctx.authUser.uid, tenantId)
      : [];

  const statsByEvent = buildStats(enrollments);
  const today = new Date().toISOString().slice(0, 10);
  const sortedEvents = [...events].sort((a, b) => eventSortKey(a) - eventSortKey(b));
  const upcomingEvents = sortedEvents.filter(event => toDateLabel(event.date, today) >= today);

  const nextEvents = upcomingEvents.slice(0, 8).map(event => {
    const stats = statsByEvent.get(event.id);
    const capacity = asNumber(event.capacity);
    const enrolled = stats?.attendees || asNumber(event.enrolled);
    const status = asText(event.status, 'approved') || 'approved';

    return {
      id: event.id,
      title: asText(event.title, 'Evento Coroado'),
      date: toDateLabel(event.date),
      time: asText(event.time, '19:30'),
      location: asText(event.location, 'Campus Sede'),
      type: asText(event.category || event.type, 'Geral'),
      status,
      capacity,
      enrolled,
      availableSeats: capacity > 0 ? Math.max(capacity - enrolled, 0) : null,
      isPaid: Boolean(event.isPaid),
      price: asNumber(event.price),
      requiresRegistration: event.requiresRegistration !== false,
      description: asText(event.description, ''),
      image: asText(event.image, ''),
      pendingPayments: canManageEvents ? stats?.pendingPayments || 0 : 0,
      checkins: canManageEvents ? stats?.checkins || 0 : 0,
    };
  });

  const operationalStats = Array.from(statsByEvent.values());
  const totalEnrollments = operationalStats.reduce((sum, stats) => sum + stats.enrollments, 0);
  const totalAttendees = operationalStats.reduce((sum, stats) => sum + stats.attendees, 0);
  const approvedEnrollments = operationalStats.reduce((sum, stats) => sum + stats.approved, 0);
  const pendingPayments = canManageEvents
    ? operationalStats.reduce((sum, stats) => sum + stats.pendingPayments, 0)
    : 0;
  const checkins = canManageEvents
    ? operationalStats.reduce((sum, stats) => sum + stats.checkins, 0)
    : 0;

  const openSeats = nextEvents.reduce((sum, event) => {
    return event.availableSeats === null ? sum : sum + event.availableSeats;
  }, 0);

  const paymentPendingEvents = canManageEvents
    ? nextEvents
      .filter(event => event.pendingPayments > 0)
      .map(event => ({
        id: event.id,
        title: event.title,
        date: event.date,
        pendingPayments: event.pendingPayments,
      }))
    : [];

  const myTickets = !canManageEvents
    ? enrollments.slice(0, 8).map(enrollment => {
      const event = events.find(item => item.id === enrollment.eventId);
      return {
        id: enrollment.id,
        eventId: asText(enrollment.eventId),
        eventTitle: asText(event?.title, 'Evento Coroado'),
        eventDate: toDateLabel(event?.date),
        paymentStatus: asText(enrollment.paymentStatus, 'approved'),
        checkedIn: Boolean(enrollment.checkedIn),
      };
    })
    : [];

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    scope: canManageEvents ? 'manager' : ctx.authUser ? 'member' : 'public',
    totals: {
      totalEvents: events.length,
      upcomingEvents: upcomingEvents.length,
      paidEvents: events.filter(event => Boolean(event.isPaid)).length,
      openSeats,
      totalEnrollments: canManageEvents ? totalEnrollments : myTickets.length,
      totalAttendees: canManageEvents ? totalAttendees : myTickets.length,
      approvedEnrollments: canManageEvents ? approvedEnrollments : myTickets.filter(ticket => isApprovedPayment(ticket.paymentStatus)).length,
      pendingPayments,
      checkins,
      checkinRate: approvedEnrollments > 0 ? Math.round((checkins / approvedEnrollments) * 100) : 0,
    },
    nextEvents,
    myTickets,
    paymentPendingEvents,
  };
}

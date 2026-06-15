import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client, type ClientConfig } from 'pg';
import { COLLECTIONS } from '../src/lib/domain';
import { getAdminDb } from '../src/server/context';

type Row = Record<string, unknown>;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const applySchema = args.has('--apply-schema');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 5000;
const databaseUrl = process.env.DATABASE_URL || process.env.CLOUD_SQL_DATABASE_URL || '';
const cloudSqlConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME || 'gen-lang-client-0529830528:us-east1:gen-lang-client-0529830528-instance';
const cloudSqlDatabase = process.env.CLOUD_SQL_DATABASE || 'gen-lang-client-0529830528-database';
const cloudSqlUser = process.env.CLOUD_SQL_USER || process.env.DB_USER || '';
const cloudSqlPassword = process.env.CLOUD_SQL_PASSWORD || process.env.DB_PASSWORD || '';
const cloudSqlHost = process.env.CLOUD_SQL_HOST || process.env.DB_HOST || '';
const cloudSqlPort = Number(process.env.CLOUD_SQL_PORT || process.env.DB_PORT || 5432);
const cloudSqlSocketDir = process.env.CLOUD_SQL_SOCKET_DIR || '/cloudsql';

function buildClientConfig(): ClientConfig | null {
  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  if (!cloudSqlUser || !cloudSqlPassword) {
    return null;
  }

  return {
    host: cloudSqlHost || path.join(cloudSqlSocketDir, cloudSqlConnectionName),
    port: cloudSqlHost ? cloudSqlPort : undefined,
    database: cloudSqlDatabase,
    user: cloudSqlUser,
    password: cloudSqlPassword,
  };
}

function toIso(value: any) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function toDate(value: any) {
  const iso = toIso(value) || String(value || '');
  return iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function asNumber(value: any) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function asText(value: any, fallback = '') {
  return String(value ?? fallback).trim();
}

async function readCollection(name: string) {
  const snap = await getAdminDb().collection(name).limit(limit).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function upsert(client: Client, table: string, key: string, row: Row) {
  const columns = Object.keys(row);
  const values = Object.values(row);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const updates = columns
    .filter(column => column !== key)
    .map(column => `${column} = excluded.${column}`)
    .join(', ');

  await client.query(
    `insert into ${table} (${columns.join(', ')}) values (${placeholders}) on conflict (${key}) do update set ${updates}`,
    values,
  );
}

async function applySqlSchema(client: Client) {
  const sqlPath = path.join(process.cwd(), 'docs', 'sql-bi', 'coroado_finance_indicators_model.sql');
  const sql = await readFile(sqlPath, 'utf8');
  await client.query(sql);
}

async function syncDimensions(client: Client) {
  const units = await readCollection(COLLECTIONS.units);
  for (const unit of units as any[]) {
    await upsert(client, 'coroado_bi.dim_tenant', 'tenant_id', {
      tenant_id: asText(unit.id || unit.tenantId, 'tenant-1'),
      name: asText(unit.name, 'Igreja Coroado'),
      city: asText(unit.city),
      state: asText(unit.state),
      created_at: toIso(unit.createdAt),
      updated_at: toIso(unit.updatedAt),
    });
  }

  await upsert(client, 'coroado_bi.dim_tenant', 'tenant_id', {
    tenant_id: 'tenant-1',
    name: 'Igreja Coroado',
    city: '',
    state: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const users = await readCollection(COLLECTIONS.users);
  for (const user of users as any[]) {
    await upsert(client, 'coroado_bi.dim_member', 'member_id', {
      member_id: user.id,
      tenant_id: asText(user.tenantId, 'tenant-1'),
      name: asText(user.name || user.displayName),
      email: asText(user.email),
      primary_role: Array.isArray(user.roles) ? asText(user.roles[0]) : asText(user.role),
      cell_id: asText(user.cellId),
      ministry_id: asText(user.ministryId),
      is_approved: Boolean(user.isApproved),
      created_at: toIso(user.createdAt),
      updated_at: toIso(user.updatedAt),
    });
  }

  const courses = await readCollection(COLLECTIONS.courses);
  for (const course of courses as any[]) {
    await upsert(client, 'coroado_bi.dim_course', 'course_id', {
      course_id: course.id,
      tenant_id: asText(course.tenantId, 'tenant-1'),
      title: asText(course.title, 'Curso'),
      category: asText(course.category),
      status: asText(course.status),
      is_subscription_only: Boolean(course.isSubscriptionOnly),
      monthly_price: asNumber(course.monthlyPrice),
      created_at: toIso(course.createdAt),
      updated_at: toIso(course.updatedAt),
    });
  }

  const events = await readCollection(COLLECTIONS.events);
  for (const event of events as any[]) {
    await upsert(client, 'coroado_bi.dim_event', 'event_id', {
      event_id: event.id,
      tenant_id: asText(event.tenantId, 'tenant-1'),
      title: asText(event.title, 'Evento'),
      category: asText(event.category || event.type),
      starts_at: toIso(event.date),
      capacity: Math.round(asNumber(event.capacity)),
      is_paid: Boolean(event.isPaid),
      price: asNumber(event.price),
      status: asText(event.status),
      created_at: toIso(event.createdAt),
      updated_at: toIso(event.updatedAt),
    });
  }

  return { units: units.length, users: users.length, courses: courses.length, events: events.length };
}

async function syncFacts(client: Client) {
  const paymentEvents = await readCollection(COLLECTIONS.paymentEvents);
  for (const event of paymentEvents as any[]) {
    await upsert(client, 'coroado_bi.fact_payment_event', 'payment_event_id', {
      payment_event_id: event.id,
      provider: asText(event.provider),
      provider_payment_id: asText(event.paymentId),
      reference_id: asText(event.referenceId),
      target_type: asText(event.targetType),
      tenant_id: asText(event.tenantId, 'tenant-1'),
      status: asText(event.status),
      amount: asNumber(event.amount),
      received_at: toIso(event.receivedAt),
      raw_payload: event.raw ? JSON.stringify(event.raw) : null,
    });
  }

  const transactions = await readCollection(COLLECTIONS.transactions);
  for (const tx of transactions as any[]) {
    await upsert(client, 'coroado_bi.fact_transaction', 'transaction_id', {
      transaction_id: tx.id,
      tenant_id: asText(tx.tenantId, 'tenant-1'),
      member_id: asText(tx.userId),
      source: asText(tx.source, 'firestore'),
      type: asText(tx.type),
      item_id: asText(tx.itemId),
      status: asText(tx.status),
      method: asText(tx.method),
      amount: asNumber(tx.amount),
      transaction_date: toDate(tx.date || tx.createdAt),
      payment_id: asText(tx.paymentId),
      reconciled_at: toIso(tx.reconciledAt),
      reconciled_by: asText(tx.reconciledBy),
      reconciliation_note: asText(tx.reconciliationNote),
      created_at: toIso(tx.createdAt),
      updated_at: toIso(tx.updatedAt),
    });
  }

  const orders = await readCollection(COLLECTIONS.orders);
  for (const order of orders as any[]) {
    await upsert(client, 'coroado_bi.fact_order', 'order_id', {
      order_id: order.id,
      tenant_id: asText(order.tenantId, 'tenant-1'),
      member_id: asText(order.userId),
      status: asText(order.status),
      payment_status: asText(order.paymentStatus),
      payment_method: asText(order.paymentMethod),
      total: asNumber(order.total),
      item_count: Array.isArray(order.items) ? order.items.length : 0,
      created_at: toIso(order.createdAt),
      updated_at: toIso(order.updatedAt),
    });
  }

  const eventEnrollments = await readCollection(COLLECTIONS.eventEnrollments);
  for (const enrollment of eventEnrollments as any[]) {
    await upsert(client, 'coroado_bi.fact_event_enrollment', 'enrollment_id', {
      enrollment_id: enrollment.id,
      tenant_id: asText(enrollment.tenantId, 'tenant-1'),
      event_id: asText(enrollment.eventId),
      member_id: asText(enrollment.userId),
      payment_status: asText(enrollment.paymentStatus),
      checked_in: Boolean(enrollment.checkedIn),
      checked_in_at: toIso(enrollment.checkedInAt),
      kids_count: Array.isArray(enrollment.kids) ? enrollment.kids.length : 0,
      created_at: toIso(enrollment.createdAt),
      updated_at: toIso(enrollment.updatedAt),
    });
  }

  const cellReports = await readCollection(COLLECTIONS.cellReports);
  for (const report of cellReports as any[]) {
    await upsert(client, 'coroado_bi.fact_cell_report', 'report_id', {
      report_id: report.id,
      tenant_id: asText(report.tenantId, 'tenant-1'),
      cell_id: asText(report.cellId),
      report_date: toDate(report.date || report.createdAt),
      meeting_type: asText(report.meetingType || report.type),
      present_count: Math.round(asNumber(report.present)),
      visitor_count: Math.round(asNumber(report.visitors)),
      created_by: asText(report.createdBy),
      created_at: toIso(report.createdAt),
      updated_at: toIso(report.updatedAt),
    });
  }

  const lessons = await readCollection(COLLECTIONS.lessons);
  const totalLessonsByCourse = new Map<string, number>();
  for (const lesson of lessons as any[]) {
    const courseId = asText(lesson.courseId);
    totalLessonsByCourse.set(courseId, (totalLessonsByCourse.get(courseId) || 0) + 1);
  }

  const enrollments = await readCollection(COLLECTIONS.enrollments);
  for (const enrollment of enrollments as any[]) {
    const completed = Array.isArray(enrollment.completedLessons) ? enrollment.completedLessons.length : 0;
    const total = totalLessonsByCourse.get(asText(enrollment.courseId)) || completed || 0;
    await upsert(client, 'coroado_bi.fact_school_progress', 'enrollment_id', {
      enrollment_id: enrollment.id,
      tenant_id: asText(enrollment.tenantId, 'tenant-1'),
      course_id: asText(enrollment.courseId),
      member_id: asText(enrollment.userId),
      completed_lessons: completed,
      total_lessons: total,
      progress_percent: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
      status: asText(enrollment.status),
      updated_at: toIso(enrollment.updatedAt),
    });
  }

  const subscriptions = await readCollection(COLLECTIONS.subscriptions);
  for (const subscription of subscriptions as any[]) {
    await upsert(client, 'coroado_bi.fact_subscription', 'subscription_id', {
      subscription_id: subscription.id,
      tenant_id: asText(subscription.tenantId, 'tenant-1'),
      member_id: asText(subscription.userId || subscription.memberId),
      provider: asText(subscription.provider, 'mercadopago'),
      provider_subscription_id: asText(subscription.mpSubscriptionId || subscription.providerSubscriptionId),
      status: asText(subscription.status, 'pending'),
      amount: asNumber(subscription.amount),
      source: asText(subscription.source, 'school_subscription'),
      created_at: toIso(subscription.createdAt),
      updated_at: toIso(subscription.updatedAt),
    });
  }

  const learningAccess = await readCollection(COLLECTIONS.learningAccess);
  for (const access of learningAccess as any[]) {
    await upsert(client, 'coroado_bi.fact_learning_access', 'access_id', {
      access_id: access.id,
      tenant_id: asText(access.tenantId, 'tenant-1'),
      member_id: asText(access.userId || access.memberId),
      target_type: asText(access.targetType),
      target_id: asText(access.targetId),
      course_id: asText(access.courseId),
      order_id: asText(access.orderId),
      status: asText(access.status, 'active'),
      source: asText(access.source, 'mercadopago_webhook'),
      created_at: toIso(access.createdAt),
      updated_at: toIso(access.updatedAt),
    });
  }

  return {
    paymentEvents: paymentEvents.length,
    transactions: transactions.length,
    orders: orders.length,
    eventEnrollments: eventEnrollments.length,
    cellReports: cellReports.length,
    enrollments: enrollments.length,
    subscriptions: subscriptions.length,
    learningAccess: learningAccess.length,
  };
}

async function main() {
  const clientConfig = buildClientConfig();

  if (!clientConfig) {
    if (dryRun) {
      console.log(JSON.stringify({
        ok: true,
        dryRun: true,
        message: 'Credenciais SQL ausentes; schema e upserts nao foram executados.',
        cloudSql: {
          connectionName: cloudSqlConnectionName,
          database: cloudSqlDatabase,
          hostMode: cloudSqlHost ? 'tcp' : 'cloudsql-socket',
        },
      }, null, 2));
      return;
    }

    throw new Error('Informe DATABASE_URL/CLOUD_SQL_DATABASE_URL ou CLOUD_SQL_USER + CLOUD_SQL_PASSWORD para sincronizar SQL/BI.');
  }

  const client = new Client(clientConfig);

  await client.connect();

  try {
    if (applySchema) {
      await applySqlSchema(client);
      console.log('sync-bi-schema-ok');
    }

    if (dryRun) {
      console.log('sync-bi-dry-run: conexao SQL validada; sem upserts.');
      return;
    }

    const dimensions = await syncDimensions(client);
    const facts = await syncFacts(client);

    console.log(JSON.stringify({ ok: true, dimensions, facts }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error('sync-bi-failed', error);
  process.exitCode = 1;
});

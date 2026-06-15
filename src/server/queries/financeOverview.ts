import { can } from '../../lib/permissions';
import { COLLECTIONS } from '../../lib/domain';
import { DEFAULT_TENANT_ID, getAdminDb, type ServerAuthContext } from '../context';
import { OperationError } from '../operations';

type FirestoreRow = FirebaseFirestore.DocumentData & { id: string };

function asNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function asText(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
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
  if (typeof value === 'string' && value) return value.slice(0, 10);
  const millis = toMillis(value);
  return millis > 0 ? new Date(millis).toISOString().slice(0, 10) : fallback;
}

async function readTenantCollection(collectionName: string, tenantId: string) {
  const snap = await getAdminDb()
    .collection(collectionName)
    .where('tenantId', '==', tenantId)
    .limit(500)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FirestoreRow);
}

export async function getFinanceOverview(ctx: ServerAuthContext) {
  if (!ctx.authUser || !ctx.userProfile) {
    throw new OperationError(401, 'Autenticacao obrigatoria');
  }

  const userProfile = {
    id: ctx.authUser.uid,
    uid: ctx.authUser.uid,
    ...ctx.userProfile,
  };

  if (!can(userProfile, 'view:finance')) {
    throw new OperationError(403, 'Permissao insuficiente');
  }

  const tenantId = asText(ctx.userProfile.tenantId, DEFAULT_TENANT_ID) || DEFAULT_TENANT_ID;
  const [transactions, campaigns, plans, subscriptions] = await Promise.all([
    readTenantCollection(COLLECTIONS.transactions, tenantId),
    readTenantCollection(COLLECTIONS.campaigns, tenantId),
    readTenantCollection(COLLECTIONS.plans, tenantId),
    readTenantCollection(COLLECTIONS.subscriptions, tenantId),
  ]);

  const completedTransactions = transactions.filter(tx => asText(tx.status) === 'completed');
  const pendingTransactions = transactions.filter(tx => asText(tx.status) === 'pending');
  const subscriptionTransactions = completedTransactions.filter(tx => asText(tx.type) === 'subscription');
  const activeSubscriptionDocs = subscriptions.filter(subscription => ['active', 'authorized'].includes(asText(subscription.status)));

  const totalRevenue = completedTransactions.reduce((sum, tx) => sum + asNumber(tx.amount), 0);
  const pendingRevenue = pendingTransactions.reduce((sum, tx) => sum + asNumber(tx.amount), 0);
  const mrrFromTransactions = subscriptionTransactions.reduce((sum, tx) => sum + asNumber(tx.amount), 0);
  const mrrFromSubscriptions = activeSubscriptionDocs.reduce((sum, subscription) => sum + asNumber(subscription.amount), 0);
  const activeSubscribers = new Set([
    ...subscriptionTransactions.map(tx => asText(tx.userId)).filter(Boolean),
    ...activeSubscriptionDocs.map(subscription => asText(subscription.userId)).filter(Boolean),
  ]).size;

  const campaignTarget = campaigns.reduce((sum, campaign) => sum + asNumber(campaign.target), 0);
  const campaignRaised = campaigns.reduce((sum, campaign) => sum + asNumber(campaign.current), 0);

  const latestTransactions = [...transactions]
    .sort((a, b) => toMillis(b.createdAt || b.updatedAt || b.date) - toMillis(a.createdAt || a.updatedAt || a.date))
    .slice(0, 8)
    .map(tx => ({
      id: tx.id,
      userName: asText(tx.userName, 'Membro'),
      type: asText(tx.type, 'contribuicao'),
      status: asText(tx.status, 'pending'),
      method: asText(tx.method, 'nao informado'),
      amount: asNumber(tx.amount),
      date: toDateLabel(tx.date || tx.createdAt),
    }));

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totals: {
      totalRevenue,
      pendingRevenue,
      recurringRevenue: mrrFromSubscriptions || mrrFromTransactions,
      activeSubscribers,
      transactionCount: transactions.length,
      pendingCount: pendingTransactions.length,
      campaignCount: campaigns.length,
      planCount: plans.length,
      campaignTarget,
      campaignRaised,
    },
    latestTransactions,
  };
}

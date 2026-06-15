import { initTRPC, TRPCError } from '@trpc/server';
import { getAdminDb, ServerAuthContext } from '../context';
import { COLLECTIONS } from '../../lib/domain';

const t = initTRPC.context<ServerAuthContext>().create();

function toMillis(value: any) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export const gestaoRouter = t.router({
  getKpis: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const db = getAdminDb();
    const tenantId = ctx.auth.tenantId;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    const [membersSnap, cellsSnap, reportsSnap] = await Promise.all([
      db.collection(COLLECTIONS.users).where('tenantId', '==', tenantId).get(),
      db.collection(COLLECTIONS.cells).where('tenantId', '==', tenantId).get(),
      db.collection(COLLECTIONS.cellReports).where('tenantId', '==', tenantId).get(),
    ]);

    const members = membersSnap.docs.map(doc => doc.data());
    const cells = cellsSnap.docs.map(doc => doc.data());
    const reports = reportsSnap.docs.map(doc => doc.data());
    const currentMonthMembers = members.filter(member => toMillis(member.createdAt) >= currentMonthStart).length;
    const previousMonthMembers = members.filter(member => {
      const createdAt = toMillis(member.createdAt);
      return createdAt >= previousMonthStart && createdAt < currentMonthStart;
    }).length;
    const activeCells = cells.filter(cell => !['inactive', 'archived', 'closed'].includes(String(cell.status || '').toLowerCase())).length;
    const activeMembers = members.filter(member => member.isApproved !== false).length;
    const recentReports = reports.filter(report => toMillis(report.createdAt || report.date) >= now.getTime() - 30 * 24 * 60 * 60 * 1000).length;

    return {
      totalMembers: members.length,
      activeCells,
      monthlyGrowth: previousMonthMembers > 0
        ? Math.round(((currentMonthMembers - previousMonthMembers) / previousMonthMembers) * 1000) / 10
        : currentMonthMembers > 0 ? 100 : 0,
      engagementRate: members.length > 0 ? Math.round((activeMembers / members.length) * 1000) / 10 : 0,
      recentCellReports: recentReports,
    };
  }),

  // Action Plans Hierarchy (Tree view)
  getActionPlansTree: t.procedure.query(async ({ ctx }) => {
    const db = getAdminDb();
    let query = db.collection('action_plans') as any;
    
    if (ctx.auth?.tenantId) {
      query = query.where('tenantId', '==', ctx.auth.tenantId);
    }

    const snap = await query.get();
    const plans = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Group by group_department (Nível 1), then root_problem (Nível 2)
    const tree: any = {};
    
    for (const plan of plans) {
      const dept = plan.group_department || 'Geral';
      const prob = plan.root_problem || 'Não Classificado';
      
      if (!tree[dept]) tree[dept] = {};
      if (!tree[dept][prob]) tree[dept][prob] = [];
      
      tree[dept][prob].push(plan);
    }

    return tree;
  }),
});

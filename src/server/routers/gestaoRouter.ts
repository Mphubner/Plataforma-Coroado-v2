import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { ServerAuthContext } from '../context';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const t = initTRPC.context<ServerAuthContext>().create();

export const gestaoRouter = t.router({
  getKpis: t.procedure.query(async ({ ctx }) => {
    // Basic mock KPIs for now
    return {
      totalMembers: 125,
      activeCells: 12,
      monthlyGrowth: 5.2,
      engagementRate: 88,
    };
  }),

  // Action Plans Hierarchy (Tree view)
  getActionPlansTree: t.procedure.query(async ({ ctx }) => {
    const db = getFirestore();
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

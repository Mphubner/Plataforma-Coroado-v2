import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { ServerAuthContext } from '../context';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const t = initTRPC.context<ServerAuthContext>().create();

export const cellsRouter = t.router({
  getCells: t.procedure.query(async ({ ctx }) => {
    const db = getFirestore();
    let query = db.collection('cells') as any;
    
    // If user is authenticated and part of a tenant, scope to tenant
    if (ctx.auth?.tenantId) {
      query = query.where('tenantId', '==', ctx.auth.tenantId);
    }

    const snap = await query.get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }),

  getCellById: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getFirestore();
      const doc = await db.collection('cells').doc(input.id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    }),
});

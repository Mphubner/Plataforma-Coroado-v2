import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { ServerAuthContext } from '../context';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const t = initTRPC.context<ServerAuthContext>().create();

export const eventsRouter = t.router({
  getEvents: t.procedure.query(async ({ ctx }) => {
    const db = getFirestore();
    let query = db.collection('events').orderBy('event_date', 'asc') as any;
    
    // For multitenancy if applicable
    if (ctx.auth?.tenantId) {
      query = query.where('tenantId', '==', ctx.auth.tenantId);
    }

    const snap = await query.get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }),

  createEvent: t.procedure
    .input(z.object({
      title: z.string(),
      event_date: z.string(),
      description: z.string().optional(),
      season: z.string().optional(),
      color_hex: z.string().optional(),
      visibility: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });

      // Require some privileged role (pastor/admin) to create events
      const hasPrivilege = ctx.auth.roles?.some((r: string) => ['admin', 'pastor', 'supervisor'].includes(r));
      if (!hasPrivilege) throw new TRPCError({ code: 'FORBIDDEN' });

      const db = getFirestore();
      const newRef = db.collection('events').doc();
      await newRef.set({
        ...input,
        tenantId: ctx.auth.tenantId || 'tenant-1',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: newRef.id };
    }),
});

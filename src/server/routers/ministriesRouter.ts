import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { ServerAuthContext } from '../context';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const t = initTRPC.context<ServerAuthContext>().create();

export const ministriesRouter = t.router({
  list: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid || !ctx.auth?.tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    const db = getFirestore();
    const snap = await db.collection('ministries').where('tenantId', '==', ctx.auth.tenantId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }),

  getDetails: t.procedure
    .input(z.object({ ministryId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      
      const [scalesSnap, briefingsSnap, membersSnap] = await Promise.all([
        db.collection('scales').where('tenantId', '==', ctx.auth.tenantId).where('ministryId', '==', input.ministryId).get(),
        db.collection('briefings').where('tenantId', '==', ctx.auth.tenantId).where('ministryId', '==', input.ministryId).get(),
        db.collection('users').where('tenantId', '==', ctx.auth.tenantId).where('ministryId', '==', input.ministryId).get()
      ]);

      return {
        scales: scalesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        briefings: briefingsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        members: membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      };
    }),

  create: t.procedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      leaderName: z.string(),
      icon: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      
      const db = getFirestore();
      const ref = db.collection('ministries').doc();
      await ref.set({
        ...input,
        leaderId: ctx.auth.uid,
        tenantId: ctx.auth.tenantId,
        createdAt: FieldValue.serverTimestamp()
      });
      return { id: ref.id };
    }),

  updateBriefingStatus: t.procedure
    .input(z.object({
      briefingId: z.string(),
      status: z.string(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      await db.collection('briefings').doc(input.briefingId).update({
        status: input.status,
        ...(input.reason ? { reason: input.reason } : {}),
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: true };
    }),

  updateScaleAssignments: t.procedure
    .input(z.object({
      scaleId: z.string(),
      assignments: z.array(z.any())
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      await db.collection('scales').doc(input.scaleId).update({
        assignments: input.assignments,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: true };
    })
});

import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { ServerAuthContext } from '../context';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const t = initTRPC.context<ServerAuthContext>().create();

export const pastorsRouter = t.router({
  getPastors: t.procedure.query(async ({ ctx }) => {
    const db = getFirestore();
    let query = db.collection('pastors') as any;
    if (ctx.auth?.tenantId) {
      query = query.where('tenantId', '==', ctx.auth.tenantId);
    }
    const snap = await query.get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }),

  savePastor: t.procedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string(),
      role: z.string(),
      image: z.string(),
      social: z.object({
        facebook: z.string(),
        instagram: z.string(),
        youtube: z.string(),
      }),
      availableTimes: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      const { id, ...data } = input;
      const docData = {
        ...data,
        tenantId: ctx.auth.tenantId,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (id && !['rafael', 'fabricio', 'alan'].includes(id)) {
        await db.collection('pastors').doc(id).update(docData);
        return { id };
      } else {
        const ref = db.collection('pastors').doc();
        await ref.set({ ...docData, createdAt: FieldValue.serverTimestamp() });
        return { id: ref.id };
      }
    }),

  deletePastor: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      if (['rafael', 'fabricio', 'alan'].includes(input.id)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Pastores padrão mockados não podem ser excluídos.' });
      }
      const db = getFirestore();
      await db.collection('pastors').doc(input.id).delete();
      return { success: true };
    }),

  getAppointments: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const db = getFirestore();
    const snap = await db.collection('pastoral_appointments')
      .where('tenantId', '==', ctx.auth.tenantId)
      .get();
    
    let apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const isAdmin = ctx.auth.roles?.includes('admin');
    const isPastor = ctx.auth.roles?.includes('pastor') || ctx.auth.roles?.includes('networkPastor') || ctx.auth.roles?.includes('auxPastor') || ctx.auth.roles?.includes('seniorPastor');
    
    // In actual implementation, we might filter here for the pastor themselves if not an admin.
    if (!isAdmin && isPastor) {
      apps = apps.filter((a: any) => a.pastorId === ctx.auth?.uid);
    }

    return apps;
  }),

  updateAppointmentStatus: t.procedure
    .input(z.object({
      id: z.string(),
      status: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      await db.collection('pastoral_appointments').doc(input.id).update({
        status: input.status,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: true };
    }),

  getTasks: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const db = getFirestore();
    const snap = await db.collection('tasks')
      .where('tenantId', '==', ctx.auth.tenantId)
      .where('tag', '==', 'Pastoral')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }),

  updateTaskStatus: t.procedure
    .input(z.object({
      id: z.string(),
      status: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      await db.collection('tasks').doc(input.id).update({
        status: input.status,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: true };
    }),
});

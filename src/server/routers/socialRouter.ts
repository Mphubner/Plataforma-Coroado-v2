import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { ServerAuthContext } from '../context';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const t = initTRPC.context<ServerAuthContext>().create();

const COLLECTIONS = {
  socialProfessionals: 'social_professionals',
  socialAppointments: 'social_appointments',
};

export const socialRouter = t.router({
  getPublicProfessionals: t.procedure.query(async () => {
    const db = getFirestore();
    const snap = await db.collection(COLLECTIONS.socialProfessionals).where('isPublic', '==', true).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }),

  getAllProfessionals: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const db = getFirestore();
    const snap = await db.collection(COLLECTIONS.socialProfessionals).where('tenantId', '==', ctx.auth.tenantId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }),

  saveProfessional: t.procedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string(),
      specialty: z.string(),
      email: z.string(),
      photoUrl: z.string(),
      isPublic: z.boolean(),
      price: z.number().nullable().optional(),
      availableTimes: z.array(z.string()).optional(),
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

      if (id) {
        await db.collection(COLLECTIONS.socialProfessionals).doc(id).update(docData);
        return { id };
      } else {
        const ref = db.collection(COLLECTIONS.socialProfessionals).doc();
        await ref.set({ ...docData, createdAt: FieldValue.serverTimestamp() });
        return { id: ref.id };
      }
    }),

  deleteProfessional: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      await db.collection(COLLECTIONS.socialProfessionals).doc(input.id).delete();
      return { success: true };
    }),

  getAppointments: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const db = getFirestore();
    const snap = await db.collection(COLLECTIONS.socialAppointments).where('tenantId', '==', ctx.auth.tenantId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }),

  createAppointment: t.procedure
    .input(z.object({
      professionalId: z.string(),
      professionalName: z.string(),
      specialty: z.string(),
      date: z.string(),
      time: z.string(),
      price: z.number().nullable().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      
      // Get the user name from auth context if needed or from user record
      const userRef = await db.collection('users').doc(ctx.auth.uid).get();
      const userName = userRef.exists ? userRef.data()?.name || 'Usuário' : 'Usuário';

      const docData = {
        ...input,
        userId: ctx.auth.uid,
        userName,
        status: 'pending',
        tenantId: ctx.auth.tenantId,
        createdAt: FieldValue.serverTimestamp(),
      };

      const ref = db.collection(COLLECTIONS.socialAppointments).doc();
      await ref.set(docData);
      return { id: ref.id };
    }),

  updateAppointmentStatus: t.procedure
    .input(z.object({
      id: z.string(),
      status: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = getFirestore();
      await db.collection(COLLECTIONS.socialAppointments).doc(input.id).update({
        status: input.status,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: true };
    })
});

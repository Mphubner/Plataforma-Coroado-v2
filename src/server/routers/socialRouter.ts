import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { getAdminDb, ServerAuthContext } from '../context';
import { FieldValue } from 'firebase-admin/firestore';

const t = initTRPC.context<ServerAuthContext>().create();

const COLLECTIONS = {
  socialProfessionals: 'social_professionals',
  socialAppointments: 'social_appointments',
};
const SOCIAL_ADMIN_ROLES = ['admin', 'seniorPastor', 'networkPastor', 'auxPastor'];

function requireSocialAdmin(ctx: ServerAuthContext) {
  if (!ctx.auth?.uid || !ctx.auth.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (!ctx.auth.roles?.some(role => SOCIAL_ADMIN_ROLES.includes(role))) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
}

export const socialRouter = t.router({
  getPublicProfessionals: t.procedure.query(async () => {
    const db = getAdminDb();
    const snap = await db.collection(COLLECTIONS.socialProfessionals).where('isPublic', '==', true).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }),

  getAllProfessionals: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const db = getAdminDb();
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
      requireSocialAdmin(ctx);
      const db = getAdminDb();
      
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
      requireSocialAdmin(ctx);
      const db = getAdminDb();
      const ref = db.collection(COLLECTIONS.socialProfessionals).doc(input.id);
      const snap = await ref.get();
      if (snap.exists && snap.data()?.tenantId !== ctx.auth?.tenantId) throw new TRPCError({ code: 'FORBIDDEN' });
      await ref.delete();
      return { success: true };
    }),

  getAppointments: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid || !ctx.auth?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const db = getAdminDb();
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
      const db = getAdminDb();
      
      // Get the user name from auth context if needed or from user record
      const userRef = await db.collection('users').doc(ctx.auth.uid).get();
      const userName = userRef.exists ? userRef.data()?.name || 'Usuário' : 'Usuário';

      const docData = {
        ...input,
        userId: ctx.auth.uid,
        userName,
        status: 'pending',
        paymentStatus: input.price ? 'pending' : 'not_required',
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
      requireSocialAdmin(ctx);
      const db = getAdminDb();
      const ref = db.collection(COLLECTIONS.socialAppointments).doc(input.id);
      const snap = await ref.get();
      if (!snap.exists) throw new TRPCError({ code: 'NOT_FOUND' });
      if (snap.data()?.tenantId !== ctx.auth?.tenantId) throw new TRPCError({ code: 'FORBIDDEN' });
      await ref.update({
        status: input.status,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: true };
    })
});

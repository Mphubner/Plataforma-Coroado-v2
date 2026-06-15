import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { getAdminDb, ServerAuthContext } from '../context';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/src/lib/domain/collections';

const t = initTRPC.context<ServerAuthContext>().create();
const ADMIN_ROLES = ['admin', 'seniorPastor', 'networkPastor', 'auxPastor'];

function hasRole(ctx: ServerAuthContext, roles: string[]) {
  return ctx.auth?.roles?.some(role => roles.includes(role)) || false;
}

function requireAdmin(ctx: ServerAuthContext) {
  if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (!hasRole(ctx, ADMIN_ROLES)) throw new TRPCError({ code: 'FORBIDDEN' });
}

export const storeRouter = t.router({
  getProducts: t.procedure.query(async ({ ctx }) => {
    const db = getAdminDb();
    let query = db.collection('products') as any;
    if (ctx.auth?.tenantId) {
      query = query.where('tenantId', '==', ctx.auth.tenantId);
    }
    const snap = await query.get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }),

  createProduct: t.procedure
    .input(z.object({
      name: z.string(),
      price: z.number(),
      category: z.string(),
      img: z.string().optional(),
      description: z.string().optional(),
      sizes: z.array(z.string()).optional(),
      colors: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      if (!ctx.auth?.tenantId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant ausente.' });

      const db = getAdminDb();
      const newRef = db.collection('products').doc();
      await newRef.set({
        ...input,
        tenantId: ctx.auth.tenantId,
        rating: 5.0,
        reviews: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: newRef.id };
    }),

  deleteProduct: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      
      const db = getAdminDb();
      const ref = db.collection('products').doc(input.id);
      const snap = await ref.get();
      if (snap.exists && snap.data()?.tenantId !== ctx.auth?.tenantId && !hasRole(ctx, ['admin'])) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await ref.delete();
      return { success: true };
    }),

  getOrders: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const db = getAdminDb();
    let query = db.collection('orders') as any;
    if (ctx.auth?.tenantId) {
      query = query.where('tenantId', '==', ctx.auth.tenantId);
    }
    const snap = await query.get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }),

  updateOrderStatus: t.procedure
    .input(z.object({
      orderId: z.string(),
      status: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      
      const db = getAdminDb();
      const ref = db.collection('orders').doc(input.orderId);
      const snap = await ref.get();
      if (snap.exists && snap.data()?.tenantId !== ctx.auth?.tenantId && !hasRole(ctx, ['admin'])) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await ref.update({
        status: input.status,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: true };
    }),
});

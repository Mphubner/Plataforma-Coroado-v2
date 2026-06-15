import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { ServerAuthContext } from '../context';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/src/lib/domain/collections';

const t = initTRPC.context<ServerAuthContext>().create();

export const storeRouter = t.router({
  getProducts: t.procedure.query(async ({ ctx }) => {
    const db = getFirestore();
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
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const db = getFirestore();
      const newRef = db.collection('products').doc();
      await newRef.set({
        ...input,
        tenantId: ctx.auth.tenantId || 'tenant-1',
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
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      // should ideally check if user is admin here
      
      const db = getFirestore();
      await db.collection('products').doc(input.id).delete();
      return { success: true };
    }),

  getOrders: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const db = getFirestore();
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
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      
      const db = getFirestore();
      await db.collection('orders').doc(input.orderId).update({
        status: input.status,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: true };
    }),
});

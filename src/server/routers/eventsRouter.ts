import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { getAdminDb, ServerAuthContext } from '../context';
import { FieldValue } from 'firebase-admin/firestore';
import { eventCheckInRequestSchema } from '../../lib/domain';
import { checkInEventEnrollment, OperationError } from '../operations';
import { getEventsOverview } from '../queries/eventsOverview';

const t = initTRPC.context<ServerAuthContext>().create();
const EVENT_ADMIN_ROLES = ['admin', 'seniorPastor', 'networkPastor', 'auxPastor', 'ministryLeader'];

export const eventsRouter = t.router({
  overview: t.procedure.query(async ({ ctx }) => {
    try {
      return await getEventsOverview(ctx);
    } catch (error) {
      if (error instanceof OperationError) {
        throw new TRPCError({
          code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST',
          message: error.message,
        });
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Nao foi possivel carregar eventos.' });
    }
  }),

  checkIn: t.procedure
    .input(eventCheckInRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await checkInEventEnrollment(ctx, input.enrollmentId);
      } catch (error) {
        if (error instanceof OperationError) {
          throw new TRPCError({
            code: error.status === 401 ? 'UNAUTHORIZED' : error.status === 403 ? 'FORBIDDEN' : error.status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Nao foi possivel confirmar check-in.' });
      }
    }),

  getEvents: t.procedure.query(async ({ ctx }) => {
    const db = getAdminDb();
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
      const hasPrivilege = ctx.auth.roles?.some((r: string) => EVENT_ADMIN_ROLES.includes(r));
      if (!hasPrivilege) throw new TRPCError({ code: 'FORBIDDEN' });
      if (!ctx.auth.tenantId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant ausente.' });

      const db = getAdminDb();
      const newRef = db.collection('events').doc();
      await newRef.set({
        ...input,
        tenantId: ctx.auth.tenantId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: newRef.id };
    }),
});

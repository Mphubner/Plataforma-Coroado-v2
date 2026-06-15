import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import {
  eventCheckInRequestSchema,
  planRequestSchema,
  schoolProgressRequestSchema,
  transactionReconciliationRequestSchema,
} from '../lib/domain';
import { resolveFirebaseAuth, type ServerAuthContext } from './context';
import {
  checkInEventEnrollment,
  createFinancePlan,
  OperationError,
  reconcileTransaction,
  updateSchoolProgress,
} from './operations';
import { getFinanceOverview } from './queries/financeOverview';
import { getEventsOverview } from './queries/eventsOverview';
import { membersRouter } from './routers/membersRouter';
import { ministriesRouter } from './routers/ministriesRouter';
import { socialRouter } from './routers/socialRouter';
import { pastorsRouter } from './routers/pastorsRouter';
import { cellsRouter } from './routers/cellsRouter';
import { escolaRouter } from './routers/escolaRouter';
import { storeRouter } from './routers/storeRouter';
import { eventsRouter } from './routers/eventsRouter';
import { gestaoRouter } from './routers/gestaoRouter';

export async function createTrpcContext({ req }: CreateExpressContextOptions): Promise<ServerAuthContext> {
  try {
    return await resolveFirebaseAuth(req);
  } catch {
    return {};
  }
}

const t = initTRPC.context<ServerAuthContext>().create();

function toTrpcError(error: unknown): never {
  if (error instanceof OperationError) {
    const code = error.status === 401
      ? 'UNAUTHORIZED'
      : error.status === 403
        ? 'FORBIDDEN'
        : error.status === 404
          ? 'NOT_FOUND'
          : error.status === 409
            ? 'CONFLICT'
            : error.status >= 500
              ? 'INTERNAL_SERVER_ERROR'
              : 'BAD_REQUEST';

    throw new TRPCError({ code, message: error.message });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Erro interno',
  });
}

export const appRouter = t.router({
  health: t.procedure.query(() => ({ status: 'ok' })),
  events: t.router({
    overview: t.procedure.query(async ({ ctx }) => {
      try {
        return await getEventsOverview(ctx);
      } catch (error) {
        toTrpcError(error);
      }
    }),
    checkIn: t.procedure
      .input(eventCheckInRequestSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await checkInEventEnrollment(ctx, input.enrollmentId);
        } catch (error) {
          toTrpcError(error);
        }
      }),
  }),
  school: t.router({
    updateProgress: t.procedure
      .input(schoolProgressRequestSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateSchoolProgress(ctx, input);
        } catch (error) {
          toTrpcError(error);
        }
      }),
  }),
  finance: t.router({
    overview: t.procedure.query(async ({ ctx }) => {
      try {
        return await getFinanceOverview(ctx);
      } catch (error) {
        toTrpcError(error);
      }
    }),
    createPlan: t.procedure
      .input(planRequestSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createFinancePlan(ctx, input);
        } catch (error) {
          toTrpcError(error);
        }
      }),
    reconcileTransaction: t.procedure
      .input(transactionReconciliationRequestSchema.extend({
        transactionId: eventCheckInRequestSchema.shape.enrollmentId,
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await reconcileTransaction(ctx, input.transactionId, input);
        } catch (error) {
          toTrpcError(error);
        }
      }),
  }),
  members: membersRouter,
  ministries: ministriesRouter,
  social: socialRouter,
  pastors: pastorsRouter,
  cells: cellsRouter,
  escola: escolaRouter,
  store: storeRouter,
  events: eventsRouter,
  gestao: gestaoRouter,
});

export type AppRouter = typeof appRouter;

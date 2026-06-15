import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { getAdminDb, ServerAuthContext } from '../context';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/src/lib/domain/collections';

const t = initTRPC.context<ServerAuthContext>().create();
const SCHOOL_ADMIN_ROLES = ['admin', 'seniorPastor', 'networkPastor', 'auxPastor', 'teacher'];

function requireSchoolAdmin(ctx: ServerAuthContext) {
  if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (!ctx.auth.roles?.some(role => SCHOOL_ADMIN_ROLES.includes(role))) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  if (!ctx.auth.tenantId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant ausente.' });
  }
}

export const escolaRouter = t.router({
  createCourse: t.procedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      img: z.string().optional(),
      category: z.string(),
      level: z.string(),
      duration: z.string(),
      teacherId: z.string().optional(),
      status: z.enum(['Rascunho', 'Publicado']),
      tenantId: z.string(),
      requiresSubscription: z.boolean().default(true), // new field requested
    }))
    .mutation(async ({ ctx, input }) => {
      requireSchoolAdmin(ctx);
      
      const db = getAdminDb();
      const newRef = db.collection(COLLECTIONS.courses).doc();
      await newRef.set({
        ...input,
        tenantId: ctx.auth.tenantId,
        createdBy: ctx.auth.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: newRef.id };
    }),

  createModule: t.procedure
    .input(z.object({
      courseId: z.string(),
      title: z.string(),
      order: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireSchoolAdmin(ctx);
      
      const db = getAdminDb();
      const newRef = db.collection(COLLECTIONS.modules).doc();
      await newRef.set({
        ...input,
        tenantId: ctx.auth.tenantId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: newRef.id };
    }),

  createLesson: t.procedure
    .input(z.object({
      courseId: z.string(),
      moduleId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      videoUrl: z.string().optional(),
      order: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireSchoolAdmin(ctx);

      const db = getAdminDb();
      const newRef = db.collection(COLLECTIONS.lessons).doc();
      await newRef.set({
        ...input,
        tenantId: ctx.auth.tenantId,
        isFree: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: newRef.id };
    }),

  createLearningPath: t.procedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
      stage: z.string().optional(),
      courses: z.array(z.string()),
      tenantId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireSchoolAdmin(ctx);

      const db = getAdminDb();
      const newRef = db.collection(COLLECTIONS.paths).doc();
      await newRef.set({
        ...input,
        tenantId: ctx.auth.tenantId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: newRef.id };
    }),

  enrollInCourse: t.procedure
    .input(z.object({
      courseId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      
      const db = getAdminDb();

      // Check course requirements
      const courseDoc = await db.collection(COLLECTIONS.courses).doc(input.courseId).get();
      if (!courseDoc.exists) throw new TRPCError({ code: 'NOT_FOUND' });

      const courseData = courseDoc.data();
      const requiresSubscription = courseData?.requiresSubscription !== false; // defaults to true

      if (requiresSubscription) {
         // Check user subscription via custom claim or users doc
         // Note: we can use ctx.auth (which has claims) or fetch from 'users'
         const userDoc = await db.collection('users').doc(ctx.auth.uid).get();
         const userData = userDoc.data();
         const isSubscribed = userData?.subscriptionStatus === 'active' || 
                              userData?.role?.includes('admin') || 
                              userData?.profileType === 'admin';
         
         if (!isSubscribed) {
            throw new TRPCError({ 
               code: 'FORBIDDEN', 
               message: 'Esta aula/curso requer uma assinatura ativa da Escola IDE.' 
            });
         }
      }

      // Proceed to enroll
      const tenantId = courseData?.tenantId || ctx.auth.tenantId;
      if (!tenantId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Curso ou usuario sem unidade/tenant configurado.',
        });
      }

      const newRef = db.collection(COLLECTIONS.enrollments).doc();
      await newRef.set({
        userId: ctx.auth.uid,
        courseId: input.courseId,
        tenantId,
        progress: 0,
        status: 'in-progress',
        completedLessons: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return { id: newRef.id, success: true };
    }),
});

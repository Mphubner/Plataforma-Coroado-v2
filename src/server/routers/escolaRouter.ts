import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { ServerAuthContext } from '../context';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/src/lib/domain/collections';

const t = initTRPC.context<ServerAuthContext>().create();

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
      // Must be logged in
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });

      // Check if admin or teacher
      // Ideally we should check custom claims here
      
      const db = getFirestore();
      const newRef = db.collection(COLLECTIONS.courses).doc();
      await newRef.set({
        ...input,
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
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });
      
      const db = getFirestore();
      const newRef = db.collection(COLLECTIONS.modules).doc();
      await newRef.set({
        ...input,
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
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const db = getFirestore();
      const newRef = db.collection(COLLECTIONS.lessons).doc();
      await newRef.set({
        ...input,
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
      if (!ctx.auth?.uid) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const db = getFirestore();
      const newRef = db.collection(COLLECTIONS.paths).doc();
      await newRef.set({
        ...input,
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
      
      const db = getFirestore();

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
      const newRef = db.collection(COLLECTIONS.enrollments).doc();
      await newRef.set({
        userId: ctx.auth.uid,
        courseId: input.courseId,
        progress: 0,
        completedLessons: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return { id: newRef.id, success: true };
    }),
});

import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import { getAdminDb, ServerAuthContext } from '../context';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { memberProfileSchema } from '../../lib/domain';

const t = initTRPC.context<ServerAuthContext>().create();

export const membersRouter = t.router({
  // Lista membros baseados nas permissões e tenant
  list: t.procedure.query(async ({ ctx }) => {
    if (!ctx.auth?.uid || !ctx.auth?.tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário não autenticado' });
    }

    const db = getAdminDb();
    const q = db.collection('users').where('tenantId', '==', ctx.auth.tenantId);
    const snap = await q.get();

    let fetchedMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filtro hierárquico
    const roles = ctx.auth.roles || [];
    const canManageRoles = roles.includes('admin') || roles.includes('seniorPastor');
    const canManageApprovals = roles.includes('admin') || roles.includes('networkPastor') || roles.includes('supervisor');
    const canSeeLeadershipScope = canManageRoles || canManageApprovals;

    if (!canSeeLeadershipScope) {
      if (roles.includes('cellLeader') || roles.includes('ministryLeader')) {
        fetchedMembers = fetchedMembers.filter((m: any) =>
          m.id === ctx.auth!.uid ||
          (ctx.auth!.cellId && m.cellId === ctx.auth!.cellId) ||
          m.supervisorId === ctx.auth!.uid
        );
      } else {
        fetchedMembers = fetchedMembers.filter((m: any) => m.id === ctx.auth!.uid);
      }
    }

    return fetchedMembers;
  }),

  // Atualiza dados e claims
  updateAccess: t.procedure
    .input(z.object({
      targetUid: z.string(),
      roles: z.array(z.string()).optional(),
      isApproved: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const db = getAdminDb();
      const auth = getAuth();
      const callerRoles = ctx.auth.roles || [];
      const allowedRoles = ['admin', 'seniorPastor', 'networkPastor', 'auxPastor', 'supervisor'];
      const hasPermission = callerRoles.some(r => allowedRoles.includes(r));

      if (!hasPermission) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para modificar acessos.' });
      }

      if (input.roles && input.roles.includes('admin') && !callerRoles.includes('admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admins podem conceder cargo de admin.' });
      }

      try {
        const updates: any = {};
        const [targetUser, targetDoc] = await Promise.all([
          auth.getUser(input.targetUid),
          db.collection('users').doc(input.targetUid).get(),
        ]);

        const existingClaims = targetUser.customClaims || {};
        const targetData = targetDoc.data() || {};
        const nextRoles = input.roles !== undefined ? input.roles : (targetData.roles || existingClaims.roles || []);
        const nextIsApproved = input.isApproved !== undefined ? input.isApproved : (targetData.isApproved ?? existingClaims.isApproved ?? false);

        if (input.roles !== undefined) {
          updates.roles = input.roles;
        }

        if (input.isApproved !== undefined) {
          updates.isApproved = input.isApproved;
        }

        await auth.setCustomUserClaims(input.targetUid, {
          ...existingClaims,
          roles: nextRoles,
          isApproved: nextIsApproved,
        });

        if (Object.keys(updates).length > 0) {
          await db.collection('users').doc(input.targetUid).set(updates, { merge: true });
        }

        return { success: true };
      } catch (error) {
        console.error('Error updating user access:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao atualizar acessos.' });
      }
    }),

  // Atualiza perfil texto
  updateProfile: t.procedure
    .input(z.object({
      id: z.string(),
      data: memberProfileSchema.partial()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.uid) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const db = getAdminDb();
      
      const callerRoles = ctx.auth.roles || [];
      const isSelf = ctx.auth.uid === input.id;
      const isAdminOrPastor = callerRoles.some(r => ['admin', 'seniorPastor', 'networkPastor', 'supervisor'].includes(r));
      
      if (!isSelf && !isAdminOrPastor) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para editar este perfil.' });
      }

      await db.collection('users').doc(input.id).set({
        ...input.data,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return { success: true };
    })
});

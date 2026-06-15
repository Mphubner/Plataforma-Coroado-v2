import type express from 'express';
import admin from 'firebase-admin';
import { COLLECTIONS } from '../../lib/domain';
import {
  authenticateFirebase,
  getAdminDb,
  requireRoles,
  sanitizeRoles,
  type AuthedRequest,
} from '../context';

export function registerAdminRoutes(app: express.Express) {
  app.post(
    '/api/admin/users/:uid/approve',
    authenticateFirebase,
    requireRoles(['admin', 'seniorPastor', 'networkPastor', 'auxPastor', 'supervisor']),
    async (req: AuthedRequest, res) => {
      try {
        const { uid } = req.params;
        await getAdminDb().collection(COLLECTIONS.users).doc(uid).set({
          isApproved: true,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: req.authUser?.uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        const userDoc = await getAdminDb().collection(COLLECTIONS.users).doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          await admin.auth().setCustomUserClaims(uid, {
            isApproved: true,
            roles: userData.roles || ['member'],
            tenantId: userData.tenantId,
          });
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Approve user failed:', error);
        res.status(500).json({ success: false, error: 'Nao foi possivel aprovar o usuario' });
      }
    },
  );

  app.patch(
    '/api/admin/users/:uid/roles',
    authenticateFirebase,
    requireRoles(['admin', 'seniorPastor']),
    async (req: AuthedRequest, res) => {
      const roles = sanitizeRoles(req.body?.roles);
      if (!roles) {
        res.status(400).json({ success: false, error: 'Lista de papeis invalida' });
        return;
      }

      try {
        const { uid } = req.params;
        await getAdminDb().collection(COLLECTIONS.users).doc(uid).set({
          roles,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          rolesUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          rolesUpdatedBy: req.authUser?.uid,
        }, { merge: true });

        const userDoc = await getAdminDb().collection(COLLECTIONS.users).doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          await admin.auth().setCustomUserClaims(uid, {
            isApproved: userData.isApproved,
            roles,
            tenantId: userData.tenantId,
          });
        }

        res.json({ success: true, roles });
      } catch (error) {
        console.error('Update user roles failed:', error);
        res.status(500).json({ success: false, error: 'Nao foi possivel alterar os papeis' });
      }
    },
  );
}

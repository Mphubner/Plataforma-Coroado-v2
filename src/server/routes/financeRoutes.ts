import type express from 'express';
import admin from 'firebase-admin';
import { COLLECTIONS, contributionRequestSchema, planRequestSchema, transactionReconciliationRequestSchema } from '../../lib/domain';
import {
  authenticateFirebase,
  cleanString,
  DEFAULT_TENANT_ID,
  getAdminDb,
  requireRoles,
  type AuthedRequest,
} from '../context';
import { createFinancePlan, OperationError, reconcileTransaction } from '../operations';
import { getFinanceOverview } from '../queries/financeOverview';

export function registerFinanceRoutes(app: express.Express) {
  app.get('/api/finance/overview', authenticateFirebase, async (req: AuthedRequest, res) => {
    try {
      const overview = await getFinanceOverview(req);
      res.json({ success: true, overview });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('Finance overview failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel carregar o resumo financeiro' });
    }
  });

  app.post(
    '/api/admin/plans',
    authenticateFirebase,
    requireRoles(['admin', 'seniorPastor', 'networkPastor', 'auxPastor']),
    async (req: AuthedRequest, res) => {
      const parsed = planRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Plano invalido' });
        return;
      }

      try {
        const result = await createFinancePlan(req, parsed.data);
        res.json({ success: true, ...result });
      } catch (error) {
        if (error instanceof OperationError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }

        console.error('Create plan failed:', error);
        res.status(500).json({ success: false, error: 'Nao foi possivel criar o plano' });
      }
    },
  );

  app.post('/api/contributions', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = contributionRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Dados da contribuicao invalidos' });
      return;
    }

    try {
      const contribution = parsed.data;
      const tenantId = cleanString(req.userProfile?.tenantId, 128) || DEFAULT_TENANT_ID;
      const userName = cleanString(req.userProfile?.name || req.authUser?.name || req.authUser?.email, 200) || 'Membro';
      const transactionRef = await getAdminDb().collection(COLLECTIONS.transactions).add({
        userId: req.authUser?.uid,
        userName,
        amount: contribution.amount,
        type: contribution.contributionType,
        itemId: contribution.itemId,
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        method: contribution.method,
        tenantId,
        source: 'bff',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true, transactionId: transactionRef.id });
    } catch (error) {
      console.error('Create contribution failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel registrar a contribuicao' });
    }
  });

  app.post(
    '/api/admin/transactions/:transactionId/reconcile',
    authenticateFirebase,
    requireRoles(['admin', 'seniorPastor', 'networkPastor', 'auxPastor']),
    async (req: AuthedRequest, res) => {
      const parsed = transactionReconciliationRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Status de conciliacao invalido' });
        return;
      }

      try {
        const { transactionId } = req.params;
        const result = await reconcileTransaction(req, transactionId, parsed.data);
        res.json({ success: true, ...result });
      } catch (error) {
        if (error instanceof OperationError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }

        console.error('Reconcile transaction failed:', error);
        res.status(500).json({ success: false, error: 'Nao foi possivel conciliar a transacao' });
      }
    },
  );
}

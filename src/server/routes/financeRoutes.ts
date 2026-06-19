import type express from 'express';
import admin from 'firebase-admin';
import { COLLECTIONS, contributionRequestSchema, planRequestSchema, transactionReconciliationRequestSchema } from '../../lib/domain';
import {
  authenticateFirebase,
  cleanString,
  DEFAULT_TENANT_ID,
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookUrl,
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

      // Integrate Mercado Pago Preference
      const accessToken = getMercadoPagoAccessToken();
      if (!accessToken) {
        // Fallback to manual approval flow if MP is not configured
        res.json({ success: true, transactionId: transactionRef.id });
        return;
      }

      const { MercadoPagoConfig, Preference } = await import('mercadopago');
      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      const preference = new Preference(client);
      const origin = String(req.headers.origin || `http://localhost:${process.env.PORT || 3000}`);
      const notificationUrl = getMercadoPagoWebhookUrl();

      const title = contribution.contributionType === 'dizimo' ? 'Dízimo' : contribution.contributionType === 'oferta' ? 'Oferta' : 'Contribuição';

      const response = await preference.create({
        body: {
          items: [{
            id: contribution.itemId || 'contrib',
            title: title,
            quantity: 1,
            unit_price: contribution.amount,
            currency_id: 'BRL',
          }],
          external_reference: transactionRef.id,
          metadata: {
            transactionId: transactionRef.id,
            userId: req.authUser?.uid,
            tenantId,
          },
          back_urls: {
            success: `${origin}/financeiro?payment=success`,
            failure: `${origin}/financeiro?payment=failure`,
            pending: `${origin}/financeiro?payment=pending`,
          },
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
          auto_return: 'approved',
        },
      });

      const initPoint = response.init_point || response.sandbox_init_point;
      if (!initPoint) {
        res.status(502).json({ success: false, error: 'Mercado Pago nao retornou URL de pagamento' });
        return;
      }

      await transactionRef.set({
        paymentPreferenceId: response.id || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.json({ success: true, transactionId: transactionRef.id, init_point: initPoint });
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

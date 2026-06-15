import type express from 'express';
import admin from 'firebase-admin';
import { MercadoPagoConfig, PreApproval, Preference } from 'mercadopago';
import {
  COLLECTIONS,
  schoolEnrollmentRequestSchema,
  schoolProgressRequestSchema,
  schoolPurchaseRequestSchema,
  schoolSubscriptionRequestSchema,
} from '../../lib/domain';
import {
  authenticateFirebase,
  cleanString,
  DEFAULT_TENANT_ID,
  getAdminDb,
  getMercadoPagoAccessToken,
  type AuthedRequest,
} from '../context';
import { OperationError, updateSchoolProgress } from '../operations';
import { getSchoolOverview } from '../queries/schoolOverview';

async function resolveSchoolPurchase(input: { targetType: 'course' | 'lesson'; targetId: string }, tenantId: string) {
  const db = getAdminDb();
  const collectionName = input.targetType === 'course' ? COLLECTIONS.courses : COLLECTIONS.lessons;
  const snap = await db.collection(collectionName).doc(input.targetId).get();

  if (!snap.exists) {
    throw new OperationError(404, input.targetType === 'course' ? 'Curso nao encontrado' : 'Aula nao encontrada');
  }

  const data = snap.data() || {};
  if (data.tenantId && data.tenantId !== tenantId) {
    throw new OperationError(403, 'Conteudo indisponivel para sua unidade');
  }

  const amount = input.targetType === 'course'
    ? Number(data.standalonePrice || data.monthlyPrice || data.price || 0)
    : Number(data.standalonePrice || data.price || 9.9);
  const title = cleanString(data.title, 120) || (input.targetType === 'course' ? 'Curso Escola IDE' : 'Aula Escola IDE');

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new OperationError(400, 'Conteudo sem preco avulso configurado');
  }

  return {
    title,
    amount: Math.round(amount * 100) / 100,
    courseId: input.targetType === 'course' ? input.targetId : cleanString(data.courseId, 128),
  };
}

export function registerSchoolRoutes(app: express.Express, port: number) {
  app.get('/api/school/overview', authenticateFirebase, async (req: AuthedRequest, res) => {
    try {
      const overview = await getSchoolOverview(req);
      res.json({ success: true, overview });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('School overview failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel carregar a Escola IDE' });
    }
  });

  app.post('/api/school/subscriptions', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = schoolSubscriptionRequestSchema.safeParse(req.body);

    if (!parsed.success || !req.authUser?.uid) {
      res.status(400).json({ success: false, error: 'Assinatura invalida' });
      return;
    }

    try {
      const accessToken = getMercadoPagoAccessToken();
      if (!accessToken) {
        res.status(503).json({ success: false, error: 'Mercado Pago nao configurado no backend' });
        return;
      }

      const tenantId = cleanString(req.userProfile?.tenantId, 128) || DEFAULT_TENANT_ID;
      const amount = Number(parsed.data.amount || process.env.SCHOOL_SUBSCRIPTION_AMOUNT || 29.9);
      const reason = parsed.data.planTitle || process.env.SCHOOL_SUBSCRIPTION_TITLE || 'Escola IDE Premium';
      const subscriptionId = `school_${req.authUser.uid}`;
      const origin = String(req.headers.origin || `http://localhost:${port}`);
      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      const preApproval = new PreApproval(client);

      await getAdminDb().collection(COLLECTIONS.subscriptions).doc(subscriptionId).set({
        userId: req.authUser.uid,
        tenantId,
        status: 'pending',
        provider: 'mercadopago',
        reason,
        amount,
        source: 'school_subscription',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      const response = await preApproval.create({
        body: {
          reason,
          external_reference: subscriptionId,
          payer_email: req.authUser.email || cleanString(req.userProfile?.email, 200),
          back_url: `${origin}/escola?subscription=pending`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'BRL',
          },
        },
      });

      const initPoint = response.init_point || (response as { sandbox_init_point?: string }).sandbox_init_point;
      if (!initPoint) {
        res.status(502).json({ success: false, error: 'Mercado Pago nao retornou URL de assinatura' });
        return;
      }

      await getAdminDb().collection(COLLECTIONS.subscriptions).doc(subscriptionId).set({
        mpSubscriptionId: response.id || '',
        initPoint,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.json({ success: true, subscriptionId, preapprovalId: response.id || '', initPoint });
    } catch (error) {
      console.error('Create school subscription failed:', error);
      res.status(502).json({ success: false, error: 'Nao foi possivel iniciar a assinatura' });
    }
  });

  app.post('/api/school/purchases', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = schoolPurchaseRequestSchema.safeParse(req.body);

    if (!parsed.success || !req.authUser?.uid) {
      res.status(400).json({ success: false, error: 'Compra invalida' });
      return;
    }

    try {
      const accessToken = getMercadoPagoAccessToken();
      if (!accessToken) {
        res.status(503).json({ success: false, error: 'Mercado Pago nao configurado no backend' });
        return;
      }

      const tenantId = cleanString(req.userProfile?.tenantId, 128) || DEFAULT_TENANT_ID;
      const purchaseInput = {
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      };
      const item = await resolveSchoolPurchase(purchaseInput, tenantId);
      const orderRef = await getAdminDb().collection(COLLECTIONS.orders).add({
        userId: req.authUser.uid,
        userName: cleanString(req.userProfile?.name || req.authUser.name || req.authUser.email, 200) || 'Aluno',
        tenantId,
        items: [{
          productId: purchaseInput.targetId,
          name: item.title,
          quantity: 1,
          price: item.amount,
          size: '',
          color: '',
        }],
        total: item.amount,
        status: 'pending_payment',
        paymentStatus: 'created',
        paymentMethod: 'mercadopago',
        source: 'school_purchase',
        targetType: purchaseInput.targetType,
        targetId: purchaseInput.targetId,
        courseId: item.courseId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      const preference = new Preference(client);
      const origin = String(req.headers.origin || `http://localhost:${port}`);
      const response = await preference.create({
        body: {
          items: [{
            id: purchaseInput.targetId,
            title: item.title,
            quantity: 1,
            unit_price: item.amount,
            currency_id: 'BRL',
          }],
          external_reference: orderRef.id,
          metadata: {
            orderId: orderRef.id,
            userId: req.authUser.uid,
            tenantId,
            source: 'school_purchase',
            targetType: purchaseInput.targetType,
            targetId: purchaseInput.targetId,
            courseId: item.courseId,
          },
          back_urls: {
            success: `${origin}/escola?payment=success`,
            failure: `${origin}/escola?payment=failure`,
            pending: `${origin}/escola?payment=pending`,
          },
          auto_return: 'approved',
        },
      });

      const initPoint = response.init_point || response.sandbox_init_point;
      if (!initPoint) {
        res.status(502).json({ success: false, error: 'Mercado Pago nao retornou URL de pagamento' });
        return;
      }

      await orderRef.set({
        paymentPreferenceId: response.id || '',
        paymentStatus: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.json({ success: true, orderId: orderRef.id, initPoint, preferenceId: response.id || '' });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('Create school purchase failed:', error);
      res.status(502).json({ success: false, error: 'Nao foi possivel iniciar a compra' });
    }
  });

  app.post('/api/school/enrollments/:enrollmentId/progress', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = schoolProgressRequestSchema.safeParse({
      ...req.body,
      enrollmentId: req.params.enrollmentId,
    });

    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Progresso invalido' });
      return;
    }

    try {
      const result = await updateSchoolProgress(req, parsed.data);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('Update school progress failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel atualizar o progresso' });
    }
  });

  app.post('/api/school/enrollments', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = schoolEnrollmentRequestSchema.safeParse(req.body);

    if (!parsed.success || !req.authUser?.uid) {
      res.status(400).json({ success: false, error: 'Curso invalido' });
      return;
    }

    try {
      const courseId = parsed.data.courseId;
      const tenantId = cleanString(req.userProfile?.tenantId, 128) || DEFAULT_TENANT_ID;
      const db = getAdminDb();
      const courseDoc = await db.collection(COLLECTIONS.courses).doc(courseId).get();

      if (!courseDoc.exists) {
        res.status(404).json({ success: false, error: 'Curso nao encontrado' });
        return;
      }

      const course = courseDoc.data() || {};
      if (course.tenantId && course.tenantId !== tenantId) {
        res.status(403).json({ success: false, error: 'Curso indisponivel para sua unidade' });
        return;
      }

      const existing = await db.collection(COLLECTIONS.enrollments)
        .where('userId', '==', req.authUser.uid)
        .where('courseId', '==', courseId)
        .limit(1)
        .get();

      if (!existing.empty) {
        res.json({ success: true, enrollmentId: existing.docs[0].id, alreadyEnrolled: true });
        return;
      }

      const enrollmentRef = await db.collection(COLLECTIONS.enrollments).add({
        userId: req.authUser.uid,
        courseId,
        tenantId,
        progress: 0,
        status: 'in-progress',
        completedLessons: [],
        source: 'bff',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true, enrollmentId: enrollmentRef.id, alreadyEnrolled: false });
    } catch (error) {
      console.error('Create school enrollment failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel realizar a matricula' });
    }
  });
}

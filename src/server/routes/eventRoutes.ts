import type express from 'express';
import admin from 'firebase-admin';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { randomUUID } from 'node:crypto';
import { COLLECTIONS, eventCheckInRequestSchema, eventEnrollmentRequestSchema } from '../../lib/domain';
import {
  authenticateFirebase,
  cleanString,
  DEFAULT_TENANT_ID,
  getAdminDb,
  getMercadoPagoAccessToken,
  type AuthedRequest,
} from '../context';
import { checkInEventEnrollment, OperationError } from '../operations';

export function registerEventRoutes(app: express.Express, port: number) {
  app.post('/api/event-enrollments/:enrollmentId/check-in', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = eventCheckInRequestSchema.safeParse({
      ...req.body,
      enrollmentId: req.params.enrollmentId,
    });

    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Ingresso invalido' });
      return;
    }

    try {
      const result = await checkInEventEnrollment(req, parsed.data.enrollmentId);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('Event check-in failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel confirmar o check-in' });
    }
  });

  app.post('/api/events/:eventId/enroll', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = eventEnrollmentRequestSchema.safeParse({
      ...req.body,
      eventId: req.params.eventId,
    });

    if (!parsed.success || !req.authUser?.uid) {
      res.status(400).json({ success: false, error: 'Dados de inscricao invalidos' });
      return;
    }

    try {
      const db = getAdminDb();
      const { eventId, kids } = parsed.data;
      const tenantId = cleanString(req.userProfile?.tenantId, 128) || DEFAULT_TENANT_ID;
      const eventRef = db.collection(COLLECTIONS.events).doc(eventId);
      const eventSnap = await eventRef.get();

      if (!eventSnap.exists) {
        res.status(404).json({ success: false, error: 'Evento nao encontrado' });
        return;
      }

      const event = eventSnap.data() || {};
      if (event.tenantId && event.tenantId !== tenantId) {
        res.status(403).json({ success: false, error: 'Evento indisponivel para sua unidade' });
        return;
      }

      const enrollmentId = `${eventId}_${req.authUser.uid}`;
      const enrollmentRef = db.collection(COLLECTIONS.eventEnrollments).doc(enrollmentId);
      const enrollmentSnap = await enrollmentRef.get();

      if (enrollmentSnap.exists) {
        res.json({
          success: true,
          enrollmentId,
          alreadyEnrolled: true,
          paymentRequired: enrollmentSnap.data()?.paymentStatus === 'pending',
          initPoint: '',
        });
        return;
      }

      const isPaid = Boolean(event.isPaid);
      const price = Number(event.price || 0);
      if (isPaid && (!Number.isFinite(price) || price <= 0)) {
        res.status(400).json({ success: false, error: 'Evento pago sem valor valido' });
        return;
      }

      const accessToken = getMercadoPagoAccessToken();
      if (isPaid && !accessToken) {
        res.status(503).json({ success: false, error: 'Mercado Pago nao configurado no backend' });
        return;
      }

      const enrollmentData = {
        eventId,
        userId: req.authUser.uid,
        tenantId,
        checkedIn: false,
        kids: kids.map(kid => ({
          id: randomUUID(),
          name: kid.name,
          age: kid.age,
          obs: kid.obs,
          checkedIn: false,
        })),
        paymentStatus: isPaid ? 'pending' : 'approved',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await enrollmentRef.set(enrollmentData);
      await eventRef.set({
        enrolled: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (!isPaid) {
        res.json({ success: true, enrollmentId, alreadyEnrolled: false, paymentRequired: false });
        return;
      }

      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      const preference = new Preference(client);
      const origin = String(req.headers.origin || `http://localhost:${port}`);
      const eventTitle = cleanString(event.title, 120) || 'Evento Coroado';

      const response = await preference.create({
        body: {
          items: [{
            id: eventId,
            title: eventTitle,
            quantity: 1,
            unit_price: price,
            currency_id: 'BRL',
          }],
          external_reference: enrollmentId,
          metadata: {
            enrollmentId,
            eventId,
            userId: req.authUser.uid,
            tenantId,
            source: 'event_enrollment',
          },
          back_urls: {
            success: `${origin}/eventos?payment=success`,
            failure: `${origin}/eventos?payment=failure`,
            pending: `${origin}/eventos?payment=pending`,
          },
          auto_return: 'approved',
        },
      });

      const initPoint = response.init_point || response.sandbox_init_point;
      if (!initPoint) {
        res.status(502).json({ success: false, error: 'Mercado Pago nao retornou URL de pagamento' });
        return;
      }

      await enrollmentRef.set({
        preferenceId: response.id || '',
        paymentInitPoint: initPoint,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.json({
        success: true,
        enrollmentId,
        alreadyEnrolled: false,
        paymentRequired: true,
        initPoint,
        preferenceId: response.id || '',
      });
    } catch (error) {
      console.error('Create event enrollment failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel realizar a inscricao' });
    }
  });
}

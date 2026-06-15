import type express from 'express';
import admin from 'firebase-admin';
import { COLLECTIONS } from '../../lib/domain';
import { cleanString, getAdminDb, getMercadoPagoAccessToken } from '../context';
import { recordPaymentEvent } from '../operations';

function toTransactionStatus(paymentStatus: string) {
  if (paymentStatus === 'approved') return 'completed';
  if (paymentStatus === 'rejected') return 'failed';
  if (paymentStatus === 'cancelled') return 'cancelled';
  if (paymentStatus === 'refunded') return 'refunded';
  return 'pending';
}

function toEventPaymentStatus(paymentStatus: string) {
  if (paymentStatus === 'approved') return 'approved';
  if (['rejected', 'cancelled', 'refunded'].includes(paymentStatus)) return 'rejected';
  return 'pending';
}

async function processPreapprovalWebhook(preapprovalId: string) {
  const accessToken = getMercadoPagoAccessToken();
  const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Mercado Pago preapproval lookup failed: ${response.status}`);
  }

  const subscription = await response.json();
  const subscriptionId = cleanString(subscription.external_reference, 128);
  const status = cleanString(subscription.status, 50) || 'unknown';

  if (!subscriptionId) {
    return { ignored: true };
  }

  const subscriptionRef = getAdminDb().collection(COLLECTIONS.subscriptions).doc(subscriptionId);
  const subscriptionSnap = await subscriptionRef.get();
  const current = subscriptionSnap.data() || {};
  const userId = cleanString(current.userId || subscriptionId.replace(/^school_/, ''), 128);
  const tenantId = cleanString(current.tenantId, 128) || 'tenant-1';
  const active = ['authorized', 'active'].includes(status);

  await subscriptionRef.set({
    mpSubscriptionId: preapprovalId,
    status,
    providerStatus: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    rawStatusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  if (userId) {
    await getAdminDb().collection(COLLECTIONS.users).doc(userId).set({
      subscriptionStatus: active ? 'active' : status,
      mpSubscriptionId: preapprovalId,
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await recordPaymentEvent({
      provider: 'mercadopago',
      paymentId: preapprovalId,
      referenceId: subscriptionId,
      status,
      targetType: 'school_subscription',
      amount: Number(subscription.auto_recurring?.transaction_amount || current.amount || 0),
      tenantId,
      raw: subscription,
    });
  }

  console.log(`Mercado Pago subscription ${preapprovalId} updated ${subscriptionId} as ${status}`);
  return { ignored: false, subscriptionId, status };
}

export function registerMercadoPagoRoutes(app: express.Express) {
  app.post('/api/webhooks/mercadopago', async (req, res) => {
    const eventType = cleanString(req.body?.type || req.body?.topic || req.query?.type || req.query?.topic, 80);
    const paymentId = cleanString(req.body?.data?.id || req.query?.['data.id'] || req.query?.id, 128);
    const accessToken = getMercadoPagoAccessToken();

    console.log('MP Webhook Received:', {
      eventType,
      paymentId,
      bodyType: typeof req.body,
      queryType: typeof req.query,
      timestamp: new Date().toISOString()
    });

    if (!paymentId || !accessToken) {
      res.status(202).json({ success: true, ignored: true });
      return;
    }

    try {
      if (eventType.includes('preapproval') || eventType.includes('subscription')) {
        await processPreapprovalWebhook(paymentId);
        res.status(202).json({ success: true });
        return;
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Mercado Pago payment lookup failed: ${response.status}`);
      }

      const payment = await response.json();
      const metadata = payment.metadata || {};
      const referenceId = cleanString(payment.external_reference || metadata.order_id || metadata.orderId || metadata.enrollmentId, 128);

      if (!referenceId) {
        res.status(202).json({ success: true, ignored: true });
        return;
      }

      const paymentStatus = cleanString(payment.status, 50) || 'unknown';
      const transactionStatus = toTransactionStatus(paymentStatus);
      const amount = Number(payment.transaction_amount || payment.total_paid_amount || 0);
      const source = cleanString(metadata.source, 80);
      const isEventEnrollment = source === 'event_enrollment' || Boolean(metadata.enrollmentId);

      if (isEventEnrollment) {
        const enrollmentId = cleanString(metadata.enrollmentId || referenceId, 128);
        const enrollmentRef = getAdminDb().collection(COLLECTIONS.eventEnrollments).doc(enrollmentId);
        const enrollmentSnap = await enrollmentRef.get();
        const enrollment = enrollmentSnap.data() || {};
        const tenantId = cleanString(enrollment.tenantId || metadata.tenantId, 128);
        const eventId = cleanString(enrollment.eventId || metadata.eventId, 128);
        const userId = cleanString(enrollment.userId || metadata.userId, 128);

        await enrollmentRef.set({
          paymentStatus: toEventPaymentStatus(paymentStatus),
          paymentId,
          paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        if (userId && amount > 0) {
          await getAdminDb().collection(COLLECTIONS.transactions).doc(`event_${enrollmentId}`).set({
            userId,
            userName: cleanString(enrollment.userName, 200) || 'Membro',
            amount,
            type: 'event',
            itemId: eventId || enrollmentId,
            status: transactionStatus,
            date: new Date().toISOString().slice(0, 10),
            method: 'mercado_pago',
            tenantId,
            paymentId,
            source: 'mercadopago_webhook',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }

        await recordPaymentEvent({
          provider: 'mercadopago',
          paymentId,
          referenceId: enrollmentId,
          status: paymentStatus,
          targetType: 'event_enrollment',
          amount,
          tenantId,
          raw: payment,
        });

        console.log(`Mercado Pago payment ${paymentId} updated event enrollment ${enrollmentId} as ${paymentStatus}`);
      } else {
        const orderId = referenceId;
        const orderStatus = paymentStatus === 'approved'
          ? 'paid'
          : paymentStatus === 'rejected'
            ? 'payment_failed'
            : 'pending_payment';
        const orderRef = getAdminDb().collection(COLLECTIONS.orders).doc(orderId);
        const orderSnap = await orderRef.get();
        const order = orderSnap.data() || {};
        const tenantId = cleanString(order.tenantId || metadata.tenantId, 128);
        const userId = cleanString(order.userId || metadata.userId, 128);
        const total = Number(order.total || amount || 0);

        await orderRef.set({
          status: orderStatus,
          paymentStatus,
          paymentId,
          paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        if (userId && total > 0) {
          await getAdminDb().collection(COLLECTIONS.transactions).doc(`order_${orderId}`).set({
            userId,
            userName: cleanString(order.userName, 200) || 'Membro',
            amount: total,
            type: 'order',
            itemId: orderId,
            status: transactionStatus,
            date: new Date().toISOString().slice(0, 10),
            method: 'mercado_pago',
            tenantId,
            paymentId,
            source: 'mercadopago_webhook',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }

        if (paymentStatus === 'approved' && order.source === 'school_purchase') {
          const targetType = cleanString(order.targetType || metadata.targetType, 50);
          const targetId = cleanString(order.targetId || metadata.targetId, 128);
          const courseId = cleanString(order.courseId || metadata.courseId, 128);

          if (userId && targetType && targetId) {
            await getAdminDb().collection(COLLECTIONS.learningAccess).doc(`${userId}_${targetType}_${targetId}`).set({
              userId,
              tenantId,
              targetType,
              targetId,
              courseId,
              orderId,
              paymentId,
              status: 'active',
              source: 'mercadopago_webhook',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
        }

        await recordPaymentEvent({
          provider: 'mercadopago',
          paymentId,
          referenceId: orderId,
          status: paymentStatus,
          targetType: 'order',
          amount: total,
          tenantId,
          raw: payment,
        });

        console.log(`Mercado Pago payment ${paymentId} updated order ${orderId} as ${paymentStatus}`);
      }
    } catch (error) {
      console.error('Mercado Pago webhook failed:', error);
      res.status(500).json({ success: false });
      return;
    }

    res.status(202).json({ success: true });
  });

  app.post('/api/webhooks/mercadopago/subscriptions', async (req, res) => {
    const preapprovalId = cleanString(req.body?.data?.id || req.query?.['data.id'] || req.query?.id, 128);
    const accessToken = getMercadoPagoAccessToken();

    if (!preapprovalId || !accessToken) {
      res.status(202).json({ success: true, ignored: true });
      return;
    }

    try {
      await processPreapprovalWebhook(preapprovalId);
    } catch (error) {
      console.error('Mercado Pago subscription webhook failed:', error);
      res.status(500).json({ success: false });
      return;
    }

    res.status(202).json({ success: true });
  });
}

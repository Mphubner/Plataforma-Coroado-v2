import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { MercadoPagoConfig, Preference, PreApproval } from 'mercadopago';
import { createHmac, timingSafeEqual } from 'node:crypto';

admin.initializeApp();

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b';

function db() {
  return getFirestore(admin.app(), firestoreDatabaseId);
}

function getMpAccessToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new functions.https.HttpsError('failed-precondition', 'Mercado Pago is not configured.');
  }
  return token;
}

function getMpWebhookSecret() {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET || '';
}

function getMpClient() {
  return new MercadoPagoConfig({
    accessToken: getMpAccessToken(),
    options: { timeout: 5000 }
  });
}

function readHeader(req: functions.https.Request, name: string) {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] || '';
  return typeof value === 'string' ? value : '';
}

function parseSignatureHeader(header: string) {
  return header.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=').map(item => item.trim());
    if (key && value) acc[key] = value;
    return acc;
  }, {});
}

function validateMercadoPagoSignature(req: functions.https.Request, notificationId: string) {
  const secret = getMpWebhookSecret();
  if (!secret) {
    return {
      ok: process.env.NODE_ENV !== 'production',
      reason: 'missing_webhook_secret',
    };
  }

  const signature = parseSignatureHeader(readHeader(req, 'x-signature'));
  const requestId = readHeader(req, 'x-request-id');
  const ts = signature.ts;
  const v1 = signature.v1;

  if (!ts || !v1 || !requestId) {
    return { ok: false, reason: 'missing_signature_headers' };
  }

  const manifest = [
    notificationId ? `id:${notificationId.toLowerCase()}` : '',
    `request-id:${requestId}`,
    `ts:${ts}`,
  ].filter(Boolean).join(';') + ';';
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(v1, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return { ok: false, reason: 'signature_length_mismatch' };
  }

  return {
    ok: timingSafeEqual(expectedBuffer, receivedBuffer),
    reason: 'signature_checked',
  };
}

export const createEventEnrollment = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { eventId, kids, ticketTypeId, isServant } = data;

  if (!eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing eventId.');
  }

  const userId = context.auth.uid;
  
  try {
    const userSnap = await db().collection('users').doc(userId).get();
    const userData = userSnap.data() || {};
    const tenantId = userData.tenantId;

    const eventSnap = await db().collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Evento não encontrado.');
    }
    const event = eventSnap.data() || {};

    if (event.tenantId && event.tenantId !== tenantId) {
      throw new functions.https.HttpsError('permission-denied', 'Evento indisponível para sua unidade.');
    }

    const cleanText = (t: any) => String(t || '').trim().slice(0, 128);
    const enrollmentId = `${cleanText(eventId)}_${cleanText(userId)}`;
    
    let price = Number(event.price || 0);
    let name = String(event.title || 'Ingresso Padrão');

    if (isServant && event.servantsPrice !== undefined) {
      price = Number(event.servantsPrice);
      name = 'Ingresso Especial (Servos)';
    } else if (ticketTypeId && Array.isArray(event.ticketTypes)) {
      const type = event.ticketTypes.find((t: any) => String(t.id) === String(ticketTypeId));
      if (type) {
        price = Number(type.price);
        name = String(type.name);
      }
    }

    let kidsCount = 0;
    if (Array.isArray(kids)) kidsCount = kids.length;
    let kidsPrice = Number(event.childTicketPrice || 0);
    const totalAmount = price + (kidsCount * kidsPrice);

    const enrollmentRef = db().collection('event_enrollments').doc(enrollmentId);
    const enrollmentSnap = await enrollmentRef.get();

    if (enrollmentSnap.exists) {
      return {
        success: true,
        enrollmentId,
        alreadyEnrolled: true,
        paymentRequired: enrollmentSnap.data()?.paymentStatus === 'pending',
        initPoint: enrollmentSnap.data()?.paymentInitPoint,
      };
    }

    await enrollmentRef.set({
      id: enrollmentId,
      eventId,
      userId,
      tenantId,
      ticketName: name,
      basePrice: price,
      kidsCount,
      kidsTotal: kidsCount * kidsPrice,
      totalAmount,
      isServant: !!isServant,
      paymentStatus: totalAmount > 0 ? 'pending' : 'paid',
      status: 'active',
      checkedIn: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      enrollmentId,
      alreadyEnrolled: false,
      paymentRequired: totalAmount > 0,
    };
  } catch (error: any) {
    console.error('Error creating enrollment:', error);
    throw new functions.https.HttpsError('internal', 'Não foi possível realizar a inscrição.');
  }
});

export const createPreference = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { eventId, enrollmentId } = data;

  if (!eventId || !enrollmentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters.');
  }

  try {
    const eventSnap = await db().collection('events').doc(eventId).get();
    const eventData = eventSnap.data() || {};
    const amount = Number(eventData.price || eventData.amount || 0);
    const title = String(eventData.title || 'Ingresso Evento').slice(0, 120);

    if (!eventSnap.exists || !Number.isFinite(amount) || amount <= 0) {
      throw new functions.https.HttpsError('failed-precondition', 'Event price is not configured.');
    }

    const preference = new Preference(getMpClient());

    const response = await preference.create({
      body: {
        items: [
          {
            id: eventId,
            title: title || 'Ingresso Evento',
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          }
        ],
        payer: {
          email: context.auth.token.email,
        },
        external_reference: enrollmentId,
        back_urls: {
          success: 'https://coroado.org/', // Update these URLs later to your actual domains
          pending: 'https://coroado.org/',
          failure: 'https://coroado.org/'
        },
        auto_return: 'approved'
      }
    });

    return {
      preferenceId: response.id,
      initPoint: response.init_point || response.sandbox_init_point
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('Error creating preference:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create preference.');
  }
});

export const createSubscription = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { planTitle, enrollmentId, planId } = data;

  if (!enrollmentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters.');
  }

  try {
    let amount = Number(process.env.SCHOOL_IDE_MONTHLY_PRICE || 0);
    if (planId) {
      const planSnap = await db().collection('plans').doc(String(planId)).get();
      const planData = planSnap.data() || {};
      amount = Number(planData.price || planData.monthlyPrice || amount);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new functions.https.HttpsError('failed-precondition', 'Subscription price is not configured.');
    }

    const preApproval = new PreApproval(getMpClient());

    const response = await preApproval.create({
      body: {
        reason: planTitle || 'Assinatura',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: 'BRL',
        },
        payer_email: context.auth.token.email,
        external_reference: enrollmentId,
        back_url: 'https://coroado.org/escola',
      }
    });

    return {
      preapprovalId: response.id,
      initPoint: response.init_point
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('Error creating subscription:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create subscription.');
  }
});

export const mpWebhook = functions.https.onRequest(async (req: any, res: any) => {
  const { type, data } = req.body;

  if (type === 'payment' && data && data.id) {
    try {
      const paymentId = data.id;
      const signatureValidation = validateMercadoPagoSignature(req, String(paymentId));
      if (!signatureValidation.ok) {
        console.warn('Mercado Pago webhook rejected:', signatureValidation.reason);
        res.status(401).send('Invalid signature');
        return;
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${getMpAccessToken()}`
        }
      });
      const paymentData = await response.json();

      if (paymentData.status === 'approved' && paymentData.external_reference) {
        const enrollmentId = paymentData.external_reference;
        
        await db().collection('event_enrollments').doc(enrollmentId).update({
          paymentStatus: 'approved',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Payment ${paymentId} approved for enrollment ${enrollmentId}`);
      }
      
      res.status(200).send('Webhook received');
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Error processing webhook');
    }
  } else if (type === 'subscription_preapproval' && data && data.id) {
    try {
      const subId = data.id;
      const signatureValidation = validateMercadoPagoSignature(req, String(subId));
      if (!signatureValidation.ok) {
        console.warn('Mercado Pago subscription webhook rejected:', signatureValidation.reason);
        res.status(401).send('Invalid signature');
        return;
      }

      const response = await fetch(`https://api.mercadopago.com/preapproval/${subId}`, {
        headers: {
          Authorization: `Bearer ${getMpAccessToken()}`
        }
      });
      const subData = await response.json();

      if (subData.status === 'authorized' && subData.external_reference) {
        const referenceId = subData.external_reference; // This is mapped to userId
        
        // Update user document to grant premium access
        await db().collection('users').doc(referenceId).update({
          subscriptionStatus: 'active',
          mpSubscriptionId: subId,
          subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Also save to subscriptions collection for history/logs
        await db().collection('subscriptions').doc(referenceId).set({
          mpSubscriptionId: subId,
          status: 'authorized',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`Subscription ${subId} authorized for reference ${referenceId}`);
      }
      
      res.status(200).send('Webhook received');
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Error processing webhook');
    }
  } else {
    res.status(200).send('Ignored event');
  }
});

export const updateUserAccess = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  // Validate that the caller has an elevated role before allowing modifications
  const callerDoc = await db().collection('users').doc(context.auth.uid).get();
  const callerData = callerDoc.data();
  const callerRoles: string[] = callerData?.roles || [];
  const allowedRoles = ['admin', 'seniorPastor', 'networkPastor', 'auxPastor', 'supervisor'];
  const hasPermission = callerRoles.some(r => allowedRoles.includes(r));

  if (!hasPermission) {
    throw new functions.https.HttpsError('permission-denied', 'You do not have permission to modify user access.');
  }

  const { targetUid, roles, isApproved } = data;

  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing targetUid.');
  }

  // Prevent non-admins from granting admin role
  if (roles && roles.includes('admin') && !callerRoles.includes('admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can grant admin role.');
  }

  try {
    const updates: any = {};
    const [targetUser, targetDoc] = await Promise.all([
      admin.auth().getUser(targetUid),
      db().collection('users').doc(targetUid).get(),
    ]);
    const existingClaims = targetUser.customClaims || {};
    const targetData = targetDoc.data() || {};
    const nextRoles = roles !== undefined ? roles : (targetData.roles || existingClaims.roles || []);
    const nextIsApproved = isApproved !== undefined ? isApproved : (targetData.isApproved ?? existingClaims.isApproved ?? false);
    
    if (roles !== undefined) {
      updates.roles = roles;
    }
    
    if (isApproved !== undefined) {
      updates.isApproved = isApproved;
    }

    await admin.auth().setCustomUserClaims(targetUid, {
      ...existingClaims,
      roles: nextRoles,
      isApproved: nextIsApproved,
    });

    if (Object.keys(updates).length > 0) {
      await db().collection('users').doc(targetUid).set(updates, { merge: true });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user access:', error);
    throw new functions.https.HttpsError('internal', 'Unable to update user access.');
  }
});

export { syncFirestoreToSql } from './sync-firestore-to-sql';

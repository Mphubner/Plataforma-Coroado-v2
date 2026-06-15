import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { MercadoPagoConfig, Preference, PreApproval } from 'mercadopago';

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

function getMpClient() {
  return new MercadoPagoConfig({
    accessToken: getMpAccessToken(),
    options: { timeout: 5000 }
  });
}

export const createPreference = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { eventId, amount, title, enrollmentId } = data;

  if (!eventId || !amount || !enrollmentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters.');
  }

  try {
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
    console.error('Error creating preference:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create preference.');
  }
});

export const createSubscription = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { planTitle, amount, enrollmentId } = data;

  if (!amount || !enrollmentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters.');
  }

  try {
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
    console.error('Error creating subscription:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create subscription.');
  }
});

export const mpWebhook = functions.https.onRequest(async (req: any, res: any) => {
  const { type, data } = req.body;

  if (type === 'payment' && data && data.id) {
    try {
      // In a real scenario, you should verify the signature here to ensure the webhook is from MP
      // Also, fetch the payment details from MP API using the data.id to ensure its status
      
      const paymentId = data.id;
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

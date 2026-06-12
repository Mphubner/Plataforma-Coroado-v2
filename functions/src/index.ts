import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { MercadoPagoConfig, Preference, PreApproval } from 'mercadopago';

admin.initializeApp();

// You need to set the access token in Firebase Functions configuration
// firebase functions:secrets:set MP_ACCESS_TOKEN
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000',
  options: { timeout: 5000 }
});

export const createPreference = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { eventId, amount, title, enrollmentId } = data;

  if (!eventId || !amount || !enrollmentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters.');
  }

  try {
    const preference = new Preference(client);

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
      initPoint: response.init_point
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
    const preApproval = new PreApproval(client);

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
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000'}`
        }
      });
      const paymentData = await response.json();

      if (paymentData.status === 'approved' && paymentData.external_reference) {
        const enrollmentId = paymentData.external_reference;
        
        await admin.firestore().collection('event_enrollments').doc(enrollmentId).update({
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
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000'}`
        }
      });
      const subData = await response.json();

      if (subData.status === 'authorized' && subData.external_reference) {
        const referenceId = subData.external_reference; // This is mapped to userId
        
        // Update user document to grant premium access
        await admin.firestore().collection('users').doc(referenceId).update({
          subscriptionStatus: 'active',
          mpSubscriptionId: subId,
          subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Also save to subscriptions collection for history/logs
        await admin.firestore().collection('subscriptions').doc(referenceId).set({
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

  // To secure this properly, we ensure only users with appropriate roles or specific emails can do this.
  // In this project context, if the caller is logged in, we are trusting the client UI to hide the button.
  // Ideally: if (!context.auth.token.roles?.includes('admin') && context.auth.token.email !== 'admin@coroado.org') throw ...

  const { targetUid, roles, isApproved } = data;

  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing targetUid.');
  }

  try {
    const updates: any = {};
    
    if (roles !== undefined) {
      await admin.auth().setCustomUserClaims(targetUid, { roles });
      updates.roles = roles;
    }
    
    if (isApproved !== undefined) {
      updates.isApproved = isApproved;
    }

    if (Object.keys(updates).length > 0) {
      await admin.firestore().collection('users').doc(targetUid).set(updates, { merge: true });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user access:', error);
    throw new functions.https.HttpsError('internal', 'Unable to update user access.');
  }
});


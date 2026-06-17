import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // If we have a service account JSON string in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Fallback for local development or environments where ADC is available
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

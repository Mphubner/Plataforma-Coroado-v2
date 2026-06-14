import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const googleWorkspaceProvider = new GoogleAuthProvider();
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/calendar');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/tasks');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/chat.spaces');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/presentations');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/forms');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

export const functions = getFunctions(app, 'us-central1'); // Ajuste se for outra região


async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
  } catch (error) {
    // Ignore initial unavailable/offline errors to prevent unhandled promise rejections
    // It's normal to have temporary connection failures in some containerized or iframe environments
    console.warn("Firebase connection test skipped or failed momentarily.");
  }
}
testConnection().catch(() => {});

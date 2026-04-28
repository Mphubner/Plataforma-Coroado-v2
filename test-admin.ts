import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();
  db.collection('test_admin_auth').add({ test: true })
    .then(() => console.log('Admin worked!'))
    .catch(e => console.error('Admin failed:', e.message));
} catch(e: any) {
  console.error("Init failed:", e.message);
}

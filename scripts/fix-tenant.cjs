const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const app = initializeApp();
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b');

async function run() {
  const users = await db.collection('users').limit(1).get();
  const tenantId = users.docs[0].data().tenantId;
  console.log('User TenantID:', tenantId);

  console.log('Fixing action_plans...');
  const snapshot = await db.collection('action_plans').where('tenantId', '==', 'tenant-1').get();
  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.update(doc.ref, { tenantId: tenantId });
  });
  await batch.commit();
  console.log(`Updated ${snapshot.size} action plans to tenantId: ${tenantId}`);
}
run().catch(console.error);

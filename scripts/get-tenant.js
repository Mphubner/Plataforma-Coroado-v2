const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const app = initializeApp();
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b');

async function run() {
  const users = await db.collection('users').limit(1).get();
  console.log('TenantID:', users.docs[0].data().tenantId);
}
run().catch(console.error);

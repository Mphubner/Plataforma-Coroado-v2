import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = initializeApp();
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
const db = getFirestore(app, firestoreDatabaseId);

async function inspect() {
  const usersRef = await db.collection('users').get();
  console.log('Users tenants:', new Set(usersRef.docs.map(d => d.data().tenantId)));
  console.log('Users IDs:', usersRef.docs.map(d => ({ email: d.data().email, tenantId: d.data().tenantId })));

  const plans = await db.collection('action_plans').get();
  console.log('Action plans tenants:', new Set(plans.docs.map(d => d.data().tenantId)));
}

inspect().catch(console.error);

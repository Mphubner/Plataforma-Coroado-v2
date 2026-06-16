import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const app = initializeApp();
import fs from 'fs';
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
const db = getFirestore(app, firestoreDatabaseId);

async function fixTenantIds() {
  console.log('Finding user tenantId...');
  const usersRef = await db.collection('users').limit(1).get();
  if (usersRef.empty) {
     console.log('No users found.');
     return;
  }
  
  const actualTenantId = usersRef.docs[0].data().tenantId || 'tenant-1';
  console.log('Target tenantId:', actualTenantId);

  const plans = await db.collection('action_plans').get();
  console.log(`Found ${plans.size} action plans.`);

  const batch = db.batch();
  let count = 0;
  
  plans.forEach(doc => {
     if (doc.data().tenantId !== actualTenantId) {
        batch.update(doc.ref, { tenantId: actualTenantId });
        count++;
     }
  });

  if (count > 0) {
     await batch.commit();
     console.log(`Updated ${count} action plans to tenantId: ${actualTenantId}`);
  } else {
     console.log('All action plans already have the correct tenantId.');
  }

  // Also fix units if necessary
  const units = await db.collection('units').get();
  const unitBatch = db.batch();
  let unitCount = 0;
  units.forEach(doc => {
     if (doc.data().tenantId !== actualTenantId) {
        unitBatch.update(doc.ref, { tenantId: actualTenantId });
        unitCount++;
     }
  });
  if (unitCount > 0) {
     await unitBatch.commit();
     console.log(`Updated ${unitCount} units to tenantId: ${actualTenantId}`);
  }
}

fixTenantIds().catch(console.error);

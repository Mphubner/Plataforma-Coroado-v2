import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = initializeApp();
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b');

async function run() {
  let count = 0;
  const kpis = await db.collection('kpi_entries').get();
  const batch = db.batch();
  kpis.docs.forEach(d => {
    const data = d.data();
    if (data.unit === 'Sede') { batch.update(d.ref, { unit: 'Coroado Sede' }); count++; }
    if (data.unit === 'Boquira') { batch.update(d.ref, { unit: 'Coroado Boquira' }); count++; }
  });

  const fins = await db.collection('financial_reports').get();
  fins.docs.forEach(d => {
    const data = d.data();
    if (data.unit === 'Sede') { batch.update(d.ref, { unit: 'Coroado Sede' }); count++; }
    if (data.unit === 'Boquira') { batch.update(d.ref, { unit: 'Coroado Boquira' }); count++; }
  });

  const units = await db.collection('units').get();
  units.docs.forEach(d => {
    const data = d.data();
    if (data.name === 'Sede') { batch.update(d.ref, { name: 'Coroado Sede' }); count++; }
    if (data.name === 'Boquira') { batch.update(d.ref, { name: 'Coroado Boquira' }); count++; }
  });

  await batch.commit();
  console.log(`Updated ${count} records.`);
}
run().catch(console.error);

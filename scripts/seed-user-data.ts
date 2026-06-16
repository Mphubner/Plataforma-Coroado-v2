import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = initializeApp();
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b');

const frequencias = [
  { date: '2026-05-24', unit: 'Boquira', serviceTime: 'Culto Único', actualValue: 35, kids: 0, servants: 0, visitors: 8, teens: 0 },
  { date: '2026-05-24', unit: 'Coroado Norte', serviceTime: 'Culto Único', actualValue: 148, kids: 34, servants: 23, visitors: 7, teens: 0 },
  { date: '2026-05-24', unit: 'Sede', serviceTime: 'Culto Manhã (10h)', actualValue: 53, kids: 0, servants: 21, visitors: 1, teens: 0 },
  { date: '2026-05-24', unit: 'Sede', serviceTime: 'Culto Noite (18h)', actualValue: 278, kids: 0, servants: 34, visitors: 9, teens: 0 },
  { date: '2026-05-24', unit: 'Sede', serviceTime: 'Culto Noite (20h)', actualValue: 97, kids: 0, servants: 30, visitors: 5, teens: 0 },
  { date: '2026-05-24', unit: 'Sede', serviceTime: 'Ministério Kids', actualValue: 0, kids: 10, servants: 25, visitors: 0, teens: 0 },
  { date: '2026-05-24', unit: 'Sede', serviceTime: 'Ministério Teens', actualValue: 6, kids: 0, servants: 15, visitors: 0, teens: 0 },
  { date: '2026-05-31', unit: 'Boquira', serviceTime: 'Culto Único', actualValue: 38, kids: 0, servants: 0, visitors: 4, teens: 0 },
  { date: '2026-05-31', unit: 'Coroado Norte', serviceTime: 'Culto Único', actualValue: 137, kids: 35, servants: 25, visitors: 12, teens: 0 },
  { date: '2026-05-31', unit: 'Sede', serviceTime: 'Culto Manhã (10h)', actualValue: 40, kids: 0, servants: 15, visitors: 1, teens: 0 },
  { date: '2026-05-31', unit: 'Sede', serviceTime: 'Culto Noite (18h)', actualValue: 279, kids: 0, servants: 33, visitors: 5, teens: 0 },
  { date: '2026-05-31', unit: 'Sede', serviceTime: 'Culto Noite (20h)', actualValue: 84, kids: 0, servants: 27, visitors: 5, teens: 0 },
  { date: '2026-06-07', unit: 'Boquira', serviceTime: 'Culto Único', actualValue: 21, kids: 0, servants: 0, visitors: 1, teens: 0 },
  { date: '2026-06-07', unit: 'Coroado Norte', serviceTime: 'Culto Único', actualValue: 114, kids: 38, servants: 18, visitors: 8, teens: 0 },
  { date: '2026-06-07', unit: 'Sede', serviceTime: 'Culto Líder (9h)', actualValue: 79, kids: 0, servants: 19, visitors: 0, teens: 0 },
  { date: '2026-06-07', unit: 'Sede', serviceTime: 'Culto Noite (18h)', actualValue: 247, kids: 0, servants: 30, visitors: 2, teens: 0 },
  { date: '2026-06-07', unit: 'Sede', serviceTime: 'Culto Noite (20h)', actualValue: 112, kids: 0, servants: 31, visitors: 1, teens: 0 },
  { date: '2026-06-07', unit: 'Sede', serviceTime: 'Ministério Kids', actualValue: 0, kids: 30, servants: 14, visitors: 0, teens: 0 },
];

const financeiro = [
  { date: '2026-05-03', unit: 'Sede', category: 'Dízimos e Ofertas', title: 'Arrecadação 1ª Semana - Maio', amount: 30673.42 },
  { date: '2026-05-10', unit: 'Sede', category: 'Dízimos e Ofertas', title: 'Arrecadação 2ª Semana - Maio', amount: 18793.04 },
  { date: '2026-05-17', unit: 'Sede', category: 'Dízimos e Ofertas', title: 'Arrecadação 3ª Semana - Maio', amount: 12535.47 },
  { date: '2026-05-24', unit: 'Sede', category: 'Dízimos e Ofertas', title: 'Arrecadação 4ª Semana - Maio', amount: 24842.81 },
  { date: '2026-05-03', unit: 'Coroado Norte', category: 'Dízimos e Ofertas', title: 'Arrecadação 1ª Semana - Maio', amount: 4154.22 },
  { date: '2026-05-10', unit: 'Coroado Norte', category: 'Dízimos e Ofertas', title: 'Arrecadação 2ª Semana - Maio', amount: 1052.00 },
  { date: '2026-05-17', unit: 'Coroado Norte', category: 'Dízimos e Ofertas', title: 'Arrecadação 3ª Semana - Maio', amount: 2822.00 },
  { date: '2026-05-24', unit: 'Coroado Norte', category: 'Dízimos e Ofertas', title: 'Arrecadação 4ª Semana - Maio', amount: 15924.13 },
  { date: '2026-06-07', unit: 'Sede', category: 'Dízimos e Ofertas', title: 'Arrecadação 1ª Semana - Junho', amount: 50926.56 },
  { date: '2026-06-14', unit: 'Sede', category: 'Dízimos e Ofertas', title: 'Arrecadação 2ª Semana - Junho', amount: 19578.22 },
  { date: '2026-06-07', unit: 'Coroado Norte', category: 'Dízimos e Ofertas', title: 'Arrecadação 1ª Semana - Junho', amount: 9464.60 },
  { date: '2026-06-14', unit: 'Coroado Norte', category: 'Dízimos e Ofertas', title: 'Arrecadação 2ª Semana - Junho', amount: 3533.63 },
  { date: '2026-06-15', unit: 'Sede', category: 'Livraria', title: 'Vendas 1ª Quinzena Junho', amount: 2609.97 },
  { date: '2026-06-15', unit: 'Coroado Norte', category: 'Bazar', title: 'Arrecadação Bazar (Destino Sede)', amount: 1288.00 },
];

const social = [
  { kpiName: 'kpi_social_atendimentos', date: '2026-05-31', isOverride: true, socialPaid: 97, socialFree: 6, actualValue: 103, notes: 'Fechamento consolidado de Maio de 2026.' }
];

async function run() {
  const users = await db.collection('users').limit(1).get();
  const tenantId = users.docs[0].data().tenantId;
  console.log('Seeding for tenant:', tenantId);

  const batch = db.batch();

  // Seed Frequencias
  for (const f of frequencias) {
    const docRef = db.collection('kpi_entries').doc();
    batch.set(docRef, {
      kpiName: 'kpi_frequencia_celebracoes',
      ...f,
      tenantId,
      createdAt: FieldValue.serverTimestamp()
    });
  }

  // Seed Financeiro
  for (const fin of financeiro) {
    const docRef = db.collection('financial_reports').doc();
    batch.set(docRef, {
      ...fin,
      tenantId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  // Seed Social
  for (const soc of social) {
    const docRef = db.collection('kpi_entries').doc();
    batch.set(docRef, {
      ...soc,
      tenantId,
      createdAt: FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
  console.log('Successfully seeded user data.');
}

run().catch(console.error);

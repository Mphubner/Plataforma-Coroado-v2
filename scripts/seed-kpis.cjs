const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
require('dotenv').config();

const app = initializeApp();
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b');

const KPIS = [
  {
    id: 'kpi_celulas',
    title: 'QTD DE CÉLULAS',
    pillar: 'Crescer',
    targetData: {
      2025: 149, 2026: 161, 2027: 193, 2028: 232, 2029: 278, 2030: 334, 2031: 401
    },
    actualData: {},
    color: 'border-blue-500/50'
  },
  {
    id: 'kpi_batismos',
    title: 'BATISMOS Realizados',
    pillar: 'Crescer',
    targetData: {
      2025: 79, 2026: 89, 2027: 111, 2028: 139, 2029: 174, 2030: 217, 2031: 272
    },
    actualData: {},
    color: 'border-cyan-500/50'
  },
  {
    id: 'kpi_freq_sede',
    title: 'CRD SEDE (Frequência nos cultos)',
    pillar: 'Crescer',
    targetData: {
      2025: 330, 2026: 350, 2027: 385, 2028: 423.5, 2029: 465.85, 2030: 512, 2031: 564
    },
    actualData: {},
    color: 'border-orange-500/50'
  },
  {
    id: 'kpi_freq_norte',
    title: 'CRD NORTE (Frequência nos cultos)',
    pillar: 'Crescer',
    targetData: {
      2025: 100, 2026: 120, 2027: 132, 2028: 145, 2029: 160, 2030: 176, 2031: 193
    },
    actualData: {},
    color: 'border-yellow-500/50'
  },
  {
    id: 'kpi_freq_br',
    title: 'CRD BR (Frequência nos cultos)',
    pillar: 'Crescer',
    targetData: {
      2025: 0, 2026: 82, 2027: 100, 2028: 110, 2029: 121, 2030: 133, 2031: 146
    },
    actualData: {},
    color: 'border-green-500/50'
  },
  {
    id: 'kpi_freq_celulas',
    title: 'FREQUÊNCIAS NAS CÉLULAS',
    pillar: 'Crescer',
    targetData: {
      2025: 1400, 2026: 1600, 2027: 1840, 2028: 2116, 2029: 2433, 2030: 2798, 2031: 3218
    },
    actualData: {},
    color: 'border-purple-500/50'
  },
  {
    id: 'kpi_lideres',
    title: 'TOTAL DE LÍDERES',
    pillar: 'Crescer',
    targetData: {
      2025: 123, 2026: 140, 2027: 168, 2028: 202, 2029: 242, 2030: 290, 2031: 348
    },
    actualData: {},
    color: 'border-pink-500/50'
  }
];

async function run() {
  const users = await db.collection('users').limit(1).get();
  const tenantId = users.docs[0].data().tenantId;
  console.log('Seeding KPIs for tenant:', tenantId);

  const batch = db.batch();
  
  for (const kpi of KPIS) {
    const docRef = db.collection('kpi_goals').doc(kpi.id);
    batch.set(docRef, {
      ...kpi,
      tenantId: tenantId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true }); // Merge in case they exist so we don't wipe actualData
  }

  await batch.commit();
  console.log(`Successfully seeded ${KPIS.length} KPIs.`);
}

run().catch(console.error);

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const app = initializeApp();
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b';
const db = getFirestore(app, firestoreDatabaseId);
const defaultTenantId = process.env.DEFAULT_TENANT_ID || process.env.PLATFORM_TENANT_ID || 'tenant-1';

const events = [
  { event_date: '2026-06-01T20:00:00', title: 'Semana de Consagração', category: 'Semana de Consagração', theme: '-', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-06T20:00:00', title: 'Wake', category: 'Eventos de Ministérios', theme: '-', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-07T09:00:00', title: 'Culto do Líder (Café Compartilhado)', category: 'Eventos no Domingo', theme: 'Vivendo em comunhão', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-07T10:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Vivendo em comunhão', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-07T18:00:00', title: 'Culto de Domingo (Ceia)', category: 'Eventos no Domingo', theme: 'Vivendo em comunhão', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-07T20:00:00', title: 'Culto de Domingo (Ceia)', category: 'Eventos no Domingo', theme: 'Vivendo em comunhão', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-14T10:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Discipulado que transforma', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-14T18:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Discipulado que transforma', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-14T20:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Discipulado que transforma', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-19T20:00:00', title: 'Encontro Bravos / Preciosas', category: 'Eventos de Ministérios', theme: '-', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-20T19:30:00', title: 'Supervisione', category: 'Eventos de Ministérios', theme: '-', season: 'Celebra', visibility: 'NÃO' },
  { event_date: '2026-06-21T10:00:00', title: 'Culto de Domingo (Apresentação Bebê)', category: 'Eventos no Domingo', theme: 'Liderança que serve', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-21T18:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Liderança que serve', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-21T20:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Liderança que serve', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-24T20:00:00', title: 'Culto Lugar Secreto', category: 'Celebrações de Quarta', theme: '-', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-28T10:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Fruto que permanece', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-28T18:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Fruto que permanece', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-06-28T20:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Fruto que permanece', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-07-04T20:00:00', title: 'Wake', category: 'Eventos de Ministérios', theme: '-', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-07-05T09:00:00', title: 'Culto do Líder', category: 'Eventos no Domingo', theme: 'Chamados para crescer', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-08-21T20:00:00', title: 'CONF CRD 26 - Tempo de Avançar', category: 'Eventos de Ministérios', theme: 'Firmados na Palavra', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-09-06T10:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Discipulado que transforma', season: 'Crescer', visibility: 'SIM' },
  { event_date: '2026-10-04T10:00:00', title: 'Culto de Domingo (Ceia)', category: 'Eventos no Domingo', theme: 'Finanças', season: 'Crescer', visibility: 'SIM' },
  { event_date: '2026-11-22T10:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Vivendo em comunhão', season: 'Crescer', visibility: 'SIM' },
  { event_date: '2026-12-31T22:00:00', title: 'Culto da Virada', category: 'Eventos Especiais', theme: '-', season: 'Cuidar', visibility: 'SIM' },
];

async function run() {
  console.log('Limpando eventos anteriores gerados pelo seeder...');
  
  // Limpa apenas eventos que foram criados sem "date" (que caíram no fallback de 2026-01-01) ou com tenant-1
  const snapshot = await db.collection('events').get();
  let batch = db.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.date || data.tenantId === 'tenant-1') {
      batch.delete(doc.ref);
      count++;
      if (count % 500 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }
  await batch.commit();

  console.log('Inserindo eventos formatados corretamente...');
  batch = db.batch();
  count = 0;

  for (const ev of events) {
    const ref = db.collection('events').doc();
    
    // Convert '2026-06-01T20:00:00' to date and time parts
    const [datePart, timePart] = ev.event_date.split('T');
    const timeFormatted = timePart.substring(0, 5); // "20:00"

    batch.set(ref, {
      title: ev.title,
      date: datePart, // YYYY-MM-DD
      time: timeFormatted, // HH:MM
      location: 'Campus Sede',
      category: ev.category,
      type: ev.category,
      description: ev.theme !== '-' ? `Tema: ${ev.theme}` : 'Evento especial da nossa igreja.',
      season: ev.season,
      visibilityScope: ev.visibility === 'SIM' ? 'church' : 'leaders',
      tenantId: defaultTenantId,
      capacity: 500,
      enrolled: 0,
      requiresRegistration: true,
      status: 'approved',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log('Eventos corrigidos com sucesso! ✅');
}

run().catch(console.error);

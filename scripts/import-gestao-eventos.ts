import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// We must use the service account if we have one or use the default ADC if logged into GCP CLI.
const app = initializeApp();

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b';
const db = getFirestore(app, firestoreDatabaseId);

// Sample Data derived from Google Doc
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
  // Adding just a subset to test import logic without overwhelming memory, can be fully loaded if needed. We'll load a few more from July to December
  { event_date: '2026-07-04T20:00:00', title: 'Wake', category: 'Eventos de Ministérios', theme: '-', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-07-05T09:00:00', title: 'Culto do Líder', category: 'Eventos no Domingo', theme: 'Chamados para crescer', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-08-21T20:00:00', title: 'CONF CRD 26 - Tempo de Avançar', category: 'Eventos de Ministérios', theme: 'Firmados na Palavra', season: 'Celebra', visibility: 'SIM' },
  { event_date: '2026-09-06T10:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Discipulado que transforma', season: 'Crescer', visibility: 'SIM' },
  { event_date: '2026-10-04T10:00:00', title: 'Culto de Domingo (Ceia)', category: 'Eventos no Domingo', theme: 'Finanças', season: 'Crescer', visibility: 'SIM' },
  { event_date: '2026-11-22T10:00:00', title: 'Culto de Domingo', category: 'Eventos no Domingo', theme: 'Vivendo em comunhão', season: 'Crescer', visibility: 'SIM' },
  { event_date: '2026-12-31T22:00:00', title: 'Culto da Virada', category: 'Eventos Especiais', theme: '-', season: 'Cuidar', visibility: 'SIM' },
];

const actionPlans = [
  {
    group_department: 'Gestão Ministerial',
    root_problem: 'Falta de Braço',
    action_title: 'Contratar um Gestor para Ministérios.',
    budget: 35000.00,
    due_date: '2026-09-14',
    assignee_name: 'Rafael',
    strategy_detail: 'Orar pelos Ministérios. Estabelecer um calendário de reuniões. Treinamentos e Estabelecer metodos.'
  },
  {
    group_department: 'Gestão Ministerial',
    root_problem: 'Falta de Voluntáriado Motivação',
    action_title: 'Capacitação (Trilho/ Escola Ide/ Manual / Termo Voluntário) e Acompanhamento',
    budget: 1000.00,
    due_date: '2026-03-24',
    assignee_name: 'Leandro',
    strategy_detail: '-'
  },
  {
    group_department: 'Comunicação',
    root_problem: 'Falta de Braço',
    action_title: 'Contratar um Gestor para Comunicação.',
    budget: 18000.00,
    due_date: '2026-09-14',
    assignee_name: 'Rafael',
    strategy_detail: 'Orar pelo Ministério. Estabelecer criterios para contratação.'
  },
  {
    group_department: 'Gestão das Células',
    root_problem: 'Falta da Formação Continuada da Liderança',
    action_title: 'Capacitação (Trilho/ Escola Ide/ Manual / Termo Voluntário) e Acompanhamento',
    budget: 0.00,
    due_date: '2026-03-08',
    assignee_name: 'Leandro',
    strategy_detail: '-'
  },
  {
    group_department: 'Financeiro da Igreja',
    root_problem: 'Baixa arrecadação',
    action_title: 'Ensinar sobre Educação Financeira',
    budget: 0.00,
    due_date: '2026-02-03',
    assignee_name: 'Rafael',
    strategy_detail: '-'
  },
  {
    group_department: 'Falta de Discipulado nas Células',
    root_problem: 'Falta de Disponibilidade',
    action_title: 'Cursos na Escola IDE',
    budget: 2500.00,
    due_date: '2026-05-12',
    assignee_name: 'Leandro',
    strategy_detail: '-'
  }
];

function getSeasonColor(season: string) {
  if (season === 'Celebra') return '#F9A03F';
  if (season === 'Crescer') return '#2A9D8F';
  if (season === 'Cuidar') return '#3A86FF';
  return '#cccccc';
}

async function run() {
  console.log('Iniciando Seeder de Eventos e Gestão...');

  const batchSize = 500;
  let batch = db.batch();
  let count = 0;

  // 1. Import Events
  console.log(`Precedendo inserção de ${events.length} eventos...`);
  for (const ev of events) {
    const ref = db.collection('events').doc();
    batch.set(ref, {
      title: ev.title,
      event_date: ev.event_date,
      category: ev.category,
      description: ev.theme !== '-' ? `Tema: ${ev.theme}` : '',
      season: ev.season,
      color_hex: getSeasonColor(ev.season),
      visibility: ev.visibility === 'SIM' ? 'public' : 'private',
      tenantId: 'tenant-1',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  // 2. Import Action Plans
  console.log(`Precedendo inserção de ${actionPlans.length} planos de ação...`);
  for (const plan of actionPlans) {
    const ref = db.collection('action_plans').doc();
    batch.set(ref, {
      strategic_origin: 'METAS_GLOBAIS',
      group_department: plan.group_department,
      root_problem: plan.root_problem,
      action_title: plan.action_title,
      strategy_detail: plan.strategy_detail,
      budget: plan.budget,
      due_date: plan.due_date,
      assignee_name: plan.assignee_name,
      status: 'Pendente',
      tenantId: 'tenant-1',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log('Seeder concluído com sucesso! ✅');
}

run().catch(console.error);

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const app = initializeApp();
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b';
const db = getFirestore(app, firestoreDatabaseId);
const defaultTenantId = process.env.DEFAULT_TENANT_ID || process.env.PLATFORM_TENANT_ID || 'tenant-1';

const ACTION_PLANS = [
  // Comunicação e Mídias
  {
    group_department: 'Comunicação e Mídias',
    root_problem: 'Falta de engajamento online',
    action_title: 'Reestruturação das Redes Sociais',
    strategy_detail: 'Criar um cronograma de postagens diárias e interagir mais com o público, incluindo vídeos curtos.',
    assignee_name: 'Equipe de Mídia',
    budget: 500,
    due_date: '2026-07-15',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Comunicação e Mídias',
    root_problem: 'Equipamentos defasados',
    action_title: 'Atualização das Câmeras',
    strategy_detail: 'Cotar e comprar 2 novas câmeras 4K para a transmissão dos cultos.',
    assignee_name: 'Líder de Mídia',
    budget: 15000,
    due_date: '2026-08-10',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  // Capacitação e Escola Bíblica
  {
    group_department: 'Capacitação e Escola Bíblica',
    root_problem: 'Baixa assiduidade',
    action_title: 'Novo Currículo EBD',
    strategy_detail: 'Implementar um currículo mais dinâmico voltado para os desafios atuais das famílias e jovens.',
    assignee_name: 'Pastor de Ensino',
    budget: 1200,
    due_date: '2026-07-20',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Capacitação e Escola Bíblica',
    root_problem: 'Falta de professores',
    action_title: 'Treinamento de Professores',
    strategy_detail: 'Realizar um workshop de 2 dias para capacitar novos voluntários para o ensino infantil e adulto.',
    assignee_name: 'Coordenação EBD',
    budget: 800,
    due_date: '2026-09-05',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  // Planejamento Financeiro e Obras
  {
    group_department: 'Planejamento Financeiro e Obras',
    root_problem: 'Infiltração no templo',
    action_title: 'Reforma do Telhado',
    strategy_detail: 'Contratar empreiteira para trocar as telhas danificadas e impermeabilizar a laje antes do período de chuvas.',
    assignee_name: 'Administração',
    budget: 25000,
    due_date: '2026-10-15',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Planejamento Financeiro e Obras',
    root_problem: 'Falta de reserva financeira',
    action_title: 'Campanha de Arrecadação Especial',
    strategy_detail: 'Lançar a campanha "Construindo o Futuro" para criar um fundo de reserva para emergências e expansão.',
    assignee_name: 'Tesouraria',
    budget: 0,
    due_date: '2026-08-01',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  // Ação Social
  {
    group_department: 'Ação Social',
    root_problem: 'Falta de mantimentos na despensa',
    action_title: 'Mutirão de Arrecadação de Alimentos',
    strategy_detail: 'Mobilizar as células para uma gincana solidária visando arrecadar 2 toneladas de alimentos não perecíveis.',
    assignee_name: 'Líder de Ação Social',
    budget: 300,
    due_date: '2026-11-20',
    status: 'Pendente',
    tenantId: defaultTenantId
  }
];

async function seedActionPlans() {
  console.log('Starting action plans seeding...');
  
  let count = 0;
  for (const plan of ACTION_PLANS) {
    const docRef = db.collection('action_plans').doc();
    await docRef.set({
      ...plan,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    count++;
    console.log(`Created plan: ${plan.action_title}`);
  }

  console.log(`Seeding complete. Created ${count} action plans.`);
}

seedActionPlans().catch(console.error);

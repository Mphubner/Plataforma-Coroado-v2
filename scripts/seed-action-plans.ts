import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const app = initializeApp();
import firebaseConfig from '../firebase-applet-config.json';

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
const db = getFirestore(app, firestoreDatabaseId);
const defaultTenantId = process.env.DEFAULT_TENANT_ID || process.env.PLATFORM_TENANT_ID || 'tenant-1';

const ACTION_PLANS = [
  // Financeiro SWOT (Fraqueza)
  {
    group_department: 'Estratégico Financeiro', // Adjusted from [Financeiro SWOT] Fraqueza
    root_problem: 'Queda na Arrecadação',
    action_title: 'Conectar com membros desmotivados',
    strategy_detail: 'Criar um plano de cuidado (ligações, visitas).',
    assignee_name: 'Líderes / Pastores',
    budget: 0.00,
    due_date: '2026-06-30', // Imediato
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Financeiro',
    root_problem: 'Queda na Arrecadação',
    action_title: 'Fortalecer cultura de pertencimento',
    strategy_detail: 'Estudos e pregações sobre comunhão.',
    assignee_name: 'Pastores',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Financeiro',
    root_problem: 'Queda na Arrecadação',
    action_title: 'Liderança mais comprometida',
    strategy_detail: 'Ensino sobre princípios de fidelidade.',
    assignee_name: 'Pastor',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Financeiro',
    root_problem: 'Ausência de Planejamento',
    action_title: 'Criar planejamento de curto/médio prazo',
    strategy_detail: 'Planejamento inicial de 6 em 6 meses.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Financeiro',
    root_problem: 'Ausência de Planejamento',
    action_title: 'Controle por áreas/ministérios',
    strategy_detail: 'Relatórios mensais de despesas.',
    assignee_name: 'Financeiro',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Financeiro',
    root_problem: 'Fundo de Reserva Insuficiente',
    action_title: 'Construir fundo equivalente a 6 meses',
    strategy_detail: 'Separar 10% (5% reserva, 5% expansão).',
    assignee_name: 'Financeiro',
    budget: 0.00,
    due_date: '2026-06-30', // Imediato
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Financeiro',
    root_problem: 'Dependência Exclusiva de Dízimos',
    action_title: 'Criar novas fontes de arrecadação',
    strategy_detail: 'Conferências, Livraria, Bazar.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  // Estratégico SWOT (Oportunidade)
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Escola Ide',
    action_title: 'Cursos Ministeriais',
    strategy_detail: 'Cursos e capacitações p/ público interno/externo.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Uso da Estrutura Física',
    action_title: 'Locação pontual de espaços',
    strategy_detail: 'Eventos Cristãos alinhados com a visão.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Mídias Digitais',
    action_title: 'Fortalecimento da Comunicação',
    strategy_detail: 'Monetização Youtube, Spotify e Podcast.',
    assignee_name: 'Comunicação',
    budget: 0.00,
    due_date: '2026-06-30', // Imediato
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  // Outras áreas
  {
    group_department: 'Gestão Ministerial',
    root_problem: 'Falta de Braço',
    action_title: 'Contratar um Gestor para Ministérios',
    strategy_detail: 'Orar pelos Ministérios. Estabelecer um calendário de reuniões. Treinamentos e Métodos.',
    assignee_name: 'Rafael',
    budget: 35000.00,
    due_date: '2026-09-14',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Gestão Ministerial',
    root_problem: 'Falta de Voluntáriado Motivação',
    action_title: 'Capacitação (Trilho/ Escola Ide/ Manual)',
    strategy_detail: '-',
    assignee_name: 'Leandro',
    budget: 1000.00,
    due_date: '2026-03-24',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Gestão Ministerial',
    root_problem: 'Falta de Alinhamento com a visão',
    action_title: 'Estabelecer agenda com líderes para processos',
    strategy_detail: '1/13/2026 (Data inicial).',
    assignee_name: 'Rafael',
    budget: 0.00,
    due_date: '2026-02-17',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Eventos Criativos',
    root_problem: 'Falta de Produtor de Eventos',
    action_title: 'Encontrar servo para Produção e Organização',
    strategy_detail: 'Eventos importantes que envolva as Células e as Estações.',
    assignee_name: 'Jade',
    budget: 0.00,
    due_date: '2026-02-10',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Comunicação',
    root_problem: 'Falta de Braço',
    action_title: 'Contratar um Gestor para Comunicação',
    strategy_detail: 'Orar pelo Ministério. Estabelecer criterios para contratação.',
    assignee_name: 'Rafael',
    budget: 18000.00,
    due_date: '2026-09-14',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Comunicação',
    root_problem: 'Falta de Processos Inernos e Externo',
    action_title: 'Implementar processos de Comunicação',
    strategy_detail: '-',
    assignee_name: 'Jade',
    budget: 0.00,
    due_date: '2026-02-03',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Comunicação',
    root_problem: 'Falta do Ministério de Comunicação',
    action_title: 'Capacitação (Trilho/ Escola Ide/ Manual)',
    strategy_detail: '-',
    assignee_name: 'Jade',
    budget: 0.00,
    due_date: '2026-03-31',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Comunicação',
    root_problem: 'Redes Sociais',
    action_title: 'Reunião com Servos (Urgente)',
    strategy_detail: '-',
    assignee_name: 'Jade',
    budget: 150.00,
    due_date: '2026-01-17',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Gestão das Células',
    root_problem: 'Falta de Utilização',
    action_title: 'Conscientização da importância do Fiel Web',
    strategy_detail: '-',
    assignee_name: 'Prisciely',
    budget: 0.00,
    due_date: '2026-02-04',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Gestão das Células',
    root_problem: 'Falta de Relatório',
    action_title: 'Monitorar o preenchimento no Fiel Web',
    strategy_detail: '-',
    assignee_name: 'Prisciely',
    budget: 0.00,
    due_date: '2026-03-13',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Gestão das Células',
    root_problem: 'Falta da Formação Continuada da Liderança',
    action_title: 'Capacitação e Acompanhamento',
    strategy_detail: '-',
    assignee_name: 'Leandro',
    budget: 0.00,
    due_date: '2026-03-08',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Financeiro da Igreja',
    root_problem: 'Baixa arrecadação',
    action_title: 'Ensinar sobre Educação Financeira',
    strategy_detail: '-',
    assignee_name: 'Rafael',
    budget: 0.00,
    due_date: '2026-02-03',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Financeiro da Igreja',
    root_problem: 'Falta de Planejamento',
    action_title: 'Criar um Plano de Ação Financeiro (SWOT)',
    strategy_detail: '-',
    assignee_name: 'Josi',
    budget: 0.00,
    due_date: '2026-02-03',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Financeiro da Igreja',
    root_problem: 'Fonte de captação de Recursos',
    action_title: 'Avaliar as possibilidades financeiras',
    strategy_detail: '-',
    assignee_name: 'Josi',
    budget: 0.00,
    due_date: '2026-02-03',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Financeiro da Igreja',
    root_problem: 'Ministérios Autosustentavéis',
    action_title: 'Eventos com inscrições, Cantinas e Livraria',
    strategy_detail: '-',
    assignee_name: 'Josi',
    budget: 0.00,
    due_date: '2026-02-17',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Financeiro da Igreja',
    root_problem: 'Falta Transparência (Relatório)',
    action_title: 'Demonstrativos e Informativo da Finanças',
    strategy_detail: '-',
    assignee_name: 'Josi',
    budget: 0.00,
    due_date: '2026-03-08',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Discipulado nas Células',
    root_problem: 'Falta de Entendimento',
    action_title: 'Criação da Jornada do Discipulado',
    strategy_detail: 'Grupos intencionais visando fortalecer a visao celular.',
    assignee_name: 'Marcos',
    budget: 50.00,
    due_date: '2026-03-08',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Discipulado nas Células',
    root_problem: 'Falta de Disponibilidade',
    action_title: 'Cursos na Escola IDE',
    strategy_detail: '-',
    assignee_name: 'Leandro',
    budget: 2500.00,
    due_date: '2026-05-12',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Discipulado nas Células',
    root_problem: 'Formação Deficit do líder',
    action_title: 'Pregações Intencionais e Estudo da Célula',
    strategy_detail: '-',
    assignee_name: 'Rafael',
    budget: 0.00,
    due_date: '2026-02-03',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Discipulado nas Células',
    root_problem: 'Falta de Maturidade',
    action_title: 'Multiplicação dos Grupos de Discipulado',
    strategy_detail: '-',
    assignee_name: 'Alan',
    budget: 0.00,
    due_date: '2026-02-08',
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Unidade Norte',
    action_title: 'Estabelecer Ministérios, Consolidação e Integração',
    strategy_detail: 'Estabelecer a liderança da Igreja e criar plano.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Unidade BR',
    action_title: 'Seguir o Cronograma de Plantação da Unidade',
    strategy_detail: 'Cronograma de açoes.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Unidade Boquira',
    action_title: 'Criar um cronograma de ações especificas anual',
    strategy_detail: 'Criar uma agenda de Acompanhamento e Discipulado.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Unidade Caturama',
    action_title: 'Criar um cronograma de ações especificas anual',
    strategy_detail: 'Criar uma agenda de Acompanhamento e Discipulado.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Mapa de expansão',
    action_title: 'Estudar próximas plantações',
    strategy_detail: 'Mapear, Estudar e apresentar um plano de Expansão.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Grupos de Discipulados',
    action_title: 'Multiplicação dos Grupos',
    strategy_detail: 'Gerar uma Cultura do Discipulado.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Legendários e Esposas',
    action_title: 'Integração com o Ministério da Familias',
    strategy_detail: 'Criar ações para integrações dos Legendarios e Esposas.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Escola IDE',
    action_title: 'Novos cursos e abertura para outras igrejas',
    strategy_detail: 'Estudar e analisar os cenarios para implantaçao de cursos.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  },
  {
    group_department: 'Estratégico Geral',
    root_problem: 'Livraria',
    action_title: 'Criar açoes para expandir as vendas',
    strategy_detail: 'Apresentar um plano de negocio.',
    assignee_name: '-',
    budget: 0.00,
    due_date: null,
    status: 'Pendente',
    tenantId: defaultTenantId
  }
];

async function seedActionPlans() {
  console.log('Starting action plans seeding...');
  
  // Wipe existing action plans first to avoid duplicates
  const existing = await db.collection('action_plans').get();
  const batch = db.batch();
  existing.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log('Cleared existing action plans.');

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

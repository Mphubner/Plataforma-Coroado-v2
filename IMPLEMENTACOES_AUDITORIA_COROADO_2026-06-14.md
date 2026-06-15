# Finalizacao da rodada

- Nova rodada de evolucao: criada ponte incremental para Next.js em `src/app`, mantendo a SPA atual funcionando por Vite.
- Nova camada tRPC criada em `src/server/trpc.ts` e exposta em `/api/trpc`, reaproveitando Firebase Auth e regras server-side.
- Operacoes compartilhadas de backend criadas em `src/server/operations.ts` para evitar duplicacao entre REST e tRPC.
- Check-in de eventos foi movido para BFF em `POST /api/event-enrollments/:enrollmentId/check-in`, com validacao de papel, tenant e status de pagamento.
- Progresso de aulas da Escola IDE foi movido para BFF em `POST /api/school/enrollments/:enrollmentId/progress`, recalculando progresso a partir das aulas reais do curso.
- Criacao de planos financeiros foi movida para BFF em `POST /api/admin/plans`, mantendo leitura em tempo real pelo Firestore.
- Webhook Mercado Pago passou a tratar pedidos e inscricoes de eventos, gerar/atualizar transacoes financeiras e registrar eventos idempotentes em `payment_events`.
- Modelo SQL/BI inicial criado em `docs/sql-bi/coroado_finance_indicators_model.sql`, cobrindo financeiro, pedidos, eventos, celulas, escola e KPIs.
- Camada visual inicial de motion criada em `src/lib/motion/presets.ts` e aplicada no financeiro administrativo.
- Smoke tests de fluxo criados em `scripts/flow-smoke-tests.mjs` e expostos por `npm run test:flows`.
- `npm run next:build`, `npm run validate` e `npm run test:flows` passaram nesta rodada.
- Eventos agora usam a rota BFF autenticada `POST /api/events/:eventId/enroll` para inscricao gratuita ou paga.
- Eventos pagos criam a preferencia Mercado Pago no backend e devolvem o link real de pagamento para o frontend.
- O financeiro administrativo agora usa `POST /api/admin/transactions/:transactionId/reconcile` para confirmar ou rejeitar transacoes pendentes.
- A conciliacao financeira registra `reconciledAt`, `reconciledBy` e observacao, reduzindo alteracoes sensiveis feitas diretamente pelo cliente.
- O comando `npm run start` foi ajustado para funcionar no Windows ao subir o servidor em modo de producao.
- `npm run validate` passou apos a rota BFF de eventos, conciliacao financeira, Java/Firestore Emulator e build de producao.

# Implementações da Auditoria Coroado - 2026-06-14

## Correções implementadas

### Segurança e contratos de dados

- Criação de `src/lib/domain/collections.ts` como mapa central das coleções Firestore usadas pela plataforma.
- Criação de `src/lib/domain/platform-contracts.ts` com contratos Zod para payloads críticos de visitantes e checkout.
- Expansão de `src/lib/domain/platform-contracts.ts` para contratos de `cell_reports`, `transactions`, `event_enrollments`, `orders` e perfis de membros.
- Expansão de `src/lib/domain/payloads.ts` com builders leves para relatórios de células, contribuições financeiras pendentes e inscrições de eventos.
- Criação de serviços de domínio em `src/lib/services/` para relatórios de célula, contribuições financeiras e inscrições de eventos.
- Expansão dos contratos e builders para edição de membros, tarefas pastorais, agendamentos pastorais, atendimentos sociais e profissionais sociais.
- Criação de serviços de domínio em `src/lib/services/` para membros, pastoral e social.
- Expansão dos contratos e builders para cursos, módulos, aulas, trilhas, matrículas, progresso, tarefas de planejamento, comentários de tarefas, ministérios, escalas e briefings.
- Criação de serviços de domínio em `src/lib/services/` para escola, planejamento e ministérios.
- Criação de `src/lib/api/http.ts` como cliente HTTP tipado para preparar a futura camada tRPC/BFF.
- Criação da rota BFF autenticada `POST /api/contributions` para registrar contribuições financeiras pelo backend.
- Separação do BFF em módulos por domínio dentro de `src/server/`: contexto/autenticação, público, admin, checkout, financeiro, escola, Mercado Pago e notificações.
- Criação da rota BFF autenticada `POST /api/school/enrollments` para matrícula na Escola IDE pelo backend.
- Conexão dos contratos no backend (`server.ts`) e nos fluxos de `HomeView` e `StoreView`.
- Criação de `firebase.json` com Firestore Rules, Firestore Indexes, Functions, Hosting e emuladores.
- Criação de `firestore.indexes.json` vazio para permitir deploy/validação sem referência quebrada.
- Correção do `eslint.config.js` para usar o parser próprio de regras Firebase em arquivos `.rules`.
- Instalação/configuração de Java 21 portátil em `C:\Users\marco\.codex\tools\jdk-21` para rodar o emulador do Firestore.
- Inclusão dos scripts `lint:rules`, `validate:firestore` e `validate` no `package.json`.
- Criação de `scripts/validate-firestore.ps1`, que injeta `JAVA_HOME`/`PATH` e roda o emulador do Firestore com projeto demo.
- Ampliação das regras do Firestore para cobrir as coleções usadas pelo frontend: `campaigns`, `orders`, `pastors`, `pastoral_appointments`, `social_professionals`, `social_appointments`, `units`, `subscriptions`, `members` e `visitor_leads`.
- Regras com validação de campos mínimos, `tenantId`, tipos básicos, `createdAt` e `updatedAt` para reduzir escrita solta e dados incompletos.
- Ajustes em atualizações existentes para incluir `updatedAt`, evitando rejeição por regras mais rígidas e melhorando rastreabilidade.
- Checagem estática realizada: todas as coleções usadas diretamente pelo frontend têm bloco de regra mapeado.

### Pagamentos e loja

- Checkout da loja movido para o backend com cálculo do pedido a partir dos produtos reais do Firestore.
- Remoção do fluxo de pagamento simulado em produção.
- Criação de pedido `orders` antes da preferência de pagamento e atualização via webhook do Mercado Pago.
- Webhook de pagamento usando `external_reference` para reconciliar pedido.
- Funções Firebase deixam de aceitar token fake do Mercado Pago: sem `MP_ACCESS_TOKEN`, o fluxo falha fechado.
- Eventos pagos passam a redirecionar para o link real de pagamento quando a preferência é criada.
- Contribuições PIX manuais passaram a registrar intenção pendente, não pagamento confirmado.
- Contribuições PIX manuais passaram a usar payload financeiro padronizado, com valor validado, `tenantId`, método, status e data consistentes.
- Contribuições PIX manuais passaram a ser registradas pelo BFF com Firebase Auth e Admin SDK, usando `tenantId` do perfil autenticado.

### Integrações Google

- Remoção do armazenamento de `googleAccessToken` no perfil do usuário.
- Conexão Google Workspace passa a salvar apenas estado/metadados de conexão.
- Ações que antes tentavam criar eventos/tarefas diretamente nas APIs do Google pelo token do usuário foram convertidas para registros internos ou links externos seguros.

### Células, membros e fluxos operacionais

- Botões principais da célula agora navegam para as áreas corretas ou executam ação visível.
- Relatório semanal de célula grava resumo, presentes, visitantes e `updatedAt`.
- Relatório semanal de célula passou a usar payload padronizado, deduplicando presença e preservando campos recorrentes para indicadores.
- Visitantes passam a ser consolidados a partir dos relatórios lançados.
- Convite de célula ganhou link copiável e QR Code real.
- Indicadores da célula deixaram de usar números fixos para visitantes, relatórios e assiduidade.
- Botão "Ver Detalhes" dos relatórios passou a exibir o resumo do encontro.

### Escola, social, pastoral e dashboards

- Escola IDE não libera assinatura ou aula avulsa em falha de pagamento.
- Escola IDE passou a criar cursos, módulos, aulas, trilhas, matrículas e progresso por serviço de domínio.
- Matrículas da Escola IDE passaram a ser criadas pelo BFF com Firebase Auth, validação do curso, `tenantId` do perfil autenticado e proteção contra matrícula duplicada.
- Certificados da Escola IDE deixam de exibir download simulado e passam a gerar um certificado HTML baixável/imprimível.
- Agendamentos pastorais e sociais deixam de simular gravação em calendário com token do usuário; o status fica registrado na plataforma.
- Agendamentos pastorais e tarefas pastorais passaram a usar serviços de domínio com timestamps padronizados.
- Visitantes e pedidos de oração passaram a atualizar status por serviço de domínio.
- Atendimentos sociais e profissionais sociais passaram a usar serviços de domínio.
- A listagem administrativa de atendimentos sociais passou a filtrar por `tenantId`.
- A aba pastoral de tarefas deixou de exibir "Google Tasks" sem integração e passou a criar/listar/concluir tarefas internas persistidas em `tasks`.
- Planejamento Kanban passou a criar, editar, mover e comentar tarefas por serviço de domínio.
- Ministérios passaram a criar ministérios, escalas e briefings por serviço de domínio.
- Escalas e briefings passaram a atualizar status/atribuições por serviço de domínio.
- O botão da agenda pastoral agora abre o Google Agenda como apoio externo, sem prometer sincronização automática inexistente.
- Painel administrativo removeu afirmação falsa de Cloud SQL ativo.
- Indicadores de saúde no admin passaram a ser calculados com dados lançados.
- Admin financeiro passou a gerar CSV e relatório TXT reais em vez de abrir páginas genéricas do Google Sheets/Docs.
- Chunks do build foram separados em grupos de Firebase, gráficos, mapas/check-in e núcleo.

## Validações executadas

- `npm run lint`: passou.
- `npm run lint:rules`: passou.
- `npm run validate:firestore`: passou com OpenJDK 21.0.11 e Firestore Emulator.
- `npm run validate`: passou.
- `npm run validate` após os contratos recorrentes de células, finanças e eventos: passou.
- `npm run validate` após a extração da camada `src/lib/services/`: passou.
- `npm run validate` após a extração de serviços de membros, pastoral e social: passou.
- `npm run validate` após a extração de serviços de escola, planejamento e ministérios: passou.
- `npm run validate` após a primeira rota BFF financeira (`/api/contributions`): passou.
- `npm run validate` após modularização do BFF e rota de matrícula (`/api/school/enrollments`): passou.
- `npm run build`: passou.
- TypeScript das Cloud Functions: passou.
- Checagem estática de coleções vs. `firestore.rules`: `missing: []`.
- Aplicação local respondeu HTTP 200 em `http://localhost:3000/`.

## Limitações conhecidas

- A checagem visual pelo navegador interno do Codex falhou por erro de ambiente do plugin; a aplicação respondeu por HTTP.
- Ainda há trabalho futuro para modelagem analítica mais profunda: histórico financeiro auditável, conciliação bancária, relatórios por rede, dados de retenção real e camada BI.

## Firebase vs. SQL Google

Recomendação atual: não migrar tudo de Firestore para SQL agora.

O melhor caminho é híbrido e incremental:

- Manter Firestore para experiência operacional em tempo real, perfis, células, presença, escalas, inscrições e telas colaborativas.
- Introduzir PostgreSQL via Firebase SQL Connect ou Cloud SQL para domínios que exigem consultas relacionais fortes: financeiro, pedidos, pagamentos, conciliação, indicadores, auditoria e BI.
- Evitar uma migração total antes de estabilizar os contratos de dados e os fluxos críticos, porque a plataforma ainda está consolidando seus módulos e papéis.

Primeiro passo recomendado para SQL:

1. Definir um modelo relacional para `orders`, `payments`, `transactions`, `event_enrollments`, `cell_reports`, `service_reports` e `kpi_targets`.
2. Criar uma camada de espelhamento ou migração por domínio, começando por financeiro/pagamentos.
3. Manter Firebase Auth e Firestore onde o tempo real é uma vantagem.
4. Conectar Looker Studio/BI apenas depois que os dados financeiros e operacionais estiverem confiáveis.
 
## Entrega adicional - Next, pagamentos, sync BI e motion

Implementado nesta etapa:

- Criadas rotas explicitas no App Router do Next para `/`, `/celulas`, `/escola`, `/eventos`, `/financeiro`, `/gestao`, `/jornada`, `/loja`, `/membros`, `/ministerios`, `/cuidado-pastoral`, `/unidades`, `/pastores`, `/social` e `/midia`.
- Criado worker `scripts/sync-firestore-to-sql.ts` para espelhar Firestore em PostgreSQL/Cloud SQL com suporte a dry-run, schema e upserts.
- Modelo SQL/BI expandido com `fact_subscription`, `fact_learning_access` e view `mart_school_revenue_access`.
- Escola IDE ganhou assinatura recorrente via Mercado Pago PreApproval e compra avulsa de curso/aula via Preference.
- Webhook do Mercado Pago passou a processar pagamentos de pedidos, eventos, compras da Escola e notificacoes de assinatura.
- Compra aprovada de curso/aula cria acesso operacional em `learning_access`.
- Regras Firestore passaram a permitir leitura segura do proprio acesso em `learning_access`.
- Eventos pagos deixaram de depender de Brick React com chave publica de teste e passaram a usar checkout seguro criado no backend.
- Dependencia `@mercadopago/sdk-react` foi removida; o padrao atual usa SDK Node no backend.
- Motion base aplicada a telas principais migradas/encapsuladas: Home, Dashboard, Eventos, Financeiro, Loja e Admin Financeiro.
- Teste de fluxos foi ampliado para cobrir checkout, inscricao de evento, check-in, progresso, assinatura e compra da Escola.

Validacoes desta etapa:

- `npm run sync:bi -- --dry-run`: passou sem exigir SQL local quando `DATABASE_URL` esta ausente.
- `npm run validate:full`: passou, incluindo TypeScript, regras Firestore com Java/Emulator, build Vite e build Next.
- `FLOW_BASE_URL=http://localhost:4181 npm run test:flows`: passou.

Limitacao desta etapa:

- A checagem visual pelo navegador interno do Codex falhou por erro do ambiente do plugin. A validacao ficou coberta por build completo, rotas Next geradas e smoke tests HTTP.

## Entrega adicional - Firebase nomeado e migracao por chunks de rota

Implementado nesta etapa:

- Criado `.firebaserc` apontando `default` e `prod` para `gen-lang-client-0529830528`.
- `firebase.json` passou a configurar o Firestore nomeado `ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b`.
- Backend/BFF passou a usar o mesmo `FIRESTORE_DATABASE_ID` do client via Admin SDK.
- Cloud Functions tambem passaram a usar o databaseId nomeado para usuarios, inscricoes, assinaturas e acessos.
- `.env.example` documenta `FIREBASE_PROJECT_ID`, `FIRESTORE_DATABASE_ID`, `DATABASE_URL` e `CLOUD_SQL_DATABASE_URL`.
- Criados scripts npm para Firebase CLI: listar projetos, bancos, indexes, dry-run de regras e deploy de regras.
- Criada documentacao operacional em `docs/firebase/README.md`.
- Regras Firestore foram publicadas no database nomeado via `npm run firebase:rules:deploy`.
- A migracao de rotas avancou com carregamento sob demanda por area no React/Next, criando chunks separados para Home, Eventos, Escola, Loja, Financeiro, Celulas, Gestao e demais telas.
- Removido wrapper vazio de `CellProvider` para evitar carregar a tela de celulas antecipadamente.

Validacoes desta etapa:

- `npm run firebase:databases -- --json`: listou o database ativo.
- `npm run firebase:indexes -- --json`: listou indexes do database ativo.
- `npm run firebase:rules:dry-run`: passou.
- `npm run firebase:rules:deploy`: passou e publicou regras/indexes no database nomeado.
- `npm run validate:full`: passou.
- `FLOW_BASE_URL=http://localhost:4182 npm run test:flows`: passou.

Observacao sobre SQL:

- Ainda nao existe `DATABASE_URL`/Cloud SQL configurado. O Firestore operacional esta configurado e publicado; o SQL/BI continua pronto para ser ligado quando houver uma instancia PostgreSQL/Cloud SQL ou SQL Connect.

## Entrega adicional - Cloud SQL criado e Financeiro Next nativo

Implementado nesta etapa:

- Registrado o Cloud SQL/Data Connect criado:
  - Local: `us-east1`
  - Servico: `gen-lang-client-0529830528-service`
  - Instancia: `gen-lang-client-0529830528-instance`
  - Banco: `gen-lang-client-0529830528-database`
- Worker `sync:bi` passou a aceitar `DATABASE_URL`, `CLOUD_SQL_DATABASE_URL` ou conexao Cloud SQL por socket/TCP com `CLOUD_SQL_USER` e `CLOUD_SQL_PASSWORD`.
- Criada documentacao `docs/sql-bi/cloud-sql-coroado.md`.
- Criada decisao tecnica em `docs/architecture/stack-decision.md`.
- Criada consulta server-side `getFinanceOverview` para consolidar receita, pendencias, recorrencia, assinantes, campanhas e ultimas transacoes.
- Exposto resumo financeiro em REST (`/api/finance/overview`), tRPC (`finance.overview`) e App Router (`src/app/api/finance/overview`).
- `/financeiro` passou a ter uma primeira pagina Next nativa, com indicadores e lista de transacoes via BFF.
- Smoke tests passaram a cobrir `/api/finance/overview`.

Validacoes desta etapa:

- `npm run lint`: passou.
- `npm run sync:bi -- --dry-run`: passou reconhecendo o Cloud SQL configurado e sem tentar upsert sem credenciais.
- `npm run validate:full`: passou; Next reconheceu `/financeiro` e `/api/finance/overview` como rotas dinamicas.

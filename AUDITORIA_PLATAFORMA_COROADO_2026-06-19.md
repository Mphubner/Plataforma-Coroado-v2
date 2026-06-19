# Auditoria Plataforma Coroado

Data da revisão: 19 de junho de 2026  
Diretório auditado: `D:\Projetos\Coroado\Plataforma-Coroado`  
Repositório remoto principal: `https://github.com/Mphubner/Plataforma-Coroado-v2.git`

## 1. Sumário executivo

A Plataforma Coroado evoluiu bastante desde a auditoria anterior: há rotas reais, BFF Express, tRPC, Firebase Functions, Firestore Rules, integração Mercado Pago, check-in por QR Code, sincronização SQL/BI e módulos com operações persistidas. A base deixou de ser apenas visual em várias áreas.

Mesmo assim, o estado atual ainda não está pronto para produção segura. Os maiores riscos não estão em uma página isolada, mas na integração entre superfícies duplicadas: a plataforma opera ao mesmo tempo como app Vite/React e como app Next, com páginas nativas em `src/app`. Isso cria comportamentos diferentes para o mesmo domínio, dificulta permissões consistentes e já quebrou o build Next.

Os bloqueadores principais são:

- O TypeScript não fecha (`npm run lint` falha), e o build Next também falha.
- Existem rotas Next de agendamento pastoral/calendário sem autenticação equivalente ao BFF.
- A Function de webhook Mercado Pago foi alterada para aceitar ausência de segredo de webhook.
- Há senha de banco hardcoded em script local.
- As regras Firestore têm blocos duplicados e permissões amplas para `tasks` e `task_updates`.
- Há módulos ainda parcialmente mockados, locais ou sem persistência operacional, especialmente automações, suporte/quiz antigo da escola, Jornada e algumas ações de células.

Veredito: a plataforma está no estágio de "produto funcional em amadurecimento", com muitos blocos reais, mas precisa de uma rodada de hardening antes de ser tratada como plataforma autônoma, segura e mobile-first.

## 2. Estado do código e GitHub

Estado verificado:

- Branch local: `codex/coroado-next-firebase-sql`
- Commit local: `5738418`
- `origin/main`: `8c6d66b`
- Divergência local vs `origin/main`: branch local está `1` commit à frente e `30` commits atrás.
- Arquivos já modificados antes/na sessão: `functions/src/index.ts`, `functions/lib/index.js`, `functions/lib/index.js.map`.

Diferença crítica local observada em `functions/src/index.ts`:

- `validateMercadoPagoSignature` agora retorna `ok: true` quando não há segredo de webhook.
- `createPreference` recebeu `notification_url` fixo para `mpWebhook`.

Isso pode ter sido uma correção de fluxo, mas do ponto de vista de segurança precisa ser ajustado: webhook sem secret não deve passar em produção.

## 3. Validações executadas

| Validação | Resultado | Observação |
|---|---:|---|
| `npm run lint` | Falhou | Erros TypeScript em Eventos, Escola, Gestão, Planejamento e script SQL. |
| `npm run lint:rules` | Falhou | Regras duplicadas em `kpi_entries`, `tasks` e `task_updates`. |
| `npm run validate:firestore` | Passou com permissão elevada | A primeira tentativa falhou por cache npm fora do sandbox; repetida com permissão, o emulador subiu e retornou `firestore-rules-ok`. |
| `npm run build` | Passou | Vite build OK, mas com chunks grandes: `vendor-core`, `vendor-maps-checkin`, `vendor-firebase`. |
| `npm --prefix functions run build` | Passou | Functions compilam. |
| `npm run next:build` | Falhou | `src/app/eventos/EventosNativeClient.tsx` importa `../../../components/CheckoutModal`, caminho inexistente para Next. |
| `npm run test:flows` | Não concluído | Script exige servidor em `localhost:4178`; tentativas de subir servidor local não responderam dentro da janela de teste. |

Erros TypeScript de maior impacto:

- `src/app/eventos/EventosNativeClient.tsx:11`: import quebrado do `CheckoutModal`.
- `src/components/EventsView.tsx:287,384,416`: `postJson` usado sem import.
- `src/components/EventsView.tsx:924`: tipo de evento incompatível com `CheckoutModal`.
- `src/components/SchoolView.tsx:318`: `limit` usado sem import.
- `src/components/SchoolView.tsx:358,451`: `PlayCircle` usado sem import.
- `src/components/AdminStrategicGoals.tsx:198,202,559`: `Expectativa` não existe no tipo inferido do gráfico.
- `src/components/AdminPlanningKanban.tsx:96`: `authorId` não existe no contrato `TaskUpdatePayloadInput`.
- `scripts/setup-db.ts:12`: `ipType: 'PUBLIC'` incompatível com o tipo atual do Cloud SQL Connector.

## 4. Arquitetura atual

A plataforma mistura quatro superfícies:

1. Vite/React em `src/App.tsx` com `react-router-dom`.
2. Next App Router em `src/app`.
3. BFF Express em `server.ts` e `src/server/routes`.
4. Firebase Functions em `functions/src/index.ts`.

Essa mistura é administrável, mas hoje ainda não tem uma fonte de verdade clara por domínio.

Exemplos:

- Eventos existe em `src/components/EventsView.tsx`, `src/app/eventos/EventosNativeClient.tsx`, `src/server/routes/eventRoutes.ts`, `src/server/routers/eventsRouter.ts`, `src/server/operations.ts` e `functions/src/index.ts`.
- Pastores/agendamentos existe em `src/components/PastorsView.tsx`, `src/app/pastores/PastoresNativeClient.tsx`, `src/app/api/pastoral/appointments/route.ts`, `src/server/routes/pastoralRoutes.ts` e `src/server/routers/pastorsRouter.ts`.
- Social existe em `src/components/SocialView.tsx`, `src/app/social/SocialNativeClient.tsx`, `src/lib/services/socialService.ts` e `src/server/routers/socialRouter.ts`.
- Escola existe em `src/components/SchoolView.tsx`, `src/app/escola/EscolaNativeClient.tsx`, `src/server/routes/schoolRoutes.ts`, `src/server/routers/escolaRouter.ts`, `src/contexts/SchoolContext.tsx` e componentes admin antigos.

Recomendação arquitetural: escolher uma fonte operacional por módulo. As páginas podem continuar duplicadas durante migração, mas cada ação crítica precisa apontar para o mesmo contrato de domínio e a mesma API.

## 5. Achados críticos

### P0. Credencial de banco em código

`scripts/setup-db.ts:19` contém senha de banco hardcoded. Não reproduzo o valor neste relatório por segurança.

Impacto:

- risco de vazamento se o repositório for compartilhado;
- rotação obrigatória se a credencial já foi usada;
- viola a separação entre código e secrets.

Ação recomendada:

- remover a senha do arquivo;
- usar `CLOUD_SQL_PASSWORD`/secret manager;
- rotacionar a senha atual;
- revisar histórico Git para confirmar se o segredo já foi publicado.

### P0. Rotas Next sensíveis sem autenticação forte

`src/app/api/pastoral/appointments/route.ts` cria documentos em `pastoral_appointments` com dados vindos do payload: `pastorId`, `userId`, `tenantId`, `date`, `time`. Não há verificação do token Firebase nem comparação do usuário autenticado com `userId`.

`src/app/api/calendar/callback/route.ts` salva `googleCalendarTokens` em `users/{pastorId}` usando apenas o `state` do OAuth como pastorId. Não há validação de sessão, nonce/state assinado, tenant ou papel.

`src/app/api/calendar/freebusy/route.ts` expõe disponibilidade por `pastorId` e usa tokens salvos no perfil. Mesmo que a intenção seja mostrar agenda pública, a rota precisa de política explícita de quais dados podem ser expostos.

Impacto:

- agendamento pastoral pode ser forjado;
- token Google pode ser gravado no usuário errado;
- risco de acesso indevido a disponibilidade/calendário;
- divergência com o BFF, que já usa `authenticateFirebase` em rotas equivalentes.

Ação recomendada:

- mover esses fluxos para o BFF/tRPC protegido ou reutilizar `resolveFirebaseAuthToken`;
- assinar e validar `state` OAuth;
- gravar tokens em subcoleção/secret storage com owner e tenant;
- validar papel `seniorPastor`, `networkPastor`, `auxPastor`, `admin` para administração de agenda.

### P0. Firestore Admin usa banco padrão em uma parte do Next

`src/lib/firebase-admin.ts:20` usa `admin.firestore()` sem `FIRESTORE_DATABASE_ID`. Já `src/server/context.ts:50-52` usa `getFirestore(getAdminApp(), FIRESTORE_DATABASE_ID)`.

Impacto:

- rotas Next que importam `adminDb` podem ler/gravar no banco padrão, enquanto o BFF usa o banco nomeado;
- dados de agenda, calendário e pastoral podem ficar invisíveis para outras telas;
- bugs ficam silenciosos, porque a escrita pode "funcionar" no banco errado.

Ação recomendada:

- remover `adminDb` duplicado ou fazê-lo delegar para `getAdminDb()`;
- padronizar inicialização Firebase Admin em uma única lib server-side.

### P0. Webhook Mercado Pago em Function aceita falta de segredo

`functions/src/index.ts:48-55` retorna `ok: true` quando o segredo do webhook não está configurado. O BFF em `src/server/routes/mercadoPagoRoutes.ts:36-45` é mais seguro, pois só permite ausência de secret fora de produção.

Impacto:

- em produção, um webhook sem assinatura pode ser processado se a Function estiver ativa;
- pagamento, inscrição, assinatura e liberação de acesso podem ser atualizados por entrada não confiável;
- dois caminhos de webhook ficam com políticas diferentes.

Ação recomendada:

- alinhar Function e BFF: sem secret em produção deve falhar fechado;
- registrar o estado de configuração no deploy;
- tratar `notification_url` por env, não fixo no código;
- escolher um único handler oficial de webhook.

### P0. Regras Firestore duplicadas e amplas

`firestore.rules` tem blocos redundantes:

- `kpi_entries`: `786` e `927`;
- `tasks`: `461` e `935`;
- `task_updates`: `939`, com duplicidade acusada pelo lint.

Além disso, `tasks` e `task_updates` têm `allow read, write: if isSignedIn()`, o que é amplo demais para planejamento, pastoral, células e gestão.

Impacto:

- qualquer usuário autenticado pode alterar tarefas se a regra aplicável for a ampla;
- conflitos de regra dificultam auditoria;
- indicadores e planejamento deixam de ter trilha confiável.

Ação recomendada:

- remover blocos duplicados;
- escopar `tasks` por `tenantId`, dono, atribuído, criador e papéis;
- escopar `task_updates` por tarefa pai;
- adicionar testes de regras para membro comum, líder de célula, líder de ministério, supervisor e pastor.

### P0. Build Next e TypeScript quebrados

O build Vite passa, mas `npm run lint` e `npm run next:build` falham.

Impacto:

- CI confiável não pode aprovar release;
- páginas Next nativas podem estar quebradas em produção;
- erros de import e tipos escondem regressões em fluxos críticos.

Ação recomendada:

- corrigir os erros listados na seção de validação;
- tornar `validate:full` obrigatório antes de merge;
- impedir que Vite build sozinho seja tratado como prova de release.

## 6. Perfis e permissões

Ponto positivo: `src/lib/permissions.ts` centraliza a hierarquia e preserva papéis canônicos:

- `member`
- `cellLeader`
- `ministryLeader`
- `supervisor`
- `networkPastor`
- `auxPastor`
- `seniorPastor`
- `admin`

Ainda há compatibilidade com aliases antigos como `pastor` e `leader`, o que ajuda na migração, mas o UI ainda usa esses legados diretamente em alguns lugares:

- `src/components/MembersView.tsx:236,240,255,633`
- `src/app/membros/MembrosNativeClient.tsx:225,229,244,655`
- `src/app/pastores/PastoresNativeClient.tsx:88`

Risco:

- contagem de líderes pode divergir;
- árvore hierárquica pode esconder usuários com papéis novos;
- telas podem autorizar por string legada enquanto regras/backend usam string canônica.

Recomendação:

- usar `normalizeRoles`, `can` e `hasRole` em todas as telas;
- remover checks diretos de `leader`/`pastor` após migração dos dados;
- criar matriz de permissão por ação, não apenas por rota.

Matriz mínima recomendada:

| Ação | member | cellLeader | ministryLeader | supervisor | network/aux/seniorPastor | admin |
|---|---:|---:|---:|---:|---:|---:|
| Ver própria jornada/escola/ingressos | Sim | Sim | Sim | Sim | Sim | Sim |
| Registrar relatório da própria célula | Não | Sim | Não | Sim, se supervisiona | Sim | Sim |
| Check-in de evento | Não | Sim, se designado | Sim, se designado | Sim | Sim | Sim |
| Aprovar membro | Não | Não ou limitado | Não ou limitado | Sim | Sim | Sim |
| Editar papéis | Não | Não | Não | Não ou limitado | Senior/aux conforme política | Admin |
| Gerir ministério | Não | Não | Sim no próprio ministério | Sim | Sim | Sim |
| Reconciliar pagamentos | Não | Não | Não | Não | Senior/aux se permitido | Admin/Financeiro |
| Ver pastoral sensível | Não | Não | Não | Limitado | Sim | Sim |

## 7. Módulo por módulo

### Home

O que funciona:

- "Novo Aqui" grava lead via `/api/visitor-leads`.
- escalas do usuário são lidas por tenant e podem ter status atualizado.
- notas do culto são salvas localmente.

Problemas:

- `HomeView.tsx:57-68` busca `events` e `ministries` sem filtro de `tenantId`.
- `HomeView.tsx:41` cai em `tenant-1` quando não há tenant.
- modal "Novo Aqui" é fechado via `document.getElementById(...).classList`, fora do estado React.
- notas ficam só no dispositivo (`localStorage`), sem opção de salvar no perfil.

Evolução recomendada:

- filtrar eventos/ministérios por tenant ou visibilidade pública;
- transformar notas em `sermon_notes` opcional por usuário;
- criar funil de visitantes: lead criado, contato feito, primeira visita, célula indicada, consolidado, membro.

### Membros

O que funciona:

- listagem, aprovação, edição de perfil e claims existem.
- tRPC `membersRouter` aplica filtros por tenant e escopo hierárquico.
- há CSV/exportação e edição de papéis.

Problemas:

- Vite e Next têm implementações paralelas.
- UI ainda pede IDs manuais de ministério e supervisor (`MembersView.tsx:375,383`; `MembrosNativeClient.tsx:397,405`).
- lógica de líderes ainda considera `leader`/`pastor`.
- `members` e `users` coexistem como nomes de coleção no contrato; a prática principal é `users`.

Evolução recomendada:

- trocar inputs de ID por seletores pesquisáveis;
- criar histórico de alteração de papel e aprovação;
- padronizar coleção operacional de membros como `users`;
- separar perfil civil, vínculo e permissões em abas simples.

### Células

O que funciona:

- dashboard de célula usa BFF `/api/cells/:cellId/overview`.
- relatórios de célula gravam em `cell_reports`.
- overview cruza membros, relatórios, Escola IDE e tarefas.

Problemas:

- filtro de região no público não afeta `filteredCells`; só busca nome/bairro.
- mapa é iframe fixo de Guarapari, sem pins das células (`CellsView.tsx:142-143`).
- "Registrar" visitante orienta por alerta, não abre formulário dedicado.
- "Consolidar" apenas alerta um plano; não cria tarefa/follow-up (`CellManagementDashboard.tsx:390`).
- "Eu Quero" da escala local só registra visualmente (`CellManagementDashboard.tsx:463`).
- "Gerar Escala" sorteia no estado local; não persiste como escala oficial.

Evolução recomendada:

- criar `visitor_followups` ou usar `tasks` com tipo `visitor_consolidation`;
- criar `scale_interest` para "Eu Quero";
- persistir geração de escala como `tasks` ou `scales`;
- usar mapa com geocoding e pins por célula;
- medir presença, visitantes, consolidação e risco por célula.

### Ministérios

O que funciona:

- ministérios, escalas e briefings usam Firestore real.
- "Eu Quero" em vagas livres atualiza `scales.assignments`, não é apenas visual.
- briefings têm status e podem ser aprovados/recusados.

Problemas:

- ação usa gravação direta no cliente, enquanto outros módulos já migram para BFF/tRPC.
- recusa usa `prompt`, ruim para UX e auditoria.
- não há validação forte de conflito de escala, sobreposição de datas ou capacidade por função.
- métricas de presença/falta no dashboard do membro estão hardcoded como `0` e `100%`.

Evolução recomendada:

- criar endpoint de aceite/recusa de escala com validação;
- registrar presença real por escala;
- criar `ministry_service_reports`;
- vincular briefings a tarefas e responsáveis.

### Eventos, QR Code e ingressos

O que funciona:

- QR Code real com `react-qr-code`.
- leitura por câmera via `html5-qrcode`.
- fila offline em `localStorage`.
- check-in no BFF com papel exigido em `checkInEventEnrollment`.
- check-in bloqueia ingresso pendente de pagamento.
- webhook BFF atualiza `event_enrollments`, `transactions` e `payment_events`.

Problemas:

- `EventsView.tsx` usa `postJson` sem import, quebrando TypeScript.
- `CheckoutModal` usa Firebase Callable Functions, enquanto `EventsView.handleEnroll` usa BFF `/api/events/:id/enroll`.
- `EventosNativeClient` usa caminho quebrado para `CheckoutModal`, quebrando Next.
- webhook existe duplicado no BFF e em Functions.
- `CheckoutModal.tsx:9` tem fallback para public key de teste.
- a Function local atual aceita webhook sem secret.
- offline queue só guarda enrollmentId; não registra operador, timestamp local, device id ou evento de auditoria antes de sincronizar.

Evolução recomendada:

- escolher um fluxo oficial para inscrição/pagamento;
- mover criação de inscrição/preference para `src/server/operations.ts` ou Function, mas não ambos;
- criar `checkin_audit_events`;
- no QR, validar evento ativo, operador autorizado e modo portaria;
- para mobile, testar câmera em Android/iOS, permissões e reload pós-scan.

### Escola IDE

O que funciona:

- assinaturas, compras avulsas, progresso e matrículas têm BFF real.
- `schoolRoutes.ts` cria `subscriptions`, `orders`, `learning_access` e `enrollments`.
- há admin para cursos, módulos, aulas e trilhas dentro de `SchoolView`.

Problemas:

- `SchoolView.tsx` tem cerca de 2.485 linhas: dashboard, catálogo, player, admin, certificado e checkout em um arquivo.
- `data.role?.includes('admin')` deveria olhar `roles` ou `can`.
- `limit` e `PlayCircle` não estão importados.
- ranking contém lógica mockada.
- certificados são HTML baixável, sem coleção de certificado emitido.
- "Adicionar à Lista" aparece sem ação persistida clara.
- componentes antigos `AdminCourses`, `AdminQuizzes`, `AdminSupport` usam `SchoolContext` local, não banco.
- `AdminJornadaTab` mostra funil hardcoded e também usa `SchoolContext`.

Evolução recomendada:

- quebrar `SchoolView` em submódulos;
- tornar `certificates` uma coleção com código verificável;
- criar `course_reviews`, `lesson_questions`, `watch_progress`;
- aposentar ou migrar `SchoolContext` para API real;
- usar `roles`/`can` para assinatura/admin.

### Jornada

O que funciona:

- experiência visual/gamificada rica.
- motor de tabuleiro separado em `jornada-engine`.

Problemas:

- estado de jogo fica local.
- `JornadaView.tsx:428` busca participantes em `members`, enquanto o cadastro principal usa `users`.
- funil de `AdminJornadaTab` tem números hardcoded.
- criação de trilha usa `SchoolContext`, não persistência real.

Evolução recomendada:

- decidir se Jornada é jogo de apoio ou trilha oficial;
- se oficial, criar `journey_sessions`, `journey_participants`, `journey_progress`;
- trocar `members` por `users`;
- alimentar funil por matrículas/progresso/certificados.

### Financeiro

O que funciona:

- contribuições criam `transactions`.
- planos e conciliação existem no BFF.
- overview financeiro agrega transações, campanhas, planos e assinaturas.
- webhook registra transações de eventos e loja.

Problemas:

- `financeRoutes.ts` usa `process.env.MERCADO_PAGO_ACCESS_TOKEN`, enquanto o padrão do contexto usa `MERCADOPAGO_ACCESS_TOKEN || MP_ACCESS_TOKEN`.
- contribuições podem cair para manual mesmo com Mercado Pago configurado em outro nome de env.
- prompts manuais para conciliação ainda existem.
- permissões financeiras precisam ficar explícitas como papel/capability própria, não só herdadas.

Evolução recomendada:

- padronizar env vars de Mercado Pago;
- criar papel/capability financeiro;
- criar ledger imutável para ajustes;
- reconciliação deve ter histórico e comprovante.

### Loja

O que funciona:

- produtos, carrinho e pedidos usam Firestore/BFF.
- checkout `/api/checkout` usa Mercado Pago pelo backend.
- pode criar tarefa interna ligada a pedido.

Problemas:

- CRUD de produtos ainda é direto pelo cliente.
- seed de produtos padrão é ação administrativa sensível.
- estoque, variações e baixa por pagamento ainda precisam de contrato forte.

Evolução recomendada:

- criar `inventory_movements`;
- bloquear exclusão de produto com pedido;
- vincular pedido, pagamento, entrega/retirada e tarefa operacional.

### Social

O que funciona:

- profissionais e agendamentos usam Firestore/tRPC.
- há painel admin e status de atendimento.

Problemas:

- imagens caem em `via.placeholder.com`.
- agendamento pago cria `paymentStatus: pending`, mas não inicia pagamento.
- WhatsApp/contato não está integrado ao fluxo.

Evolução recomendada:

- criar checkout de atendimento social pago;
- definir se pagamento social é Mercado Pago ou conciliação manual;
- criar agenda com bloqueio de slots;
- salvar termos/consentimento e histórico de atendimento.

### Pastores e cuidado pastoral

O que funciona:

- pastores, agendamentos, tarefas pastorais e cuidado pastoral já têm coleções reais.
- `PastoralCareView` lê `visitor_leads`, `prayer_requests`, `risk_alerts` e atualiza status.
- tRPC de pastores tem checagem de papéis para administração.

Problemas:

- rotas Next de appointment/calendar são frágeis, conforme P0.
- `PastoralCareView.tsx:96` envia `leadEmail: ''`; o endpoint apenas loga o e-mail.
- Google Calendar tem caminhos diferentes: OAuth Next, Workspace connect no layout e fallback de URL manual.
- tarefas pastorais criadas por `window.prompt` têm UX fraca.

Evolução recomendada:

- centralizar agenda pastoral no BFF/tRPC;
- guardar disponibilidade e bloqueios em coleção própria;
- criar consentimento para acompanhamento pastoral;
- transformar e-mail/WhatsApp em provedor real configurável.

### Unidades

O que funciona:

- CRUD real em `units`.
- exibição pública de unidades.

Problemas:

- fallback `UNITS` mock aparece quando o snapshot vem vazio.
- unidades padrão têm IDs fixos e lógica especial no cliente.
- sem validação de tenant no fallback.

Evolução recomendada:

- seedar unidades padrão no banco;
- remover fallback mock em produção;
- criar status `active`, `hidden`, `archived`.

### Gestão, indicadores e automações

O que funciona:

- existem `kpi_entries`, `kpi_targets`, `strategic_goals`, `tasks`, `task_updates`.
- planejamento Kanban grava tarefas e updates.
- dashboard financeiro/gestão cruza dados reais.

Problemas:

- `AdminAutomations` mostra regras hardcoded; "Criar Nova Automação" e "Log de Disparos" estão desabilitados.
- `/api/notifications/whatsapp` retorna `501` quando provider não está implementado.
- `src/lib/whatsapp.ts` ainda é mock/simulado.
- `AdminDashboardMetrics` tem ações vazias em cards.
- regras Firestore deixam `tasks` amplo demais.
- TypeScript quebra em `AdminStrategicGoals` e `AdminPlanningKanban`.

Evolução recomendada:

- criar `automation_rules`, `notification_jobs`, `notification_deliveries`;
- logs de disparo com status, canal, público, erro e retry;
- tasks sempre com tenant, owner, assignee, source module e audit trail;
- usar indicadores calculados a partir de fatos, não apenas input manual.

## 8. Dados recorrentes que devem virar tabelas/indicadores

### Já existem ou quase existem

| Domínio | Coleções atuais | Indicadores possíveis |
|---|---|---|
| Visitantes | `visitor_leads`, `cell_reports` | novos visitantes, contato feito, célula indicada, conversão para membro, tempo até primeiro contato |
| Membros | `users` | membros ativos, pendentes, por papel, por célula, por ministério, evolução mensal |
| Células | `cells`, `cell_reports` | presença média, visitantes, frequência de relatório, risco de ausência, células sem relatório |
| Ministérios | `ministries`, `scales`, `briefings` | vagas abertas, aceite de escala, presença por escala, briefings pendentes, SLA de aprovação |
| Eventos | `events`, `event_enrollments` | inscrições, pagamento aprovado, check-in, no-show, receita por evento |
| Escola | `courses`, `modules`, `lessons`, `enrollments`, `subscriptions`, `learning_access` | matrícula, progresso, conclusão, MRR, compra avulsa, certificado emitido |
| Financeiro | `transactions`, `plans`, `campaigns`, `payment_events` | receita realizada/pendente, recorrência, conciliação, ticket médio |
| Loja | `products`, `orders` | pedidos, receita, itens vendidos, pendências, entrega |
| Social | `social_professionals`, `social_appointments` | atendimentos marcados, pagos, realizados, cancelados, capacidade por profissional |
| Pastoral | `pastors`, `pastoral_appointments`, `tasks`, `prayer_requests`, `risk_alerts` | agendamentos, comparecimento, tarefas abertas, alertas resolvidos |
| Gestão | `kpi_entries`, `kpi_targets`, `strategic_goals`, `tasks`, `task_updates` | OKRs/KPIs, avanço de planos, bloqueios, responsáveis |

### Tabelas novas recomendadas

| Tabela/coleção | Motivo |
|---|---|
| `checkin_audit_events` | Registrar operador, dispositivo, hora local, sincronização offline e resultado do QR. |
| `visitor_followups` | Transformar consolidação de visitante em processo acompanhável. |
| `scale_interest` | Persistir "Eu Quero" antes da confirmação do líder. |
| `attendance_records` | Unificar presença de célula, escala, evento e pastoral quando aplicável. |
| `certificates` | Emitir certificado verificável, com código, curso, aluno e data. |
| `automation_rules` | Configurar automações sem código. |
| `notification_jobs` | Fila de disparos por canal. |
| `notification_deliveries` | Log por destinatário, status e erro. |
| `inventory_movements` | Controlar entrada/saída de estoque da loja. |
| `journey_sessions` | Persistir sessões da Jornada. |
| `journey_progress` | Medir avanço formativo por membro/trilha. |
| `pastoral_availability` | Separar disponibilidade pastoral de perfil de usuário. |
| `audit_log` | Histórico transversal de ações críticas: papéis, pagamentos, check-in, conciliação. |

### Modelo SQL/BI atual

O arquivo `docs/sql-bi/coroado_finance_indicators_model.sql` já define:

- dimensões: `dim_tenant`, `dim_member`, `dim_course`, `dim_event`;
- fatos: `fact_payment_event`, `fact_transaction`, `fact_order`, `fact_event_enrollment`, `fact_cell_report`, `fact_school_progress`, `fact_subscription`, `fact_learning_access`, `fact_kpi_entry`;
- marts: financeiro mensal, conversão de evento, saúde de célula, conclusão escolar e receita/acesso da escola.

Esse é um ótimo começo. A próxima evolução é ampliar o modelo para pastoral, social, ministérios, notificações, Jornada e automações.

KPIs primários recomendados:

1. Saúde de discipulado: presença média em célula, visitantes consolidados, membros em risco, membros em trilha formativa.
2. Saúde financeira: receita confirmada, pendente, recorrente, conciliação em atraso e receita por fonte.
3. Saúde operacional: escalas preenchidas, check-ins concluídos, tarefas vencidas, automações entregues.

Guardrails:

- taxa de no-show em eventos;
- tempo até primeiro contato com visitante;
- pagamentos pendentes acima de X dias;
- células sem relatório semanal;
- tarefas críticas sem responsável.

## 9. Mobile first, UX e UI

Pontos positivos:

- várias telas usam grids responsivos e tabs.
- QR Code e scanner estão planejados para operação mobile.
- há navegação protegida por capability.

Riscos:

- componentes muito grandes e densos (`SchoolView`, `MinistriesView`, `EventsView`) tendem a gerar telas longas e difíceis no celular.
- muitos fluxos usam `alert`, `confirm` e `prompt`, que são ruins em mobile e não criam histórico.
- há botões com texto longo dentro de cards compactos.
- algumas páginas têm cards com `rounded-[2rem]`/`rounded-[2.5rem]`, visualmente pesado em telas pequenas.
- scanner QR precisa de teste real em Android/iOS, permissões de câmera, HTTPS/PWA e fallback manual.
- navegação Next/Vite pode apresentar comportamento diferente no mobile, dependendo da URL acessada.

Recomendações:

- substituir `alert/prompt/confirm` por modais/sheets com estados claros;
- para mobile, priorizar uma ação principal por tela;
- em QR, criar modo "Portaria" com tela cheia, leitura contínua, feedback sonoro/visual e fallback de busca por nome/CPF/e-mail;
- revisar cards muito arredondados e densos;
- criar testes Playwright por viewport para login, eventos, QR, célula, membros, pagamento e escola;
- usar lazy import para scanner/mapas apenas quando a aba exigir.

## 10. Páginas/ações com finalidade incompleta

Casos confirmados:

| Local | Estado atual | Risco |
|---|---|---|
| `AdminAutomations.tsx` | regras hardcoded; criar/log desabilitados; endpoint WhatsApp retorna 501 | usuário acha que há automação ativa real |
| `src/lib/whatsapp.ts` | retorna sucesso simulado | falsa confirmação de envio se usado |
| `CellManagementDashboard.tsx:390` | "Consolidar" só alerta | follow-up de visitante não é rastreado |
| `CellManagementDashboard.tsx:463` | "Eu Quero" de escala da célula só alerta | interesse não chega ao líder |
| `CellManagementDashboard.tsx:418-445` | gerar/sortear escala altera estado local | escala pode ser perdida |
| `AdminCourses/AdminQuizzes/AdminSupport` | usam `SchoolContext` local | dados não duráveis |
| `AdminJornadaTab.tsx:15-21` | funil hardcoded | indicador não confiável |
| `SchoolView.tsx:2278` | "Adicionar à Lista" sem ação clara | expectativa quebrada |
| `SocialView/SocialNativeClient` | atendimento pago sem checkout | pagamento social fica pendente manual |
| `UnitsView.tsx:101` | fallback mock quando banco vazio | dado demo pode parecer dado oficial |
| `PastoralCareView.tsx:96` | e-mail vazio; endpoint loga envio | boas-vindas não são envio real |
| `HomeView.tsx:319` | notas só no dispositivo | usuário pode perder conteúdo |

## 11. Pagamentos

Fluxos atuais:

- Loja: `/api/checkout` via BFF.
- Financeiro: `/api/contributions`, com tentativa Mercado Pago por env diferente.
- Eventos: BFF `/api/events/:eventId/enroll` e também Callable Functions via `CheckoutModal`.
- Escola: `/api/school/subscriptions` e `/api/school/purchases`.
- Webhook: BFF `/api/webhooks/mercadopago` e Function `mpWebhook`.

Problema central: há mais de um caminho de pagamento e mais de uma política de webhook.

Recomendação:

- criar um `payments` service único;
- cada domínio cria intenção de pagamento com `targetType` e `targetId`;
- webhook único atualiza `payment_events`, `transactions` e a entidade alvo;
- todos os handlers usam a mesma validação de assinatura;
- social pago deve entrar no mesmo contrato;
- contribuição manual deve ser marcada como pendente até conciliação.

## 12. Entregas recomendadas

### Entrega 1 - Bloqueadores de release

Objetivo: voltar a ter CI confiável.

- Corrigir todos os erros de `npm run lint`.
- Corrigir `npm run next:build`.
- Corrigir duplicidades do `firestore.rules`.
- Remover senha hardcoded e rotacionar credencial.
- Reverter webhook Function para falhar fechado sem secret em produção.
- Padronizar `getAdminDb`.

### Entrega 2 - Segurança, permissões e dados sensíveis

Objetivo: fechar superfícies de risco.

- Proteger rotas Next de pastoral/calendar.
- Assinar OAuth `state`.
- Mover tokens Google para armazenamento seguro/server-side.
- Remover bypass por e-mail fixo ou transformá-lo em configuração auditável.
- Criar matriz de permissões por ação.
- Restringir `tasks` e `task_updates`.

### Entrega 3 - Pagamentos e QR

Objetivo: consolidar receita, inscrição e presença.

- Unificar BFF/Functions no pagamento.
- Criar webhook oficial único.
- Criar auditoria de check-in.
- Testar QR em dispositivos reais.
- Criar fallback manual de check-in por busca.
- Incluir social pago no contrato de pagamento.

### Entrega 4 - Autonomia operacional

Objetivo: reduzir ações manuais e barreiras técnicas.

- Trocar campos de ID por seletores.
- Transformar "Consolidar" em tarefa/follow-up.
- Persistir interesse de escala.
- Criar automações configuráveis.
- Implementar WhatsApp/e-mail reais com fila e log.
- Criar agenda pastoral com slots e bloqueios.

### Entrega 5 - Dados e indicadores

Objetivo: transformar uso recorrente em gestão.

- Expandir SQL/BI para pastoral, social, ministérios, automações e Jornada.
- Criar `audit_log`.
- Criar dashboards por papel: pastor, supervisor, líder de célula, líder de ministério, financeiro.
- Definir metas por período e fonte.
- Remover funis hardcoded.

### Entrega 6 - UX mobile first

Objetivo: tornar a plataforma confortável no celular.

- Revisar fluxos críticos em 390px, 430px, tablet e desktop.
- Criar sheets/modais no lugar de prompts.
- Simplificar telas longas por tarefas.
- Lazy load de QR/mapas/gráficos.
- Criar modo portaria para eventos.
- Testar câmera, PWA e permissões.

## 13. Prioridade sugerida

1. Corrigir build/lint/rules/secrets.
2. Fechar rotas Next sensíveis e `adminDb`.
3. Consolidar pagamento/webhook.
4. Corrigir QR/check-in com auditoria e mobile real.
5. Remover mocks críticos e ações visuais.
6. Padronizar permissões e papéis legados.
7. Expandir BI e indicadores.
8. Refinar UX mobile e acessibilidade.

## 14. Conclusão

A Plataforma Coroado já tem estrutura para virar uma plataforma de operação real da igreja, não apenas um site. O caminho mais importante agora é reduzir duplicidade e ambiguidade: uma regra de permissão, uma API por ação crítica, uma política de pagamento, um contrato de dados e uma trilha de auditoria.

O maior ganho virá de tratar cada página como módulo operacional conectado: o visitante que entra pela Home vira lead pastoral, pode ser encaminhado para célula, aparecer em relatório, virar membro, entrar em trilha, participar de escala, se inscrever em evento, pagar, fazer check-in e alimentar indicadores. Esse fluxo já está parcialmente desenhado no código; falta fechar as pontes com segurança, persistência e UX simples.

## 15. Atualização de implementação aplicada

Após a auditoria, uma primeira rodada de correções críticas foi aplicada no código.

### Correções concluídas nesta rodada

- Build e TypeScript: corrigidos imports quebrados, contratos de tipos em Eventos/Escola/Gestão/Planejamento e configuração do `next:build`. O build Next agora roda com `npm run lint` antes da etapa de empacotamento e evita a checagem duplicada interna que estourava memória.
- Firestore Rules: removidas duplicidades em `kpi_entries`, `tasks` e `task_updates`; `tasks` deixou de permitir leitura/escrita ampla para qualquer usuário autenticado; cursos e tarefas passaram a respeitar tenant e perfil.
- Segurança de calendário/pastoral: rotas Next de agendamento e Google Calendar passaram a exigir sessão, tenant e papel adequado; o OAuth `state` agora é assinado e expira; o callback valida pastor/tenant antes de gravar tokens.
- Agendamento pastoral: a API deixou de confiar em `userId` e `tenantId` enviados pelo cliente; o servidor deriva membro, tenant e nome da sessão autenticada.
- Firestore Admin: `src/lib/firebase-admin.ts` passou a usar o mesmo banco nomeado do contexto server-side, evitando gravação/leitura acidental no banco default.
- Mercado Pago: webhooks voltaram a falhar fechado sem secret em produção; URLs de webhook e app público passaram a vir de ambiente; Express e Functions aceitam `MERCADOPAGO_ACCESS_TOKEN`/`MP_ACCESS_TOKEN`; checkout de contribuições agora usa o mesmo helper de credencial.
- QR/check-in: criada pré-validação backend para `/api/event-enrollments/:id/check-in-preview`, com RBAC e tenant, removendo a dependência de leitura direta de `event_enrollments`/`users` no cliente antes do check-in.
- Cloud SQL setup: removida senha hardcoded de `scripts/setup-db.ts`; senha agora deve vir de `CLOUD_SQL_PASSWORD` ou `DB_PASSWORD`.

### Evidências de validação pós-correção

| Validação | Resultado |
|---|---:|
| `npm run lint` | Passou |
| `npm run lint:rules` | Passou |
| `npm run validate:firestore` | Passou |
| `npm run build` | Passou |
| `npm --prefix functions run build` | Passou |
| `npm run next:build` | Passou |
| `npm run test:flows` com servidor temporário em `localhost:4178` | Passou |

### Pontos ainda pendentes para próximas entregas

- Revisar UX/mobile com navegador real em telas pequenas, especialmente QR, Escola, Eventos, Células e Gestão.
- Criar modo portaria/check-in mais dedicado, com busca manual e trilha de auditoria por operador/dispositivo.
- Remover ou implementar botões ainda baseados em `alert`, especialmente em Células e Automations.
- Consolidar a fonte de verdade entre Vite, Next, Express e Functions por domínio.
- Evoluir armazenamento de tokens Google para um modelo mais segregado e com rotação/revogação explícita.
- Transformar mais ações recorrentes em tabelas/indicadores: consolidação, escalas, automações, atendimento pastoral/social e follow-ups.
- Tratar segredos locais fora do código versionado. O arquivo local `functions/.env` está ignorado pelo Git, mas contém credencial de teste e deve ser rotacionado/removido do ambiente compartilhado quando não for mais necessário.

# Reavaliacao das auditorias da Plataforma Coroado - 2026-06-15

## Escopo avaliado

Estado atual avaliado:

- Branch: `codex/coroado-next-firebase-sql`
- Commit local/remoto: `18f3baf feat: refatora planejamento em arvore, arruma datas seeder e adiciona editar eventos`
- Worktree: limpo no momento da reavaliacao
- Projeto principal: `D:\Projetos\Coroado\Plataforma-Coroado`

Documentos revisados:

- `AUDITORIA_PLATAFORMA_COROADO_2026-06-14.md`
- `AUDITORIA_PLATAFORMA_COROADO_3.md`
- `AUDITORIA_PLATAFORMA_COROADO_5`
- `auditoria_plataforma_1`
- `auditoria_plataforma - Gem`
- `IMPLEMENTACOES_AUDITORIA_COROADO_2026-06-14.md`
- `PLANO_EVOLUCAO_STACK_AUDITORIA_COROADO_2026-06-14.md`
- `Auditar plataforma Coroado conversa completa.pdf` foi aberto como historico da conversa; os pontos tecnicos efetivos estao consolidados nos arquivos Markdown acima.

## Veredito executivo

As auditorias antigas foram parcialmente atendidas, mas o estado atual nao satisfaz a meta de "plataforma 100% funcional". Houve avancos importantes em `firebase.json`, BFF/REST, Cloud SQL/BI, Mercado Pago no backend, rotas Next e motion. Porem, a pasta atual esta com validacao quebrada e ainda contem regressao em pontos que a auditoria classificava como criticos: regras Firestore duplicadas, tRPC inconsistente, webhooks sem verificacao de assinatura, telas nativas com imports quebrados, mocks ativos e dados fixos.

Conclusao objetiva:

- A plataforma evoluiu de prototipo visual para uma base hibrida mais forte.
- A entrega documentada como "validada" nao corresponde ao estado atual do codigo.
- O build seguro para hospedagem Firebase/Google Cloud nao esta garantido neste commit.
- Membros, Ministerios, Social, Gestao e Pastores ainda nao podem ser considerados 100% funcionais.
- Celulas, Escola IDE e Eventos avancaram, mas tambem permanecem parciais enquanto a validacao nao passa e os fluxos residuais forem resolvidos.

## Validacoes executadas nesta reavaliacao

### `npm run lint`

Resultado: falhou.

Principais familias de erro:

- `@playwright/test` ausente, mas `playwright.config.ts` e `e2e/home.spec.ts` entram no TypeScript.
- Paginas nativas em `src/app/*/*NativeClient.tsx` importam componentes por caminhos relativos que apontam para `src/components/ui`, mas os componentes reais estao em `components/ui`.
- `src/lib/motion/presets.ts` exporta `pageMotion`, `panelMotion` e `listItemMotion`, mas varias paginas importam `pagePreset`.
- Roteadores tRPC usam `ctx.auth`, mas o contexto real expoe `authUser` e `userProfile`.
- `src/server/trpc.ts` declara `events` duas vezes no mesmo objeto.
- `AdminPlanningKanban`, `MinistriesView`, `PastorsView` e `SchoolView` tem erros de tipo que impedem build.

### `npm run lint:rules`

Resultado: falhou.

O `firestore.rules` contem blocos redundantes/duplicados para:

- `ministry_events`
- `visitor_leads`
- `prayer_requests`
- `risk_alerts`
- `kpi_targets`
- `kpi_entries`
- `service_reports`
- `financial_reports`
- `strategic_goals`
- `task_updates`

Isso invalida a afirmacao de que as regras estao verdes no estado atual.

## Matriz consolidada dos apontamentos da auditoria

| Area/ponto auditado | Status atual | Evidencia no codigo | Leitura tecnica |
|---|---:|---|---|
| `firebase.json` correto e banco nomeado | Satisfeito parcial | `firebase.json` existe com Firestore nomeado `ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b` | Estrutura existe, mas regras nao passam no lint. |
| Regras Firestore para colecoes usadas | Parcial/regredido | `firestore.rules` cobre muitas colecoes, mas tem matches duplicados | Cobertura melhorou, mas deploy/validacao segura fica bloqueado ate limpar duplicidades. |
| Contratos de dados e services | Parcial | `src/lib/domain`, `src/lib/services`, `src/server/operations.ts` existem | Boa fundacao, mas ainda ha divergencia com payloads reais e telas antigas. |
| Next.js gradual | Parcial/regredido | `src/app/*/page.tsx` existe para varias rotas | Rotas foram criadas, mas muitas paginas nativas nao compilam por imports e exports incorretos. |
| tRPC | Parcial/regredido | `src/server/trpc.ts`, `src/server/routers/*` | Camada existe, mas roteadores usam contexto errado e `events` duplicado. |
| BFF REST para fluxos criticos | Parcial positivo | `server.ts`, `src/server/routes/*`, `src/server/operations.ts` | As rotas REST estao mais maduras que tRPC e ainda sao a parte mais confiavel da migracao. |
| Mercado Pago loja/eventos/escola | Parcial | `checkoutRoutes`, `eventRoutes`, `schoolRoutes`, `mercadoPagoRoutes`, `functions/src/index.ts` | Backend calcula checkout da loja e eventos em REST, mas Functions ainda aceitam valor do cliente e webhook sem assinatura. |
| Webhook Mercado Pago seguro | Pendente critico | `functions/src/index.ts` comenta que assinatura deveria ser verificada; `mercadoPagoRoutes` tambem nao valida `x-signature` | P0 da auditoria permanece. Buscar pagamento no provedor ajuda, mas nao substitui validacao de origem/idempotencia robusta. |
| Simulacoes perigosas de pagamento | Parcial | REST reduziu simulacao; Functions ainda criam preferencia com `amount` recebido do cliente | Loja REST melhorou; Cloud Function `createPreference` ainda viola o principio de preco server-side. |
| Cloud SQL/BI | Parcial positivo | `.env.example`, `scripts/sync-firestore-to-sql.ts`, docs de SQL/BI | Preparado para Cloud SQL/PostgreSQL, mas sincronizacao real depende credenciais/conexao e ainda usa varios fallbacks `tenant-1`. |
| Worker de sincronizacao | Parcial | `scripts/sync-firestore-to-sql.ts` existe; `functions/src/sync-firestore-to-sql.ts` declara simulacao | Ha worker no repo, mas parte da Functions ainda e placeholder. |
| Motion/UX premium | Parcial/regredido | `src/lib/motion/presets.ts` existe | Presets existem, mas varias telas importam nome inexistente (`pagePreset`). |
| Testes E2E | Parcial/regredido | `e2e/home.spec.ts`, `playwright.config.ts` | Teste foi criado, mas dependencia `@playwright/test` nao esta instalada. |
| Reducao de mocks/dados fixos | Parcial | Ainda existem `PASTORS_MOCK`, KPI mock de Gestao, numeros fixos na Escola/Home | Auditoria permanece valida: ha muitos dados estaticos residuais. |
| Remocao de `alert()`/`prompt()` | Parcial | `rg` encontra muitos `alert()` e `prompt()` em fluxos operacionais | Alguns alerts sao feedback simples, mas ainda ha prompts/alerts substituindo fluxo real. |
| Integracao Google segura | Parcial | Tokens foram reduzidos em alguns fluxos; ainda ha botoes abrindo Google externo | Seguro como link externo, mas nao e integracao operacional real. |
| WhatsApp/notificacoes | Pendente | `src/lib/whatsapp.ts` retorna `simulated: true` | Automacao real ainda nao existe. |

## Estado por tela solicitada

### Celulas

Status: parcial.

Avancos:

- Existe rota Next em `src/app/celulas/page.tsx`.
- Existe cliente nativo `CelulasNativeClient`.
- Ha leitura de celulas via tRPC e uso de `CellManagementDashboard`.
- O dashboard de celula ja consome parte de dados reais, como membros, relatorios e overview.

Pendencias:

- `CelulasNativeClient` nao compila por imports relativos incorretos e `pagePreset` inexistente.
- `cellsRouter` so lista/busca celulas; nao cobre criacao/edicao/relatorio/visitantes.
- O dashboard ainda tem alerts que representam fluxos incompletos: registrar visitante, enviar mensagem, consolidar, interesse em escala.
- A intercomunicacao Celula -> Membros -> Escola -> Pastoral ainda e majoritariamente leitura/agregacao, nao fluxo transacional completo.

### Escola IDE

Status: parcial.

Avancos:

- Fluxos de assinatura/compra/progresso foram parcialmente movidos para backend/REST.
- Cursos, aulas, progresso e acesso aparecem modelados.
- Certificado HTML foi melhor que simulacao de download.

Pendencias:

- `EscolaNativeClient` nao compila por imports relativos incorretos e `pagePreset`.
- `SchoolView` ainda tem dados fixos de dashboard, como `1.240` alunos e `R$ 15.400` MRR.
- Ha botoes ainda sem acao real clara: responder aluno, notificar, editar, filtros, lista, carregar avaliacoes, enviar duvida.
- `escolaRouter` tRPC usa `ctx.auth` inexistente e permite `tenantId` vindo do input em criacoes administrativas.

### Eventos

Status: parcial, com base melhor que as demais.

Avancos:

- Existe `EventosNativeClient` com leitura por `/api/events/overview`.
- Inscricao usa rota BFF `/api/events/:eventId/enroll`.
- Check-in e pagamento de evento foram movidos para operacoes server-side no REST.

Pendencias:

- `src/server/trpc.ts` possui chave `events` duplicada; a primeira definicao com overview/check-in e sobrescrita pela segunda.
- `eventsRouter` tRPC e parcial e usa contexto errado.
- Webhook Mercado Pago ainda nao tem validacao de assinatura.
- Tela antiga `EventsView.tsx` ainda tem muitas mensagens via `alert()` e escritas diretas no Firestore para criacao/edicao de eventos.

### Membros

Status: nao 100% funcional no estado atual.

Avancos:

- Existe tela nativa em `src/app/membros`.
- Listagem, aprovacao e atualizacao de perfil foram movidas para tRPC em intencao.
- Exportacao CSV existe.
- A UI ja carrega mapas auxiliares de celulas/ministerios para alguns vinculos.

Pendencias:

- Tela nao compila por imports relativos incorretos e `pagePreset`.
- `membersRouter` nao compila/nao funciona por `ctx.auth`.
- Fluxo ainda usa alerts para sucesso/erro e fallback de claims.
- Select de ministerio e supervisor ainda aceita ID manual em partes da tela.
- Nao ha trilha de auditoria de alteracao de roles/acesso.

### Ministerios

Status: nao 100% funcional no estado atual.

Avancos:

- Existe tela nativa e router tRPC.
- Listagem, detalhes, criacao de ministerio, status de briefing e atualizacao de escala foram desenhados.

Pendencias:

- Tela nao compila por imports relativos incorretos e `pagePreset`.
- Router tRPC usa `ctx.auth`, portanto quebra.
- `updateBriefingStatus` e `updateScaleAssignments` nao validam tenant/propriedade antes de atualizar.
- Recusa de briefing ainda usa `prompt()`.
- Criacao/edicao completa de escala e briefing ainda nao esta coberta no router nativo.
- Tipos antigos de `MinistriesView.tsx` ainda quebram o TypeScript por `eventId`.

### Social

Status: nao 100% funcional no estado atual.

Avancos:

- Existe tela nativa e router tRPC.
- Profissionais, agendamentos e atualizacao de status foram modelados.

Pendencias:

- Tela nao compila por imports relativos incorretos, `cn` e `pagePreset`.
- Router tRPC usa `ctx.auth`.
- `deleteProfessional` e `updateAppointmentStatus` nao verificam tenant/role de forma suficiente.
- `createAppointment` nao grava `paymentStatus`, embora a regra Firestore para `social_appointments` exija esse campo em gravacoes client-side.
- Ainda ha alerts para falha de agendamento, salvar profissional e atualizar status.

### Gestao

Status: parcial/regredido.

Avancos:

- Tela nativa existe e usa componentes de metricas, metas, automacoes, Kanban e seed.
- Algumas metricas administrativas leem Firestore.

Pendencias:

- `GestaoNativeClient` nao compila por imports relativos incorretos e `pagePreset`.
- `gestaoRouter.getKpis` ainda retorna mock basico: `totalMembers: 125`, `activeCells: 12`, `monthlyGrowth: 5.2`, `engagementRate: 88`.
- `AdminPlanningKanban` quebra TypeScript por campos `action_title` fora do contrato.
- Ainda ha `alert("Integracao com Google Tasks em breve!")`.
- `AdminStrategicGoals` ainda usa `prompt()` para lancar valor de KPI.
- `AdminDashboardMetrics` tem botao `Agendar Reuniao` sem acao clara.

### Pastores

Status: nao 100% funcional no estado atual.

Avancos:

- Existe tela nativa e router tRPC.
- Agendamento pastoral usa rota REST `/api/pastoral/appointments`.
- Tarefas pastorais podem ser lidas/atualizadas pelo router.

Pendencias:

- Tela nao compila por imports relativos incorretos e `pagePreset`.
- Router tRPC usa `ctx.auth`.
- Ainda ha `PASTORS_MOCK` com Rafael/Fabricio/Alan; a tela cai nesses dados se o banco vier vazio ou falhar.
- Router bloqueia exclusao dos mocks em vez de modelar pastores reais como seed/editaveis.
- Salvamento/exclusao de pastor nao valida papel administrativo de forma robusta no router.
- PastoralCareView antigo ainda aparece acoplado a dados de tenant generico em alguns fluxos antigos.

## Pontos criticos que ainda permanecem das auditorias antigas

1. Build quebrado.
   - Enquanto `npm run lint` falhar, nao ha como dizer que a plataforma esta pronta para hospedagem segura.

2. Regras Firestore quebradas por duplicidade.
   - Enquanto `npm run lint:rules` falhar, nao ha como afirmar que regras foram validadas.

3. tRPC criado, mas inconsistente.
   - `ctx.auth` vs `authUser/userProfile` impede funcionamento das telas nativas que dependem de tRPC.

4. Mercado Pago ainda nao esta endurecido.
   - Falta validacao de assinatura do webhook.
   - Functions antigas ainda criam preferencia com preco recebido do cliente.

5. Mocks/dados estaticos ainda existem.
   - Pastores mockados.
   - KPIs mockados em Gestao.
   - Numeros fixos na Escola e Home.

6. Botoes/acoes residuais sem fluxo completo.
   - Ha prompts/alerts substituindo formularios, historico, auditoria, notificacao ou integracao real.

7. Permissoes server-side incompletas em roteadores novos.
   - Varias mutations so checam autenticacao, nao papel, tenant e ownership.

8. `tenant-1` ainda aparece como fallback em codigo operacional.
   - Pode ser aceitavel em seed/dev, mas nao em fluxos de producao.

9. Testes nao estao operacionais.
   - O projeto referencia Playwright, mas nao declara `@playwright/test`.

## O que foi de fato satisfeito

- `firebase.json` foi criado e tem estrutura de Firestore nomeado, Functions, Hosting e Emulators.
- `.firebaserc` e scripts Firebase existem no projeto.
- A recomendacao hibrida Firebase + SQL/BI continua tecnicamente correta.
- Existe base real de BFF REST para checkout, eventos, escola, financeiro, notificacoes e pastoral.
- Existe modelo SQL/BI e worker de sincronizacao, embora ainda precise credenciais reais e hardening.
- A migracao para Next comecou com rotas por area.
- A camada visual de motion comecou, mas precisa alinhamento de API/export.
- Parte dos pagamentos deixou de ser simulacao no fluxo REST.

## Proxima sequencia tecnica recomendada

Prioridade 1 - Voltar a ter build confiavel:

1. Corrigir imports das telas em `src/app/*/*NativeClient.tsx` para usar `@/components/...`, `@/components/ui/...`, `@/src/lib/...` ou caminhos relativos corretos.
2. Trocar `pagePreset` por `pageMotion` ou exportar alias compativel em `src/lib/motion/presets.ts`.
3. Instalar/configurar `@playwright/test` ou retirar `e2e`/`playwright.config.ts` do `tsconfig` ate a dependencia entrar.
4. Corrigir `src/server/trpc.ts` removendo a chave duplicada `events`.
5. Alinhar `ServerAuthContext` ou os routers para usarem `authUser/userProfile`.
6. Corrigir tipos de Kanban, Ministries, Pastors e School.
7. Remover matches duplicados em `firestore.rules`.

Prioridade 2 - Fechar seguranca e pagamentos:

1. Validar assinatura `x-signature` do Mercado Pago nos webhooks.
2. Desativar ou migrar `functions/src/index.ts` para nao aceitar `amount` do cliente.
3. Padronizar idempotencia em `payment_events`.
4. Remover `tenant-1` de fluxos de producao e deixar apenas em seed/dev controlado.

Prioridade 3 - Tornar telas 100% funcionais por lote:

1. Celulas/Eventos/Escola: corrigir build e remover os ultimos fluxos incompletos.
2. Membros/Ministerios/Social/Pastores/Gestao: corrigir tRPC, permissao, tenant e substituir prompts/alerts por modais/acoes reais.
3. Criar testes de fluxo por tela: acesso anonimo, membro, lider, pastor/admin.
4. Rodar `npm run validate:full` antes de qualquer deploy.

## Criterio para considerar a auditoria satisfeita

Uma tela so deve ser marcada como "100% funcional" quando:

- compila em `npm run lint`;
- passa em `npm run validate:full`;
- nao depende de mock para o fluxo principal;
- nao usa `prompt()` em acao operacional;
- possui permissao server-side;
- grava `tenantId`, `createdAt`, `updatedAt`, `createdBy/updatedBy` quando aplicavel;
- possui estado vazio, erro e carregamento;
- possui pelo menos um teste de fluxo HTTP/E2E ou smoke test da rota principal;
- nao cria pagamento/aprovacao/status critico pelo cliente sem validacao no backend.

## Fechamento da rodada de finalizacao - 2026-06-15

### Pontos satisfeitos nesta rodada

- Build voltou a ficar confiavel: `npm run validate:full` passou com TypeScript, regras Firestore, validacao local do Firestore Emulator, build Vite e build Next.
- A validacao de Firestore agora roda com Java local em `C:\Users\marco\.codex\tools\jdk-21\bin\java.exe`.
- `firestore.rules` foi saneado, removendo blocos duplicados e reforcando criacao de `task_updates` com `tenantId` e `createdAt`.
- O BFF/tRPC foi estabilizado para as telas migradas: contexto autenticado compativel, rotas sem duplicidade e routers lendo o Firestore nomeado via `getAdminDb()`.
- Mercado Pago foi endurecido:
  - webhooks REST e Functions validam `x-signature`/`x-request-id` quando ha secret configurado;
  - em producao, webhook sem secret nao passa;
  - preferencias de evento nao aceitam mais `amount/title` vindos do cliente;
  - assinatura da Escola IDE usa plano/preco de backend ou variavel segura.
- Mutations sensiveis passaram a exigir tenant/papel em Store, Eventos, Escola, Ministerios, Social e Pastores.
- Functions foram recompiladas e os arquivos gerados em `functions/lib` foram atualizados.
- Testes de fluxo HTTP passaram com a aplicacao construida em modo de producao local.
- Worker BI/SQL reconheceu Cloud SQL:
  - connectionName: `gen-lang-client-0529830528:us-east1:gen-lang-client-0529830528-instance`;
  - database: `gen-lang-client-0529830528-database`;
  - hostMode: `cloudsql-socket`.

### Validacoes executadas

- `npm --prefix functions run build`: passou.
- `npm run validate:full`: passou.
- `npm run test:flows` com `FLOW_BASE_URL=http://localhost:3000`: passou.
- `npm run sync:bi -- --dry-run`: passou em modo seguro, sem gravar dados porque as credenciais SQL ainda nao estao presentes no ambiente local.
- `git diff --check`: sem erro bloqueante; apenas avisos de final de linha Windows.

### O que ainda nao deve ser tratado como concluido

- A sincronizacao SQL real ainda depende de credenciais/ambiente de execucao do Cloud SQL. O projeto ja conhece instancia e banco, mas nao deve gravar sem credencial configurada.
- Ainda ha risco de dados estaticos residuais em componentes historicos que ficam como fallback quando Firestore falha ou esta vazio. O caminho principal foi endurecido, mas a limpeza completa de mocks por tela ainda deve ser feita com dados reais/seed controlado.
- A camada visual premium com motions esta em base funcional, mas ainda precisa uma rodada dedicada de refinamento tela a tela.
- O proximo deploy deve configurar `MERCADOPAGO_WEBHOOK_SECRET`, `SCHOOL_IDE_MONTHLY_PRICE` ou documentos `plans/{planId}` e o ambiente SQL do worker.

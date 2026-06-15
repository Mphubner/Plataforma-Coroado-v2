# Auditoria completa da Plataforma Coroado

Data de corte: 14/06/2026  
Base principal avaliada: `D:\Projetos\Coroado\Plataforma-Coroado`  
Repositório principal: `https://github.com/Mphubner/Plataforma-Coroado-v2`  
Repositórios de referência: `https://github.com/Mphubner/Plataforma-Coroado` e `https://github.com/Mphubner/Igreja-Coroado`

## 1. Resumo executivo

A Plataforma Coroado já tem uma ambição muito maior do que um site institucional. Ela funciona como uma coleção de mini-plataformas: células, escola, membros, eventos, loja, finanças, cuidado pastoral, ministérios, social, pastores, unidades e gestão estratégica. A visão está correta: cada área precisa operar de forma autônoma, mas os dados precisam circular entre elas.

O problema central hoje é que a interface avançou mais rápido do que o contrato de dados, as regras do Firebase e as integrações reais. Existem telas com boa aparência e fluxos parcialmente desenhados, mas parte das ações ainda é simulada, parte dos botões não executa nada, algumas coleções usadas pelo frontend não existem nas regras do Firestore, e vários módulos gravam dados em formatos que não batem com as regras de segurança.

Em termos práticos: a plataforma compila, mas ainda não é confiável como operação diária. A prioridade deve ser transformar o que parece funcional em fluxo realmente funcional: persistente, seguro, rastreável, com permissões claras e sem simulação em produção.

## 2. Fontes e verificações realizadas

### 2.1 Código local

Foram avaliados:

- `src/App.tsx`
- `src/components/**/*.tsx`
- `src/lib/**/*.ts`
- `server.ts`
- `functions/src/index.ts`
- `firestore.rules`
- `firebase-blueprint.json`
- `security_spec.md`
- `README.md`
- `ROADMAP_E_REVISAO.md`
- `package.json`
- `functions/package.json`

### 2.2 Repositórios remotos

O repositório local aponta para `Plataforma-Coroado-v2`, que é a base principal atual.

Comparação de alto nível:

| Fonte | Papel na auditoria | Leitura |
|---|---|---|
| `Plataforma-Coroado-v2` | Base ativa | É a versão local/origin. Tem Firebase, Functions, Mercado Pago, Google Workspace e módulos mais recentes. |
| `Plataforma-Coroado` | Antecessor próximo | Estrutura parecida, mas mais antiga. Útil para histórico, não como base de produção. |
| `Igreja-Coroado` | Referência arquitetural | Usa Supabase e um contexto de dados mais centralizado. Não deve ser copiado diretamente, mas traz bons padrões para camada de dados, logs e histórico. |

### 2.3 Validação técnica

Resultados executados:

| Verificação | Resultado | Observação |
|---|---:|---|
| `npm run lint` | Passou | TypeScript do frontend sem erro. |
| `npm run build` | Passou | Build Vite gerado com sucesso. |
| Build frontend | Alerta | Bundle principal ficou com 2.665 kB minificado / 727 kB gzip. Precisa mais code splitting. |
| `npm --prefix functions run build` | Falhou na saída padrão | TypeScript tentou gravar `functions/lib/index.js` e `.map`, mas recebeu erro de escrita local. |
| `tsc` das Functions para pasta temporária | Passou | O código das Functions compila; o problema é a escrita nos artefatos versionados em `functions/lib`. |

## 3. Diagnóstico de arquitetura

### 3.1 A plataforma está modular na navegação, mas não na arquitetura

As rotas estão bem separadas no app:

- `/celulas`
- `/escola`
- `/membros`
- `/ministerios`
- `/eventos`
- `/financeiro`
- `/jornada`
- `/gestao`
- `/cuidado-pastoral`
- `/unidades`
- `/pastores`
- `/social`
- `/loja`
- `/midia`

Porém, a arquitetura interna ainda é centrada em componentes grandes, com regras de negócio, consultas Firestore, validação, layout, estados e ações misturados no mesmo arquivo.

Arquivos que precisam ser divididos:

| Arquivo | Tamanho aproximado | Risco |
|---|---:|---|
| `src/components/SchoolView.tsx` | 2.200+ linhas | Concentra catálogo, aluno, admin, pagamentos, aulas, membros, suporte e certificados. |
| `src/components/MinistriesView.tsx` | 1.100+ linhas | Mistura catálogo público, escalas, briefings, eventos e admin. |
| `src/components/StoreView.tsx` | 1.000+ linhas | Mistura vitrine, carrinho, checkout, pedidos, produtos e Google Tasks. |
| `src/components/EventsView.tsx` | 980+ linhas | Mistura eventos, inscrições, pagamento, check-in, criança, offline e admin. |
| `src/components/JornadaView.tsx` | 850+ linhas | Usa uma coleção divergente (`members`) e precisa se integrar a `users`. |
| `src/components/SocialView.tsx` | 730+ linhas | Mistura agenda pública, profissionais, aprovação e Google Calendar. |
| `src/components/PastorsView.tsx` | 700+ linhas | Agenda, cadastro e aprovação no mesmo componente. |

Recomendação: separar cada domínio em:

- `services`: operações de banco/API.
- `schemas`: validação e contrato dos dados.
- `hooks`: leitura e mutações por tela.
- `components`: apenas UI.
- `admin`: gestão interna do domínio.
- `public`: experiência pública do domínio.

### 3.2 Falta uma camada central de dados

Hoje cada tela consulta e grava diretamente no Firestore. Isso aumenta:

- divergência de nomes de campos;
- duplicação de filtros por `tenantId`;
- risco de uma tela gravar em formato incompatível com as regras;
- dificuldade para criar indicadores consistentes;
- dificuldade para rastrear alterações entre módulos.

O repositório `Igreja-Coroado` oferece uma boa lição aqui: ele centraliza dados em um contexto/camada compartilhada. Na Plataforma Coroado atual, o ideal é criar uma camada equivalente usando Firebase, por exemplo:

- `src/services/usersService.ts`
- `src/services/cellsService.ts`
- `src/services/eventsService.ts`
- `src/services/paymentsService.ts`
- `src/services/schoolService.ts`
- `src/services/storeService.ts`
- `src/services/pastoralService.ts`
- `src/services/ministryService.ts`
- `src/services/kpiService.ts`

### 3.3 O `firebase-blueprint.json` está defasado

O blueprint documenta parte das coleções, mas não acompanha todas as coleções que a aplicação realmente usa.

Coleções usadas no código, mas ausentes das regras ou do desenho completo:

- `campaigns`
- `orders`
- `pastors`
- `pastoral_appointments`
- `social_professionals`
- `social_appointments`
- `units`
- `members`

Isso significa que a documentação de dados não é mais a fonte da verdade.

### 3.4 A plataforma ainda mistura dados reais, dados mockados e dados simulados

Há módulos com persistência real no Firestore, mas também existem:

- fluxos de pagamento simulados;
- dados mockados em listas;
- botões com aparência final sem ação;
- insights fixos em dashboards;
- fallback de compra simulada quando o backend falha;
- ações administrativas com `prompt()` e `alert()`;
- integrações Google executadas direto do frontend.

Isso precisa ser separado por ambiente:

- desenvolvimento pode ter simulação explícita;
- homologação pode usar sandbox real;
- produção não pode aprovar pagamento, assinatura ou pedido por simulação.

## 4. Achados críticos

### P0. Coleções usadas pelo frontend não têm regras no Firestore

Varredura do código encontrou coleções usadas sem `match` correspondente em `firestore.rules`:

| Coleção | Usada em | Impacto |
|---|---|---|
| `campaigns` | `FinanceView.tsx` | Campanhas financeiras tendem a falhar ao ler/gravar. |
| `orders` | `StoreView.tsx` | Pedidos da loja não têm regra de leitura/escrita. |
| `pastors` | `PastorsView.tsx` | Cadastro/lista de pastores não tem contrato de segurança. |
| `pastoral_appointments` | `PastorsView.tsx` | Agendamentos pastorais tendem a falhar. |
| `social_professionals` | `SocialView.tsx` | Profissionais de atendimento social não têm regra. |
| `social_appointments` | `SocialView.tsx` | Agendamentos sociais não têm regra. |
| `units` | `UnitsView.tsx` | Gestão de unidades/campi não tem regra. |
| `members` | `JornadaView.tsx` | Diverge do padrão `users`; a jornada pode ficar isolada. |

Impacto: estas páginas podem parecer prontas, mas falham no momento de consumir ou alterar dados.

### P0. Regras existentes não batem com alguns dados gravados

Exemplos importantes:

- `visitor_leads` exige usuário logado, `dateVisited`, `source`, `status`, `tenantId`, `createdAt` e `updatedAt`. O formulário público de visitante em `HomeView.tsx` tenta gravar visitante sem esse contrato completo.
- `cell_reports` exige `date`, `present`, `visitors`, `summary`, `tenantId`, `createdAt`, `updatedAt`. O dashboard da célula monta outro formato com `meetingType`, `presentMembersIds` e `visitorData`.
- `event_enrollments` permite update administrativo apenas de `checkedIn` e `updatedAt`. O fluxo de evento tenta atualizar `preferenceId` e `paymentStatus`.
- `events` só permite create/update/delete para admin, mas a UI abre criação para líderes em alguns contextos.

Impacto: permissões e schema impedem fluxos operacionais justamente quando a plataforma tenta ficar mais autônoma.

### P0. Pagamentos ainda têm simulações perigosas

Pontos encontrados:

- `FinanceView.tsx` tem confirmação de PIX simulada que grava contribuição como `completed`.
- `StoreView.tsx` abre checkout simulado se `/api/checkout` falha.
- `StoreView.tsx` grava pedido com `paymentMethod: 'pix_simulation'`.
- `SchoolView.tsx` ativa assinatura simulada em erro de servidor.
- `EventsView.tsx` tem botão de simulação de aprovação de webhook.
- `server.ts` recebe webhook Mercado Pago, mas apenas loga e responde `202`; não valida assinatura nem atualiza pedido/inscrição.
- `functions/src/index.ts` também tem integrações Mercado Pago, mas precisa fechar validação de assinatura, idempotência e atualização transacional.

Impacto: em produção, a plataforma pode registrar pagamento, pedido, inscrição ou assinatura sem confirmação real do provedor.

### P0. Checkout da loja confia em preço vindo do cliente

Em `server.ts`, `normalizeCheckoutItems()` usa `item.product.price` enviado pelo frontend. O backend deveria receber apenas IDs e quantidades, buscar os produtos no banco e calcular o preço no servidor.

Impacto: um usuário técnico poderia alterar o preço no navegador antes de chamar o checkout.

### P0. Integrações Google estão no frontend e token pode ficar exposto

`Layout.tsx`, `StoreView.tsx`, `PastorsView.tsx` e `SocialView.tsx` usam fluxo Google Workspace/Calendar/Tasks com token do usuário. Há indícios de token salvo no documento `users`.

Impacto:

- token OAuth não deve ser tratado como dado comum de perfil;
- expiração do token quebra fluxos sem renovação clara;
- tarefas e eventos do calendário deveriam passar por backend/Cloud Function;
- permissões e auditoria ficam fracas.

### P1. Muitos botões têm aparência de ação, mas não executam ação própria

Uma varredura estática encontrou cerca de 70 elementos `Button/button` sem `onClick`, `type="submit"`, `disabled` ou `asChild`. Nem todos são erro final, porque alguns podem herdar ação por contexto visual, mas o volume confirma o problema apontado em Células.

Maiores concentrações:

| Arquivo | Quantidade aproximada |
|---|---:|
| `SchoolView.tsx` | 28 |
| `CellManagementDashboard.tsx` | 16 |
| `MinistriesView.tsx` | 7 |
| `StoreView.tsx` | 6 |
| `PastoralCareView.tsx` | 3 |
| `PastorsView.tsx` | 3 |

Exemplos reais:

- `CellManagementDashboard.tsx`: "Lançar Encontro Semanal", "Adicionar Novo Membro", "Registrar Novo Visitante", "Copiar Link Compartilhável", "Mostrar QR Code", "Nosso Instagram", "Enviar Mensagem", "Tornar Membro", "Consolidar".
- `SchoolView.tsx`: "Explorar Catálogo", certificados, alertas administrativos, suporte do aluno, dúvidas da aula e compra avulsa.
- `PastoralCareView.tsx`: "Contatar pelo WhatsApp", "Transferir para Líder de Célula", "Adicionar Nota no Histórico".
- `AdminDashboardMetrics.tsx`: insight fixo com "Agendar Reunião".
- `AdminStrategicGoals.tsx`: "Nova Ação Mensal".

### P1. Dashboards misturam dados reais com dados fixos

Exemplos:

- `AdminDashboardMetrics.tsx` lê KPIs reais, mas também exibe insight fixo como "Setor B caiu 15%".
- `CellManagementDashboard.tsx` lê membros, mas exibe alertas e percentuais fixos.
- `SchoolView.tsx` mostra membros/alunos/suporte com dados hardcoded em partes do painel.

Impacto: o usuário pode tomar decisões baseado em informação que parece analítica, mas não vem do banco.

### P1. O app compila, mas o bundle principal está grande

O build gerou um JS principal de 2.665 kB minificado. Para uma plataforma que tem várias áreas independentes, isso indica que o code splitting ainda não está suficiente.

Impacto:

- carregamento inicial pesado;
- pior experiência mobile;
- módulos administrativos carregados para usuários que não precisam deles;
- custo de manutenção maior.

### P1. A build padrão das Functions falha ao sobrescrever `functions/lib`

O TypeScript das Functions compila quando a saída vai para uma pasta temporária, mas `npm --prefix functions run build` falha ao tentar gravar:

- `functions/lib/index.js`
- `functions/lib/index.js.map`

Impacto: antes de deploy, é preciso resolver se estes arquivos estão bloqueados por processo local, sincronização, permissão do Windows ou por estarem versionados de forma problemática.

### P2. Documentos do projeto estão desatualizados ou com encoding quebrado

- `README.md` ainda parece boilerplate do AI Studio e não explica operação real.
- `ROADMAP_E_REVISAO.md` está com acentuação corrompida e não deve ser usado como verdade atual sem validação.
- `security_spec.md` é útil, mas cita testes de regras que não aparecem como rotina confiável.

## 5. Auditoria por módulo

### 5.1 Home pública

Arquivos principais:

- `src/components/HomeView.tsx`
- `src/components/HomeDashboard.tsx`

Funções atuais:

- Página pública.
- Formulário de visitante.
- Próximos eventos.
- Ministérios.
- Escalas do usuário.
- Notas locais de pregação.

Problemas:

- Formulário público de visitante grava em `visitor_leads`, mas a regra exige usuário autenticado e campos que o formulário não envia.
- Notas da pregação ficam no dispositivo/localStorage; isso é aceitável como recurso pessoal, mas não deve parecer histórico pastoral oficial.
- Há ações com `alert()` em vez de feedback persistente e rastreável.
- A página pública depende de dados que precisam ter regra pública clara. `events` e `ministries` permitem leitura pública; `cells` não permite.

Evoluções recomendadas:

- Criar endpoint/Function público para `visitor_leads`, com validação, anti-spam e roteamento para célula/pastoral.
- Registrar origem do lead: culto, site, QR code, célula, evento, campanha.
- Gerar indicador de tempo de resposta do visitante.
- Criar status padronizado: `novo`, `contatado`, `encaminhado_celula`, `em_consolidacao`, `membro`, `perdido`.

### 5.2 Login, cadastro e aprovação

Arquivos principais:

- `src/components/AuthView.tsx`
- `src/lib/permissions.ts`
- `server.ts`
- `functions/src/index.ts`

Funções atuais:

- Login Firebase.
- Onboarding de membro.
- Solicitação de papéis.
- Aprovação de usuário.
- Atualização de roles/claims.

Problemas:

- O cadastro busca células e ministérios sem filtro robusto de tenant no frontend.
- A seleção de papéis e os detalhes de novo ministério/célula precisam ser validados com schema compartilhado.
- Há fluxo de Google Workspace no login e também no layout, com comportamento dividido.
- A aprovação atual mistura atualização de documento com claims; precisa de rotina única e idempotente.

Evoluções recomendadas:

- Criar `userAccessService` com fluxo único: cadastro -> aprovação -> claims -> auditoria.
- Registrar `access_requests` em coleção própria, em vez de misturar tudo em `users`.
- Criar painel de aprovação com comparação clara entre papel solicitado e papel concedido.
- Incluir motivo obrigatório para recusa ou ajuste de papel.

### 5.3 Layout, navegação e permissões

Arquivos principais:

- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/lib/permissions.ts`

Funções atuais:

- Rotas protegidas.
- Menu baseado em permissões.
- Conexão Google Workspace.
- Notificações visuais.

Problemas:

- Há textos com encoding corrompido em partes da navegação.
- Botão de notificações tem aparência de recurso ativo, mas não está ligado a uma central real.
- Tokens Google não devem ser salvos como dados comuns do usuário.
- Alguns módulos têm entrada pública, mas dependem de Firestore bloqueado.

Evoluções recomendadas:

- Criar `notifications` real com leitura por usuário e por papel.
- Criar `audit_logs` para alterações sensíveis.
- Trocar tokens Google em Firestore por OAuth server-side seguro.
- Garantir que todo item de menu leve a uma experiência funcional ou marcada como indisponível.

### 5.4 Células

Arquivos principais:

- `src/components/CellsView.tsx`
- `src/components/CellManagementDashboard.tsx`

Funções atuais:

- Lista de células.
- Dashboard do líder de célula.
- Registro de relatório.
- Membros da célula.
- Visitantes e escalas.

Problemas:

- `CellsView.tsx` é rota pública, mas `firestore.rules` exige login para ler `cells`.
- O dashboard usa dados reais de `users`, mas também métricas e alertas fixos.
- Muitos botões não executam ação.
- `cell_reports` do frontend não bate com o schema exigido pelas regras.
- Escalas da célula são estado local simulado, sem persistência.
- Visitante de célula não vira lead/consolidação integrada.

Evoluções recomendadas:

- Decidir se lista pública de células deve ser pública. Se sim, criar campos públicos separados e regra de leitura pública segura.
- Criar `cell_meetings` ou padronizar `cell_reports` com:
  - `cellId`
  - `date`
  - `meetingType`
  - `presentMemberIds`
  - `visitorIds`
  - `summary`
  - `prayerRequests`
  - `nextActions`
  - `createdBy`
  - `tenantId`
  - `createdAt`
  - `updatedAt`
- Criar `cell_visitors` ou usar `visitor_leads` com `source: "cell"`.
- Transformar botões em fluxos:
  - lançar encontro;
  - adicionar membro;
  - registrar visitante;
  - enviar WhatsApp;
  - consolidar visitante;
  - gerar link/QR da célula;
  - distribuir escala.

Indicadores possíveis:

- frequência média por célula;
- visitantes por semana;
- conversão visitante -> consolidação -> membro;
- células sem relatório;
- líderes inativos;
- membros ausentes por 2+ encontros;
- célula pronta para multiplicação.

### 5.5 Membros

Arquivos principais:

- `src/components/MembersView.tsx`
- `src/lib/permissions.ts`
- `server.ts`
- `functions/src/index.ts`

Funções atuais:

- Lista de membros.
- Aprovação.
- Edição de perfil.
- Papéis/roles.
- Dados pastorais e geolocalização.

Problemas:

- Campos de célula/ministério/supervisor são digitados como ID manual. Isso é barreira técnica para operação real.
- Google Maps usa `process.env.VITE_GOOGLE_MAPS_API_KEY` em app Vite, onde o padrão correto é `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
- Existe fallback `AIzaSy_placeholder_key`.
- Atualização parcial de perfil e claims pode deixar estado inconsistente se uma parte falhar.
- Líderes podem ver UI de edição que talvez as regras não permitam executar.

Evoluções recomendadas:

- Trocar campos de ID por selects pesquisáveis.
- Criar histórico de alterações de papéis e célula.
- Separar dados públicos, pastorais e administrativos do membro.
- Criar processo de transferência de célula com aceite/rastro.
- Geocodificação deve ser backend ou serviço controlado, não dependente de global `window.google`.

Indicadores possíveis:

- membros aprovados x pendentes;
- distribuição por célula;
- membros sem célula;
- membros sem ministério;
- cobertura geográfica;
- tempo médio de aprovação;
- líderes por rede/supervisão.

### 5.6 Ministérios

Arquivos principais:

- `src/components/MinistriesView.tsx`

Funções atuais:

- Catálogo de ministérios.
- Criação/edição administrativa.
- Escalas.
- Briefings.
- Eventos de ministério.
- Solicitações entre ministérios.

Pontos fortes:

- É um dos módulos com melhor ideia de intercomunicação: ministério pode gerar briefing, evento e demanda para outra área.

Problemas:

- Arquivo grande demais.
- Há ações baseadas em `prompt()`.
- Alguns botões não têm ação clara.
- Criação de briefing financeiro em evento usa identificação textual/convencional, não vínculo forte com entidade real.
- Escalas precisam virar fonte de indicador, não apenas lista.

Evoluções recomendadas:

- Criar fluxo formal de `requests` entre ministérios:
  - solicitante;
  - ministério destino;
  - tipo;
  - prazo;
  - status;
  - aprovador;
  - histórico.
- Criar escalas com aceite/recusa, substituição e carga de voluntário.
- Criar indicador de SLA de briefing.
- Criar visão "minha semana de serviço" no dashboard do membro.

Indicadores possíveis:

- escalas completas;
- recusas e substituições;
- voluntários sobrecarregados;
- briefings pendentes;
- prazo médio de atendimento;
- ministérios sem líder;
- eventos com demandas sem responsável.

### 5.7 Eventos

Arquivos principais:

- `src/components/EventsView.tsx`
- `functions/src/index.ts`

Funções atuais:

- Listagem de eventos.
- Inscrição.
- Evento pago.
- Mercado Pago.
- Check-in.
- Crianças.
- QR/offline.
- Criação de eventos.

Problemas:

- Chave pública Mercado Pago está hardcoded como teste.
- `createPreference` retorna `initPoint`, mas o frontend não redireciona de forma completa no fluxo principal.
- Regra de `event_enrollments` não permite atualizar `preferenceId` ou `paymentStatus`.
- Botão de simulação de webhook aparece no fluxo.
- Offline queue existe, mas precisa de política clara de reconciliação.
- Criação de eventos abre para papéis que a regra pode não permitir.

Evoluções recomendadas:

- Modelo de inscrição:
  - `eventId`
  - `userId`
  - `status`
  - `paymentStatus`
  - `paymentProvider`
  - `paymentReference`
  - `checkedIn`
  - `checkedInAt`
  - `children`
  - `tenantId`
- Webhook com assinatura, idempotência e atualização transacional.
- Check-in deve aceitar apenas ingresso aprovado ou gratuito confirmado.
- Evento com demanda financeira/arte/mídia deve gerar tarefas/briefings ligadas ao evento.

Indicadores possíveis:

- inscrições por evento;
- taxa de pagamento aprovado;
- taxa de check-in;
- no-show;
- crianças registradas;
- receita por evento;
- demanda operacional gerada por evento.

### 5.8 Financeiro

Arquivos principais:

- `src/components/FinanceView.tsx`
- `src/components/admin/AdminFinance.tsx`

Funções atuais:

- Contribuições.
- Campanhas.
- Planos.
- Transações.

Problemas:

- Contribuição PIX é simulada e grava `completed`.
- `campaigns` não tem regra Firestore.
- `transactions` permite usuário criar transação completa; sem prova de pagamento.
- Admin financeiro e financeiro público ainda não parecem formar um ciclo contábil fechado.

Evoluções recomendadas:

- Nenhum usuário deve gravar pagamento como `completed` diretamente.
- Criar status:
  - `created`
  - `pending`
  - `approved`
  - `failed`
  - `refunded`
  - `reconciled`
- Criar `payment_intents`/`payment_events` para cada provedor.
- Webhook deve ser a única fonte de aprovação.
- Criar conciliação manual administrativa com anexo/comprovante.

Indicadores possíveis:

- arrecadação por campanha;
- recorrência;
- inadimplência de planos;
- pagamentos pendentes;
- conciliação pendente;
- receita por fonte: doação, evento, loja, escola.

### 5.9 Loja

Arquivos principais:

- `src/components/StoreView.tsx`
- `server.ts`

Funções atuais:

- Vitrine.
- Carrinho.
- Checkout.
- Produtos.
- Pedidos.
- Delegação para Google Tasks.

Problemas:

- `orders` não tem regra Firestore.
- Checkout simulado é fallback quando backend falha.
- Pedido simulado é gravado no banco.
- Backend confia no preço vindo do cliente.
- Webhook Mercado Pago não atualiza pedido.
- Google Tasks é chamado do frontend com token.
- Variações de tamanho/cor aparecem como botões, mas precisam de seleção real, validação e impacto no pedido.

Evoluções recomendadas:

- Checkout server-side com produto buscado por ID.
- Criar `orders` com itens normalizados:
  - `productId`
  - `nameSnapshot`
  - `unitPriceSnapshot`
  - `quantity`
  - `variant`
  - `status`
  - `paymentStatus`
  - `fulfillmentStatus`
- Criar webhook que atualiza `orders`.
- Criar fluxo de separação/entrega.
- Delegar tarefa por Cloud Function, não direto no frontend.

Indicadores possíveis:

- pedidos por status;
- receita de loja;
- produtos mais vendidos;
- conversão carrinho -> pagamento;
- tempo até entrega;
- itens pendentes de separação.

### 5.10 Escola

Arquivos principais:

- `src/components/SchoolView.tsx`
- `src/components/admin/AdminCourses.tsx`
- `src/components/admin/AdminQuizzes.tsx`

Funções atuais:

- Catálogo.
- Cursos.
- Módulos.
- Aulas.
- Matrículas.
- Trilhas.
- Certificados.
- Suporte.
- Compra avulsa.
- Assinatura.

Problemas:

- Arquivo grande demais.
- Assinatura simulada em erro de servidor.
- Compra avulsa de aula é simulada.
- Parte do painel do aluno usa dados hardcoded.
- Suporte do aluno não tem persistência clara.
- Certificado/download tem simulação.
- A navegação usa manipulação direta de DOM em alguns pontos.

Evoluções recomendadas:

- Separar:
  - catálogo;
  - player de aula;
  - progresso;
  - admin de cursos;
  - trilhas;
  - quizzes;
  - pagamentos;
  - certificados;
  - suporte.
- Criar `lesson_progress` ou consolidar progresso em `enrollments`.
- Criar `student_questions`.
- Criar `certificates` emitidos com hash e data.
- Compra avulsa e assinatura devem usar o mesmo módulo de pagamento real.

Indicadores possíveis:

- matrículas por curso;
- conclusão por curso;
- abandono;
- aulas assistidas;
- alunos premium;
- dúvidas abertas;
- certificados emitidos;
- conversão gratuito -> pago.

### 5.11 Cuidado pastoral

Arquivos principais:

- `src/components/PastoralCareView.tsx`

Funções atuais:

- Visitantes.
- Pedidos de oração.
- Alertas de risco.
- Status de oração.

Problemas:

- Botões de contato, transferência e histórico não executam ação.
- Leads públicos podem não entrar no banco por conflito de regras.
- Falta timeline pastoral unificada por pessoa.
- Alertas de risco precisam ser derivados de frequência real, não apenas documentos soltos.

Evoluções recomendadas:

- Criar `pastoral_notes` com permissões restritas.
- Criar `pastoral_actions`:
  - contato;
  - ligação;
  - visita;
  - encaminhamento para célula;
  - oração respondida;
  - encerramento.
- Integrar com células e membros.
- Criar SLA de acompanhamento.

Indicadores possíveis:

- leads novos por semana;
- tempo até primeiro contato;
- pedidos de oração em aberto;
- alertas de risco por gravidade;
- conversão de visitante em membro;
- encaminhamentos para célula.

### 5.12 Pastores, social e unidades

Arquivos principais:

- `src/components/PastorsView.tsx`
- `src/components/SocialView.tsx`
- `src/components/UnitsView.tsx`

Funções atuais:

- Perfil de pastores.
- Agendamento pastoral.
- Profissionais sociais.
- Agendamento social.
- Unidades/campi.

Problemas:

- Coleções principais não têm regras.
- Há itens padrão/mockados que não podem ser excluídos.
- Aprovação de agenda tenta salvar no Google Calendar pelo frontend.
- Agendamentos precisam de status e trilha de auditoria.
- Unidades precisam virar referência transversal para células, eventos, membros e cultos.

Evoluções recomendadas:

- Criar regras para `pastors`, `pastoral_appointments`, `social_professionals`, `social_appointments`, `units`.
- Criar status padronizado:
  - `requested`
  - `approved`
  - `declined`
  - `completed`
  - `cancelled`
  - `no_show`
- Integração Calendar via backend.
- Unidades devem ter ID usado em eventos, células, relatórios de culto e membros.

Indicadores possíveis:

- agenda solicitada x aprovada;
- atendimentos concluídos;
- no-show;
- demanda por profissional;
- demanda por unidade;
- capacidade por campus.

### 5.13 Gestão, KPIs e planejamento

Arquivos principais:

- `src/components/admin/AdminDashboardMetrics.tsx`
- `src/components/AdminStrategicGoals.tsx`
- `src/components/AdminPlanningKanban.tsx`
- `src/components/AdminAutomations.tsx`
- `src/components/admin/AdminSupport.tsx`

Funções atuais:

- Metas estratégicas.
- KPIs.
- Relatórios de culto/financeiros.
- Kanban de tarefas.
- Automação/WhatsApp.
- Suporte administrativo.

Problemas:

- Dashboard mistura dados reais e insight fixo.
- `AdminStrategicGoals.tsx` usa `prompt()` para atualizar valor.
- Automação WhatsApp chama endpoint que retorna `503` se não configurado e `501` mesmo configurado.
- Campos da automação não estão ligados ao payload real.
- Falta camada de indicadores derivados dos módulos.

Evoluções recomendadas:

- Criar `kpi_definitions`:
  - nome;
  - fórmula;
  - fonte;
  - frequência;
  - dono;
  - meta;
  - unidade.
- Criar `kpi_snapshots` para histórico.
- Criar `automation_runs` para log de disparos.
- Criar ações de dashboard que geram tarefas reais no Kanban.
- Criar alertas automáticos baseados em dados, não texto fixo.

Indicadores possíveis:

- metas por pilar;
- progresso por período;
- tarefas atrasadas;
- KPIs sem atualização;
- automações disparadas;
- falhas de notificação;
- indicadores com tendência negativa.

### 5.14 Jornada e mídia

Arquivos principais:

- `src/components/JornadaView.tsx`
- `src/components/SocialMediaView.tsx`

Problemas:

- `JornadaView.tsx` usa `members`, enquanto a plataforma usa `users` como entidade principal de pessoa.
- `SocialMediaView.tsx` parece mais vitrine/atalho do que módulo operacional completo.
- Jornada deveria ser derivada do ciclo real da pessoa: visitante, consolidação, célula, escola, ministério, liderança.

Evoluções recomendadas:

- Reconciliar `members` com `users`.
- Criar `journey_events`:
  - `visitor_created`
  - `first_contact`
  - `cell_attended`
  - `course_started`
  - `course_completed`
  - `ministry_joined`
  - `leader_approved`
- Criar visão de jornada por pessoa e por funil geral.
- Mídia deve consumir eventos, briefings e calendário editorial.

## 6. Modelo de dados recomendado

### 6.1 Entidades centrais

| Entidade | Coleção sugerida | Observação |
|---|---|---|
| Pessoa/membro | `users` | Fonte única. Evitar coleção paralela `members`. |
| Solicitação de acesso | `access_requests` | Evita misturar pedido e permissão final no perfil. |
| Célula | `cells` | Deve ter campos públicos e privados separados. |
| Encontro de célula | `cell_reports` ou `cell_meetings` | Fonte de frequência, visitantes e alertas. |
| Visitante/lead | `visitor_leads` | Deve aceitar origem pública via endpoint seguro. |
| Ministério | `ministries` | Base de escalas e briefings. |
| Escala | `scales` | Precisa de aceite/recusa e histórico. |
| Demanda/briefing | `briefings` | Pode atender mídia, financeiro, eventos e ministérios. |
| Evento | `events` | Deve gerar inscrições, check-in e demandas. |
| Inscrição | `event_enrollments` | Deve incluir status e pagamento. |
| Pagamento | `payment_intents` / `payment_events` | Provedor deve confirmar status. |
| Pedido de loja | `orders` | Precisa regra, status e fulfillment. |
| Produto | `products` | Preço deve ser validado no servidor. |
| Curso | `courses` | Base da escola. |
| Aula | `lessons` | Progresso deve ser rastreado. |
| Matrícula | `enrollments` | Fonte de progresso. |
| Certificado | `certificates` | Gerado após conclusão. |
| Atendimento pastoral | `pastoral_appointments` | Precisa status e auditoria. |
| Atendimento social | `social_appointments` | Precisa status e auditoria. |
| Unidade/campus | `units` | Deve atravessar eventos, células e relatórios. |
| KPI | `kpi_definitions` / `kpi_snapshots` | Separar definição de medição. |
| Auditoria | `audit_logs` | Alterações críticas. |
| Notificação | `notifications` / `automation_runs` | Envio e falha rastreáveis. |

### 6.2 Fluxos interligados esperados

Fluxo de visitante:

1. Pessoa preenche formulário público.
2. Cria `visitor_leads`.
3. Gera notificação para célula/pastoral.
4. Líder registra contato.
5. Lead é encaminhado para célula.
6. Frequência em célula registra presença.
7. Lead vira membro em `users`.
8. Jornada registra conversão.
9. KPIs atualizam conversão e tempo de resposta.

Fluxo de evento:

1. Ministério cria evento.
2. Evento gera briefings para mídia/financeiro/estrutura.
3. Público se inscreve.
4. Pagamento é confirmado por webhook quando aplicável.
5. Check-in registra presença.
6. Crianças e acompanhantes ficam vinculados.
7. Financeiro e KPIs recebem receita/presença/no-show.

Fluxo de escola:

1. Admin cria curso, módulos e aulas.
2. Aluno se matricula.
3. Progresso é salvo por aula.
4. Dúvidas entram em suporte.
5. Conclusão gera certificado.
6. Jornada e KPIs recebem avanço.
7. Assinatura ou compra avulsa passa por pagamento real.

Fluxo de loja:

1. Admin cadastra produto.
2. Membro adiciona item ao carrinho.
3. Backend calcula preço por ID.
4. Mercado Pago cria pagamento.
5. Webhook confirma.
6. Pedido muda para pago.
7. Tarefa de separação/entrega é criada.
8. KPI registra receita e status operacional.

## 7. KPIs e indicadores recomendados

| Área | Indicadores iniciais |
|---|---|
| Células | Frequência média, visitantes por encontro, conversão visitante->membro, células sem relatório, ausências recorrentes. |
| Membros | Aprovações pendentes, membros sem célula, membros sem ministério, líderes ativos, tempo médio de aprovação. |
| Ministérios | Escalas completas, recusas, substituições, briefings pendentes, SLA de demandas, voluntários sobrecarregados. |
| Eventos | Inscrições, pagamento aprovado, check-in, no-show, crianças registradas, receita por evento. |
| Financeiro | Arrecadação por fonte, campanhas ativas, conciliação pendente, recorrência, inadimplência. |
| Loja | Pedidos pagos, pedidos pendentes, produtos mais vendidos, conversão carrinho->checkout, tempo até entrega. |
| Escola | Matrículas, conclusão, abandono, premium conversion, certificados emitidos, dúvidas abertas. |
| Pastoral | Leads novos, tempo até contato, pedidos de oração em aberto, alertas críticos, visitas concluídas. |
| Social | Atendimentos solicitados, aprovados, concluídos, no-show, demanda por especialidade. |
| Gestão | Metas no prazo, tarefas atrasadas, KPIs sem atualização, automações executadas, falhas de notificação. |

## 8. Plano de entregas recomendado

### Entrega 0 - Confiança mínima e ambiente

Objetivo: impedir que a plataforma prometa ações que não consegue cumprir.

Itens:

- Resolver build padrão das Functions em `functions/lib`.
- Corrigir encoding de textos visíveis e documentos-base.
- Documentar `.env` real por ambiente.
- Criar flag `VITE_ENABLE_DEV_SIMULATIONS=false` por padrão.
- Remover ou esconder simulações em produção.
- Trocar botões sem ação por ação real, estado desabilitado ou modal "em implantação".
- Atualizar README operacional.

### Entrega 1 - Contrato de dados e segurança

Objetivo: fazer frontend, regras e banco falarem a mesma língua.

Itens:

- Criar inventário oficial de coleções.
- Atualizar `firebase-blueprint.json`.
- Adicionar regras para coleções ausentes.
- Corrigir schemas incompatíveis (`visitor_leads`, `cell_reports`, `event_enrollments`).
- Criar testes de Firestore Rules com emulator.
- Criar `schemas` TypeScript/Zod por domínio.
- Criar camada `services` por domínio.
- Padronizar `tenantId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

### Entrega 2 - Fechamento de fluxos operacionais críticos

Objetivo: transformar mini-plataformas em operação real.

Prioridade:

1. Células: relatório, visitantes, membros, QR/link e consolidação.
2. Visitantes/cuidado pastoral: lead público, contato, transferência, timeline.
3. Membros: aprovação, selects reais e troca de célula/ministério.
4. Eventos: inscrição, check-in e status.
5. Ministérios: briefings, escalas com aceite e tarefas.

### Entrega 3 - Pagamentos reais

Objetivo: remover risco financeiro.

Itens:

- Centralizar pagamentos em backend/Functions.
- Criar `payment_intents` e `payment_events`.
- Validar assinatura de webhook.
- Usar idempotência.
- Atualizar loja, eventos, escola e financeiro a partir do webhook.
- Recalcular preço no servidor.
- Criar conciliação administrativa.

### Entrega 4 - Autonomia sem barreira técnica

Objetivo: líderes operarem sem depender de IDs, planilhas ou conhecimento técnico.

Itens:

- Selects pesquisáveis para células, membros, ministérios, unidades e líderes.
- Formulários guiados por contexto.
- Ações rápidas com confirmação clara.
- Histórico por entidade.
- Notificações reais.
- Templates de mensagem WhatsApp.
- Aprovações com motivo e responsável.

### Entrega 5 - Indicadores e inteligência operacional

Objetivo: transformar dados recorrentes em gestão.

Itens:

- Criar `kpi_definitions`.
- Criar `kpi_snapshots`.
- Criar dashboards por papel.
- Criar alertas baseados em dados.
- Criar relatórios semanais/mensais.
- Criar funil da jornada da pessoa.

### Entrega 6 - Performance, UX e manutenção

Objetivo: tornar a plataforma sustentável.

Itens:

- Dividir componentes grandes.
- Aplicar lazy loading por rota/admin.
- Reduzir bundle principal.
- Substituir `alert()` e `prompt()` por componentes consistentes.
- Criar estados vazios úteis.
- Melhorar acessibilidade de botões e formulários.
- Criar QA visual por fluxo crítico.

## 9. Backlog priorizado

### Correções imediatas

- Criar regras Firestore para `orders`, `campaigns`, `pastors`, `pastoral_appointments`, `social_professionals`, `social_appointments`, `units` e decidir destino de `members`.
- Corrigir formulário público de visitante para gravar via endpoint seguro.
- Alinhar `cell_reports` entre frontend e regras.
- Alinhar `event_enrollments` entre frontend, Functions e regras.
- Remover fallback de checkout simulado da loja em produção.
- Remover assinatura simulada da escola em produção.
- Bloquear transação financeira `completed` criada diretamente pelo cliente.
- Corrigir cálculo de preço da loja no backend.
- Resolver build padrão de Functions.

### Melhorias de produto

- Transformar botões sem ação em fluxos reais.
- Criar central de notificações.
- Criar histórico/timeline por pessoa.
- Integrar células, pastoral e jornada.
- Criar fluxo de briefings entre ministérios com SLA.
- Criar escalas com aceite.
- Criar certificados reais na escola.
- Criar status completo para loja/eventos/social/pastoral.

### Melhorias técnicas

- Criar camada de serviços.
- Criar schemas compartilhados.
- Criar testes de regras Firebase.
- Criar seed de emulator.
- Criar logs de auditoria.
- Criar code splitting por rota.
- Remover dados hardcoded de dashboards.
- Migrar integrações Google para backend.

## 10. Limites da auditoria e validações futuras

Esta auditoria foi baseada em leitura minuciosa de código, regras, documentação local, comparação com os repositórios de referência e validações de build. Não foi feito teste manual autenticado com usuários reais, dados reais do Firebase, conta Google Workspace conectada ou pagamentos reais em sandbox.

Validações recomendadas para a próxima etapa:

- Rodar Firebase Emulator com regras e seeds representativos.
- Testar cada papel de usuário: membro, líder de célula, líder de ministério, supervisor, pastor auxiliar, pastor de rede, pastor sênior e admin.
- Abrir cada rota com usuário permitido e usuário sem permissão.
- Executar fluxo completo de visitante público, célula, evento pago, loja, escola, pastoral e social.
- Validar webhooks Mercado Pago em sandbox.
- Validar integrações Google em ambiente controlado.
- Medir bundle depois de novo code splitting.

## 11. Conclusão

A Plataforma Coroado tem uma base visual e conceitual forte, e a direção de produto é boa: não é apenas uma página da igreja, é um sistema operacional para a comunidade. Mas hoje ela está em uma fase híbrida: parte plataforma real, parte protótipo avançado.

O maior ganho agora não vem de adicionar mais páginas. Vem de fechar contratos: dados, permissões, pagamentos, ações e indicadores. Depois disso, cada página pode realmente funcionar como uma plataforma própria, mas conectada por dados comuns: pessoas, células, eventos, ministérios, pagamentos, jornada e KPIs.

A recomendação é não atacar tudo como uma única refatoração gigante. O caminho mais seguro é por entregas, começando por segurança/dados, depois fluxos críticos, pagamentos, autonomia operacional e, por fim, indicadores avançados.

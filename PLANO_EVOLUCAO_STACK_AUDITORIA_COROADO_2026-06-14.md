# Estado final desta rodada

- A migracao para Next.js comecou de forma incremental com `src/app`, sem abandonar a SPA Vite atual.
- A camada tRPC foi iniciada em `/api/trpc` e ja compartilha autenticacao e operacoes com o BFF REST.
- Check-in de eventos, progresso da Escola IDE e criacao de planos financeiros foram movidos para o backend.
- O webhook Mercado Pago agora alimenta eventos de pagamento, pedidos, inscricoes de eventos e transacoes financeiras.
- O primeiro modelo SQL/BI versionado foi criado para orientar Cloud SQL/PostgreSQL e BI.
- A camada visual premium com motion comecou pelo financeiro administrativo e ganhou presets reutilizaveis.
- A Fase 1 ficou substancialmente concluida: contratos, colecoes, payloads, servicos de dominio e cliente HTTP foram criados.
- A Fase 2 avancou com BFF modular por dominio, incluindo contribuicoes, checkout, escola, eventos e conciliacao financeira.
- Inscricoes de eventos e conciliacao financeira nao sao mais o proximo passo imediato: ja foram movidas para rotas autenticadas no backend.
- O proximo passo natural passa a ser endurecer operacoes administrativas restantes, progresso/check-in e o primeiro desenho SQL/BI para indicadores.
- A migracao para Next.js/tRPC deve acontecer depois que cada area critica tiver contrato, rota backend e validacao passando.

# Plano de evolução stack + auditoria Coroado

Data: 14/06/2026

## Decisão técnica

A evolução recomendada não é uma reescrita imediata. O caminho mais seguro é fazer a plataforma atravessar seis fases, mantendo o que já funciona e movendo gradualmente regra de negócio, dados e performance para uma base mais robusta.

Stack-alvo:

- React/Next.js como experiência principal.
- Node.js como BFF/API.
- tRPC como primeira camada de API interna tipada.
- GraphQL somente quando houver consumidores externos, app mobile ou integrações que precisem consultar múltiplos domínios com flexibilidade.
- Firebase Auth mantido.
- Firestore para operação em tempo real.
- SQL/BI para financeiro, pedidos, indicadores, auditoria e relatórios.

## Interseção das 6 fases com a auditoria

| Fase | Evolução de stack | Pontos da auditoria que resolve | Entrega prática |
|---|---|---|---|
| 1. Contratos e modularização | Criar `domain`, `services`, `api/http` e contratos Zod | Falta de camada central de dados, divergência de campos, componentes gigantes | Contratos compartilhados e payloads tipados antes de tRPC |
| 2. Backend/BFF tipado | Consolidar Node APIs e preparar tRPC routers | Regras de negócio no frontend, checkout, Google, pagamentos, permissões | Rotas server-side por domínio |
| 3. Dados e indicadores | Mapear Firestore -> SQL/BI por domínio | KPIs frágeis, dados recorrentes sem tabela, financeiro sem auditoria | Modelo relacional incremental para BI |
| 4. Next.js gradual | Migrar primeiro shell, áreas públicas e dashboards | Navegação manual, bundle grande, SPA pesada | App Router, layouts e carregamento por rota |
| 5. UX premium e performance | Motion system, Suspense, lazy modules, skeletons | Telas bonitas mas pouco fluidas, carregamento pesado, pouca hierarquia visual | Sistema visual consistente e transições por fluxo |
| 6. Integrações e automação | Workers/functions, filas, webhooks, notificações | Botões sem finalidade, Google/WhatsApp incompletos, ações manuais | Automações auditáveis e integrações server-side |

## Estado atual

Já foram atacados pontos P0 da auditoria:

- Regras Firestore ampliadas e validadas.
- `firebase.json` e validação por emulador.
- Checkout da loja movido para backend.
- Simulações perigosas de pagamento removidas.
- Tokens Google removidos do perfil.
- Botões críticos em células, pastoral, escola e financeiro convertidos em ações reais.

## Próxima entrega escolhida

Começar pela Fase 1, porque ela reduz risco agora e prepara as fases seguintes.

Implementado nesta entrega:

- `src/lib/domain/platform-contracts.ts`
- `src/lib/domain/payloads.ts`
- `src/lib/domain/collections.ts`
- `src/lib/api/http.ts`
- Checkout com payload mínimo e tipado.
- Lead público com contrato compartilhado entre frontend e backend.
- Relatórios de células com payload padronizado para presença, visitantes e resumo.
- Contribuições financeiras pendentes com payload padronizado para valor, status, método, item e tenant.
- Inscrições de eventos com payload padronizado para usuário, evento, filhos, pagamento e check-in.
- Contratos Zod adicionados para `cell_reports`, `transactions`, `event_enrollments`, `orders` e perfis de membros.
- Primeiros serviços de domínio criados em `src/lib/services/` para reduzir regra de escrita dentro das telas.
- Serviços de domínio expandidos para membros, pastoral e social.
- Contratos adicionados para tarefas, agendamentos pastorais, atendimentos sociais, profissionais sociais, status de visitante e status de oração.
- Consultas administrativas do Social passaram a respeitar `tenantId`.
- Serviços de domínio expandidos para escola, planejamento e ministérios.
- Contratos adicionados para cursos, módulos, aulas, trilhas, matrículas, progresso, tarefas, comentários de tarefas, ministérios, escalas e briefings.
- Telas de Escola, Kanban e Ministérios deixaram de montar diretamente os principais documentos Firestore de criação/atualização.
- Primeira rota BFF financeira criada: `POST /api/contributions`, autenticada com Firebase Auth e gravando transações via Admin SDK.
- Financeiro passou a registrar contribuição pendente pelo BFF, reduzindo escrita sensível direta no cliente.
- BFF modularizado em `src/server/`, separando contexto/autenticação e rotas por domínio.
- Primeira rota BFF da Escola criada: `POST /api/school/enrollments`, com validação de curso, tenant e matrícula duplicada.
- Escola IDE passou a matricular pelo BFF, mantendo leitura/progresso operacional no fluxo atual.

Decisão de performance:

- Validações pesadas com Zod ficam no servidor/contratos.
- O frontend importa apenas builders leves de payload quando possível.
- Isso evita carregar dependências de validação no bundle principal enquanto a migração para Next/tRPC ainda não aconteceu.

Próximos contratos a extrair:

- `members`
- `events`
- `payments`
- `pastoral_appointments`
- `social_appointments`
- `tasks`

Próxima entrega recomendada:

- Expandir BFF/tRPC para progresso de aulas, check-in de eventos, gestão administrativa de planos e operações que ainda dependem de escrita direta do cliente.
- Mover progresso de aula e operações administrativas da Escola para rotas server-side quando envolver regra de permissão.
- Introduzir uma camada de autorização server-side reaproveitando os contratos já extraídos.
- Definir o primeiro modelo SQL/BI para `transactions`, `orders`, `payments`, `event_enrollments` e `cell_reports`.

## Critério de avanço

Uma área só deve migrar para Next/tRPC depois de ter:

- contrato de dados;
- regras Firestore compatíveis;
- serviço ou rota backend;
- tela sem simulação perigosa;
- validação `npm run validate` passando.

## Avanco executado apos a proxima etapa

Fase 2 - BFF tipado:

- Check-in, progresso da Escola, planos administrativos, checkout da loja, inscricoes de eventos, compras da Escola e assinaturas passaram a ter rotas backend.
- tRPC esta publicado em `/api/trpc` como base incremental, com REST mantido nos fluxos que ja alimentam a SPA atual.

Fase 3 - Dados e indicadores:

- Schema SQL/BI expandido para assinaturas e acessos avulsos da Escola IDE.
- Worker `sync:bi` criado para espelhar dimensoes e fatos do Firestore para PostgreSQL/Cloud SQL.
- A decisao segue hibrida: Firestore operacional e SQL para indicadores, auditoria e BI.

Fase 4 - Next.js gradual:

- Criadas rotas explicitas no App Router para as principais telas, ainda apontando para a experiencia React atual enquanto cada area migra por dentro.
- Build Next validado com 17 paginas estaticas geradas.

Fase 5 - UX premium e performance:

- Motion base aplicado em telas principais como primeira camada visual.
- O proximo passo visual e trocar blocos internos pesados por secoes com entrada/saida, skeletons e transicoes por acao.

Fase 6 - Integracoes e automacao:

- Mercado Pago ficou centralizado no backend para produtos, eventos, compras avulsas da Escola e assinatura recorrente.
- Webhooks passaram a alimentar pedidos, inscricoes, acessos, assinaturas, transacoes e `payment_events`.

Proximo passo natural:

- Migrar uma tela completa por vez para componentes Next nativos, com loading states por rota, testes de fluxo logado e primeira execucao real do `sync:bi` contra Cloud SQL quando `DATABASE_URL` estiver disponivel.

## Avanco executado - Firebase real e chunks por rota

Firebase:

- Projeto local associado em `.firebaserc`.
- Firestore nomeado configurado em `firebase.json`.
- BFF e Cloud Functions alinhados ao mesmo databaseId usado pelo client.
- Regras e indexes publicados no database `ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b`.

Migracao:

- As telas principais passaram a carregar sob demanda com `React.lazy`.
- O build agora gera chunks separados por area, reduzindo o peso inicial do app e preparando a troca gradual por paginas Next nativas.

Proximo passo natural:

- Extrair a primeira tela para uma pagina Next nativa com dados server-side/BFF. Recomendacao: comecar por Financeiro ou Eventos, porque ja tem rotas backend, pagamentos e indicadores conectados.

# Auditoria Profunda e Plano de Refatoração (File-by-File)

Este documento consolida uma auditoria profunda do código da Plataforma Coroado, analisando as entranhas dos arquivos para identificar falhas de segurança, gargalos de performance e propor o roadmap de microserviços e transição gradual para Next.js.

## User Review Required

> [!WARNING]
> **Vulnerabilidade de Segurança em Webhooks**
> No arquivo `functions/src/index.ts`, a rota `mpWebhook` **não valida a assinatura** do webhook do Mercado Pago. (Há um comentário explícito no código: `// In a real scenario, you should verify the signature here...`). Isso permite que agentes mal-intencionados forjem aprovações de pagamento. É urgente corrigir isso.

## Dívidas Técnicas e Falhas Identificadas (Por Arquivo)

### 1. `src/App.tsx` e a Transição Next.js (`src/app/NextClientApp.tsx`)
**Status:** A transição gradual para Next.js está embrulhando todo o App Vite através de um import dinâmico em `NextClientApp.tsx` (`ssr: false`).
**Falha:** O arquivo `src/App.tsx` importa **absolutamente todas as Views** (`HomeView`, `AdminView`, `JornadaView`, `StoreView`, etc.) de forma estática e síncrona no topo do arquivo.
**Impacto:** Como o Next.js carrega o `App` inteiro no lado do cliente, o usuário precisa baixar o bundle de TODAS as páginas (inclusive da Gestão) para renderizar a Home. Isso mata a performance da transição.
**Solução:** Implementar `React.lazy()` para todas as rotas dentro do `App.tsx` e envolver o `<Routes>` num `<Suspense>`, garantindo o Split Coding.

### 2. Fragmentação do Backend (`src/server/routes/*` vs `functions/src/index.ts`)
**Status:** Existe um servidor Express rodando no `server.ts` que hospeda rotas como `src/server/routes/financeRoutes.ts`. Ao mesmo tempo, existem Cloud Functions no `functions/src/index.ts`.
**Falha:** Duplicidade de camadas de backend. As rotas Express estão fortemente acopladas ao servidor Node/Vite local e processam requisições que deveriam ser serveless.
**Impacto:** Dificulta a arquitetura de microserviços. Se o `server.ts` cair ou precisar escalar verticalmente, todas as rotas caem.
**Solução:** Extrair o conteúdo das rotas Express (como `/api/admin/plans` e `/api/contributions`) para arquivos isolados dentro de `functions/src/`, rodando 100% como Firebase Cloud Functions (Microserviços independentes).

### 3. Falta de Inteligência Cruzada (`src/lib/services/*` e `functions`)
**Status:** A plataforma exige que "os dados transitem dentro desse ecosistema mantendo uma alimentação cruzada" (ex: Células conversando com Cuidado Pastoral).
**Falha:** Ao analisar arquivos como `src/lib/services/cellReportsService.ts`, vemos que a submissão de um relatório apenas injeta um documento na coleção `cellReports`. Não há triggers reativos disparando cálculos no backend.
**Impacto:** A inteligência não é automatizada. O sistema apenas lê e escreve de forma isolada.
**Solução:** Criar Firebase Functions Triggers (ex: `onDocumentCreated('cell_reports/{id}')`). Quando um relatório de célula é preenchido informando que um membro faltou 3 vezes, o Trigger de backend deve ler isso e automaticamente criar um alerta no CRM em `risk_alerts` para a equipe Pastoral, gerando a verdadeira "Inteligência Cruzada".

---

## Proposed Changes

Abaixo estão as mudanças práticas para resolver a auditoria.

### Fase 1: Segurança e Performance Frontend

#### [MODIFY] `functions/src/index.ts`
- Implementar criptografia HmacSHA256 para validar a request do Mercado Pago no `mpWebhook`.

#### [MODIFY] `src/App.tsx`
- Refatorar as 15+ importações estáticas para:
  `const HomeView = React.lazy(() => import('./components/HomeView').then(m => ({default: m.HomeView})))`
- Aplicar `<Suspense>` no roteador.

### Fase 2: Arquitetura de Microserviços

#### [MODIFY] `server.ts`
- Remover `registerFinanceRoutes`, `registerSchoolRoutes`, etc.
- Manter o `server.ts` apenas para servir o tRPC e o bundle de transição do Next.js.

#### [NEW] Arquivos no Firebase Functions
- Mover a lógica de negócio do backend Express para pastas isoladas em microserviços dentro do Firebase:
  - `functions/src/finance/contributions.ts`
  - `functions/src/admin/reconcile.ts`

### Fase 3: Triggers de Alimentação Cruzada

#### [NEW] `functions/src/triggers/crossFeed.ts`
- `onCellReportCreated`: Trigger para calcular engajamento do membro e atualizar seu Score de Discipulado ou gerar alerta no Cuidado Pastoral.
- `onLeadConverted`: Trigger para mover o visitante para a lista de Novos Membros e avisar a Secretaria.

---

## Verification Plan

### Automated Tests
- Criar e rodar scripts de teste (`test:flows`) para simular o Webhook com e sem assinatura válida.
- Rodar `npm run build` para garantir que o *Rollup/Webpack* gerou múltiplos chunks (comprovando que o lazy loading quebrou o monolito com sucesso).

### Manual Verification
- Utilizar a aba *Network* das DevTools do navegador para confirmar que acessar a rota `/` da plataforma não baixa mais os componentes administrativos e financeiros.

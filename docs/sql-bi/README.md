# Modelo SQL/BI Coroado

Este diretorio inicia a camada analitica da plataforma sem substituir o Firestore operacional.

## Decisao

- Firestore continua como banco operacional para telas em tempo real.
- Cloud SQL/PostgreSQL recebe fatos recorrentes e historicos para indicadores.
- A primeira fronteira analitica cobre financeiro, pedidos, eventos, celulas, escola e KPIs.

## Primeiros fluxos a espelhar

- `transactions` -> `coroado_bi.fact_transaction`
- `orders` -> `coroado_bi.fact_order`
- `payment_events` -> `coroado_bi.fact_payment_event`
- `event_enrollments` -> `coroado_bi.fact_event_enrollment`
- `cell_reports` -> `coroado_bi.fact_cell_report`
- `enrollments` + `lessons` -> `coroado_bi.fact_school_progress`
- `subscriptions` -> `coroado_bi.fact_subscription`
- `learning_access` -> `coroado_bi.fact_learning_access`

## Indicadores cobertos

- Receita realizada, pendente e por origem.
- Conversao de eventos: inscritos, aprovados e check-ins.
- Saude de celulas: presenca media, visitantes e relatorios enviados.
- Escola IDE: progresso medio e conclusoes por curso.
- Escola IDE comercial: assinaturas ativas, MRR de assinatura e acessos avulsos ativos.

## Proximo passo de dados

O Cloud SQL/Data Connect ja foi criado em `us-east1`:

- Servico: `gen-lang-client-0529830528-service`
- Instancia: `gen-lang-client-0529830528-instance`
- Banco: `gen-lang-client-0529830528-database`

Executar `npm run sync:bi:schema` uma vez para aplicar o schema e depois agendar `npm run sync:bi` em Cloud Run Jobs, Cloud Scheduler ou GitHub Actions com `DATABASE_URL`, `CLOUD_SQL_DATABASE_URL` ou `CLOUD_SQL_USER`/`CLOUD_SQL_PASSWORD`.

Detalhes operacionais: `docs/sql-bi/cloud-sql-coroado.md`.

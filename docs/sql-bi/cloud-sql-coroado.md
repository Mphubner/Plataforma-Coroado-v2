# Cloud SQL / BI Coroado

## Recurso criado

- Local: `us-east1`
- Servico/Data Connect: `gen-lang-client-0529830528-service`
- Instancia Cloud SQL: `gen-lang-client-0529830528-instance`
- Banco de dados: `gen-lang-client-0529830528-database`
- Tipo: `PostgreSQL 18`
- Connection name esperado: `gen-lang-client-0529830528:us-east1:gen-lang-client-0529830528-instance`

## Como ligar o worker

O worker `npm run sync:bi` aceita duas formas:

1. `DATABASE_URL` ou `CLOUD_SQL_DATABASE_URL` completa.
2. Metadados Cloud SQL + credenciais:
   - `CLOUD_SQL_CONNECTION_NAME`
   - `CLOUD_SQL_DATABASE`
   - `CLOUD_SQL_POSTGRES_VERSION=18`
   - `CLOUD_SQL_USER`
   - `CLOUD_SQL_PASSWORD`

Em Cloud Run com Cloud SQL conectado, o worker usa socket em:

`/cloudsql/gen-lang-client-0529830528:us-east1:gen-lang-client-0529830528-instance`

Para desenvolvimento local com Cloud SQL Auth Proxy, preencher:

- `CLOUD_SQL_HOST=127.0.0.1`
- `CLOUD_SQL_PORT=5432`

## Function agendada

`functions/src/sync-firestore-to-sql.ts` executa diariamente e usa o mesmo destino PostgreSQL 18.

Ela precisa das mesmas variaveis do worker:

- `CLOUD_SQL_CONNECTION_NAME`
- `CLOUD_SQL_DATABASE`
- `CLOUD_SQL_USER`
- `CLOUD_SQL_PASSWORD`
- `CLOUD_SQL_POSTGRES_VERSION=18`

Sem usuario/senha ou `DATABASE_URL`, a Function nao tenta gravar e registra `missing-postgresql-credentials`.

## Sequencia segura

1. Rodar `npm run sync:bi -- --dry-run`.
2. Preencher usuario/senha como secret do ambiente.
3. Rodar `npm run sync:bi:schema`.
4. Rodar `npm run sync:bi`.

Sem credenciais SQL, o dry-run valida configuracao e nao tenta escrever no banco.

# Firebase operacional da Plataforma Coroado

## Projeto ativo

- Projeto Firebase: `gen-lang-client-0529830528`
- Firestore database: `ai-studio-534c2e7e-8664-4b76-95e3-faf31fc1628b`
- Regiao do Firestore: `us-east1`
- Tipo: Firestore Native / Enterprise

O client web usa esse databaseId em `firebase-applet-config.json`.
O backend/BFF e o worker passam a usar o mesmo databaseId por `FIRESTORE_DATABASE_ID`.

## Comandos uteis

- `npm run firebase:projects`: lista projetos acessiveis pelo Firebase CLI.
- `npm run firebase:databases`: lista bancos Firestore do projeto ativo.
- `npm run firebase:indexes`: lista indexes do database Firestore usado pela plataforma.
- `npm run firebase:rules:dry-run`: valida um deploy de regras sem publicar.
- `npm run firebase:rules:deploy`: publica regras e indexes no database nomeado.
- `npm run validate:firestore`: valida regras localmente no emulador.

## Sobre DATABASE_URL

`DATABASE_URL` e `CLOUD_SQL_DATABASE_URL` sao para a camada SQL/BI em PostgreSQL/Cloud SQL.
Elas ainda sao opcionais: o Firestore segue como banco operacional.

Quando o Cloud SQL/SQL Connect for criado, preencher uma dessas variaveis e executar:

1. `npm run sync:bi:schema`
2. `npm run sync:bi`

Enquanto nao houver URL SQL, o comando `npm run sync:bi -- --dry-run` valida o worker sem tentar upserts.

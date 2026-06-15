# Decisao de stack - Plataforma Coroado

## Direcao escolhida

A migracao gradual para Next.js + BFF Node/tRPC foi a melhor decisao tecnica para o estado atual da plataforma.

Motivos:

- A plataforma ja tem muito React, Firebase Auth, Firestore e regras operacionais funcionando.
- Next.js permite migrar rota por rota sem interromper a hospedagem atual.
- App Router traz rotas por arquivo, layouts, loading states, Server Components e APIs no mesmo projeto.
- O BFF Node/tRPC reduz regra sensivel no cliente e conversa naturalmente com Firebase Admin SDK e Mercado Pago.
- Firestore continua como banco operacional em tempo real.
- Cloud SQL/PostgreSQL 18 entra como camada analitica/BI, nao como troca brusca do banco operacional.

## FastAPI e microservicos

FastAPI e uma excelente opcao para servicos Python, principalmente:

- IA, recomendacao e classificacao.
- Rotinas de dados, ETL e analise.
- Jobs assicronos com fila.
- APIs independentes com carga especifica.

Mas FastAPI nao deve substituir o BFF principal agora.
O caminho correto e uma arquitetura modular que possa virar microservicos quando houver escala, nao dividir cedo demais.

## Fronteiras recomendadas

- `web`: Next.js, React, UI premium, motion e rotas.
- `bff`: Node.js/tRPC/REST para autenticacao, permissao, pagamentos e operacoes da plataforma.
- `worker-bi`: sincronizacao Firestore -> Cloud SQL PostgreSQL 18.
- `ai-service` futuro: FastAPI para IA, recomendacoes, analises e automacoes pesadas.
- `integrations` futuro: webhooks, notificacoes, WhatsApp e jobs agendados.

## Criterio para extrair microservico

Extrair um servico separado apenas quando pelo menos dois destes pontos forem verdadeiros:

- precisa escalar separado da UI;
- usa stack diferente com ganho real, como Python/IA;
- tem dados/segredos proprios;
- precisa fila, retry, agendamento ou processamento longo;
- possui deploy e observabilidade independentes.

## Estado atual

- Next.js ja tem rotas explicitas.
- Financeiro iniciou a primeira pagina Next nativa.
- BFF ja cobre pagamentos, Escola, check-in, progresso e conciliacao.
- Cloud SQL PostgreSQL 18 foi registrado como destino BI.
- O proximo passo e migrar Eventos ou Escola para pagina Next nativa com dados do BFF.

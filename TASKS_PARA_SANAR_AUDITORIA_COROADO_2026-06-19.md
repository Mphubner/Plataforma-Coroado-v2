# Tasks para sanar completamente a auditoria da Plataforma Coroado

Data: 19 de junho de 2026
Base: `AUDITORIA_PLATAFORMA_COROADO_2026-06-19.md`
Repositório/local: `D:\Projetos\Coroado\Plataforma-Coroado`

## Como usar este arquivo

Este arquivo transforma a auditoria em backlog executável. As tarefas abaixo representam o que ainda falta aplicar para considerar a auditoria sanada de ponta a ponta, depois da primeira rodada de correções críticas já realizada.

Legenda:

- `P0`: bloqueia produção ou segurança operacional.
- `P1`: necessário para autonomia real da plataforma.
- `P2`: melhoria importante de UX, dados, governança ou manutenção.
- `Critério de aceite`: condição objetiva para marcar a tarefa como concluída.

## Já aplicado nesta rodada

Estes itens foram corrigidos antes da criação deste backlog e não precisam ser repetidos, mas devem continuar cobertos por validação:

- [x] Corrigir `npm run lint`.
- [x] Corrigir `npm run next:build`.
- [x] Corrigir `npm run lint:rules`.
- [x] Validar regras com `npm run validate:firestore`.
- [x] Remover senha hardcoded de `scripts/setup-db.ts`.
- [x] Fazer webhook Mercado Pago falhar fechado sem secret em produção.
- [x] Padronizar `adminDb` para usar Firestore database nomeado.
- [x] Proteger rotas Next de pastoral/calendário com sessão, tenant e papéis.
- [x] Assinar e validar OAuth `state` do Google Calendar.
- [x] Impedir agendamento pastoral com `userId`/`tenantId` forjados pelo cliente.
- [x] Criar pré-validação backend para QR/check-in.
- [x] Bloquear visualmente check-in de ingresso com pagamento pendente.
- [x] Padronizar variáveis de Mercado Pago entre Express e Functions.

## Entrega 0 - Higiene de release, Git e ambiente

Objetivo: garantir que a base auditada seja promovida sem regressões, divergência de branch ou segredo residual.

- [ ] `P0` Reconciliar branch local com `origin/main`.
  Área: Git/release.
  Detalhe: a auditoria identificou branch local atrasada em relação ao remoto. Antes de qualquer release, comparar o código atual com `origin/main` e resolver conflitos conscientemente.
  Critério de aceite: `git status` limpo ou com mudanças intencionais; branch atualizada/rebaseada/mergeada; diferenças documentadas.

- [ ] `P0` Rotacionar credenciais que apareceram em ambiente local.
  Área: segurança/secrets.
  Detalhe: `functions/.env` está ignorado pelo Git, mas continha token de teste Mercado Pago. Também rotacionar credencial Cloud SQL se a senha antiga hardcoded já foi usada.
  Critério de aceite: credenciais rotacionadas no provedor; `.env` local sem segredos obsoletos; `.env.example` atualizado com nomes corretos.

- [ ] `P0` Criar checagem de secrets antes de commit.
  Área: segurança/dev workflow.
  Detalhe: adicionar ferramenta ou script para detectar tokens, service accounts, senhas SQL e chaves privadas antes de merge.
  Critério de aceite: comando de validação falha ao encontrar padrão sensível em arquivos versionáveis.

- [ ] `P0` Tornar `npm run validate:full` obrigatório no CI.
  Área: CI/CD.
  Detalhe: hoje as validações passam localmente, mas precisam ser gate de merge.
  Critério de aceite: CI executa `npm run lint`, `npm run lint:rules`, `npm run validate:firestore`, `npm run build`, `npm --prefix functions run build`, `npm run next:build` e smoke tests.

- [ ] `P1` Registrar decisões técnicas em ADRs.
  Área: arquitetura/governança.
  Detalhe: documentar decisões sobre Vite vs Next, webhook oficial, pagamentos, Firestore Admin, auth e papéis.
  Critério de aceite: pasta `docs/adr` ou equivalente com decisões datadas e responsáveis.

## Entrega 1 - Arquitetura e fonte de verdade por domínio

Objetivo: reduzir duplicidade entre Vite, Next, Express, tRPC e Functions.

- [ ] `P0` Definir a fonte de verdade por domínio.
  Área: arquitetura.
  Detalhe: mapear Eventos, Escola, Financeiro, Pastoral, Social, Membros, Células, Ministérios, Loja e Jornada, definindo para cada um: UI oficial, API oficial, operações server-side e coleções.
  Critério de aceite: tabela publicada em `docs/arquitetura-dominios.md`; cada domínio tem owner técnico e caminho oficial.

- [ ] `P0` Escolher caminho oficial para Eventos.
  Área: eventos/pagamento/QR.
  Detalhe: hoje há `EventsView`, `EventosNativeClient`, BFF, tRPC e Functions. Definir qual tela é principal e quais APIs ficam oficiais.
  Critério de aceite: uma UI principal para inscrição e operação; APIs duplicadas marcadas para depreciação ou removidas.

- [ ] `P0` Escolher caminho oficial para Pagamentos.
  Área: pagamentos.
  Detalhe: padronizar criação de checkout e processamento de webhook em um service único.
  Critério de aceite: todos os domínios chamam o mesmo `payments` service ou contrato equivalente.

- [ ] `P1` Separar componentes gigantes por submódulos.
  Área: frontend/manutenção.
  Detalhe: priorizar `SchoolView`, `EventsView` e `MinistriesView`, que concentram muitas responsabilidades.
  Critério de aceite: cada tela crítica dividida em componentes de catálogo, admin, detalhes, forms e operação; sem arquivo monolítico acima de limite acordado.

- [ ] `P1` Criar camada comum de hooks/API para telas Vite e Next.
  Área: frontend/dados.
  Detalhe: evitar que Vite e Next busquem o mesmo dado por caminhos diferentes.
  Critério de aceite: telas duplicadas consomem hooks/clients compartilhados ou uma delas é aposentada.

- [ ] `P2` Criar diagrama de fluxo ponta a ponta.
  Área: documentação/produto.
  Detalhe: visitante -> lead -> célula -> membro -> escola -> ministério -> evento -> pagamento -> check-in -> indicadores.
  Critério de aceite: diagrama Mermaid ou documentação visual versionada.

## Entrega 2 - Permissões, papéis e segurança de dados

Objetivo: deixar autorização previsível, auditável e alinhada aos papéis canônicos.

- [ ] `P0` Criar matriz de permissões por ação.
  Área: segurança/produto.
  Detalhe: mapear ações como aprovar membro, editar papel, criar evento, operar QR, reconciliar pagamento, criar escala, ver dados financeiros e acessar agenda pastoral.
  Critério de aceite: matriz versionada com papéis `member`, `cellLeader`, `ministryLeader`, `supervisor`, `networkPastor`, `auxPastor`, `seniorPastor`, `admin` e capabilities específicas.

- [ ] `P0` Remover checks legados de `leader` e `pastor`.
  Área: permissões.
  Detalhe: substituir por `normalizeRoles`, `can`, `hasRole` e papéis canônicos.
  Critério de aceite: busca por checks de autorização com strings legadas não encontra uso ativo, salvo migração explícita.

- [ ] `P0` Criar capability financeira explícita.
  Área: financeiro/permissões.
  Detalhe: não depender apenas de `admin`/pastor para conciliação, relatórios e visão financeira.
  Critério de aceite: capability `finance:*` ou papel financeiro definido; UI, BFF e rules alinhados.

- [ ] `P0` Substituir bypass por e-mail fixo por configuração auditável.
  Área: segurança.
  Detalhe: `OWNER_EMAIL` pode existir, mas precisa ser env auditável, testado e documentado.
  Critério de aceite: dono configurado por env, com log/auditoria quando usado.

- [ ] `P1` Criar testes de regras Firestore por perfil.
  Área: Firestore Rules.
  Detalhe: cobrir membro comum, líder de célula, líder de ministério, supervisor, pastor de rede, pastor auxiliar, pastor sênior e admin.
  Critério de aceite: suite testa leitura/escrita permitida e negada em `users`, `tasks`, `task_updates`, `event_enrollments`, `transactions`, `courses`, `pastoral_appointments`.

- [ ] `P1` Escopar `task_updates` pela tarefa pai.
  Área: planejamento/auditoria.
  Detalhe: hoje as regras foram endurecidas, mas ainda falta garantir vínculo forte entre update e task pai.
  Critério de aceite: update só pode ser criado se a task existir, tiver mesmo tenant e o operador puder acessar a task.

- [ ] `P1` Registrar histórico de alteração de papéis.
  Área: membros/auditoria.
  Detalhe: cada aprovação, troca de role e alteração de claims deve gerar evento.
  Critério de aceite: coleção `audit_log` ou `member_role_changes` gravada pelo backend.

- [ ] `P2` Trocar campos manuais de ID por seletores.
  Área: UX/permissões.
  Detalhe: membros ainda pedem ID de ministério/supervisor em algumas telas.
  Critério de aceite: usuário escolhe ministério, célula e supervisor por busca/autocomplete com validação de tenant.

## Entrega 3 - Pagamentos, webhook e conciliação

Objetivo: consolidar receita, inscrição, assinatura, compra e atendimento pago em um contrato único.

- [ ] `P0` Criar `payments` service único.
  Área: pagamentos/backend.
  Detalhe: centralizar criação de preferência/preapproval, metadata, `targetType`, `targetId`, tenant, usuário e retorno.
  Critério de aceite: Eventos, Loja, Escola, Financeiro e Social chamam o mesmo serviço.

- [ ] `P0` Escolher webhook oficial único.
  Área: pagamentos/backend.
  Detalhe: decidir se o handler oficial será Express/BFF, Firebase Function ou ambos com roteamento explícito. Evitar dois caminhos independentes.
  Critério de aceite: documentação e código indicam um handler oficial; o caminho secundário redireciona, é removido ou fica desabilitado.

- [ ] `P0` Criar contrato `payment_intents`.
  Área: dados/pagamentos.
  Detalhe: registrar intenção antes de enviar usuário ao Mercado Pago.
  Critério de aceite: cada checkout tem `payment_intent` com provider, status, valor, target, tenant, user, metadata, timestamps.

- [ ] `P0` Garantir idempotência de webhook.
  Área: pagamentos/segurança.
  Detalhe: webhook pode chegar repetido ou fora de ordem.
  Critério de aceite: `payment_events` possui chave idempotente; replay não duplica transação nem libera acesso indevidamente.

- [ ] `P0` Remover fallback de public key de teste no cliente.
  Área: pagamentos/frontend.
  Detalhe: `CheckoutModal` não deve ter chave pública hardcoded.
  Critério de aceite: public key vem de env; ausência mostra estado configuracional claro.

- [ ] `P1` Implementar checkout para atendimento social pago.
  Área: social/pagamentos.
  Detalhe: agendamento pago hoje pode ficar pendente sem iniciar cobrança.
  Critério de aceite: atendimento social pago cria payment intent, checkout, webhook e liberação/status.

- [ ] `P1` Definir política de contribuição manual.
  Área: financeiro.
  Detalhe: contribuição sem Mercado Pago deve ficar pendente até conciliação, com comprovante opcional.
  Critério de aceite: fluxo manual gera `transaction` pendente, histórico de conciliação e comprovante.

- [ ] `P1` Criar ledger imutável para ajustes financeiros.
  Área: financeiro/auditoria.
  Detalhe: conciliação e correções não devem sobrescrever história sem trilha.
  Critério de aceite: cada ajuste financeiro cria evento imutável com operador, motivo e timestamp.

- [ ] `P1` Testar sandbox Mercado Pago ponta a ponta.
  Área: QA/pagamentos.
  Detalhe: cobrir evento pago, loja, curso avulso, assinatura Escola e contribuição.
  Critério de aceite: roteiro documentado com evidência de retorno, webhook, entidade alvo e transação.

- [ ] `P2` Criar dashboard de pendências de pagamento.
  Área: financeiro/eventos/escola.
  Detalhe: listar pagamentos pendentes por domínio e idade.
  Critério de aceite: painel mostra pendências, aging e ação de conciliação/cancelamento.

## Entrega 4 - QR, modo portaria e presença

Objetivo: tornar o check-in confiável para operação real em culto, evento e recepção.

- [ ] `P0` Criar `checkin_audit_events`.
  Área: eventos/auditoria.
  Detalhe: registrar operador, papel, dispositivo, tenant, evento, ingresso, resultado, horário local, horário servidor e origem online/offline.
  Critério de aceite: todo preview, confirmação, duplicidade, erro e sincronização offline gera evento.

- [ ] `P0` Criar modo Portaria.
  Área: eventos/mobile.
  Detalhe: tela dedicada, simples, full-screen, leitura contínua, feedback visual e estado de pagamento/check-in.
  Critério de aceite: operador consegue ler vários ingressos em sequência sem navegar pela tela completa de eventos.

- [ ] `P0` Criar fallback manual de check-in.
  Área: eventos/operação.
  Detalhe: busca por nome, e-mail, telefone, documento ou código do ingresso.
  Critério de aceite: operador autorizado consegue encontrar inscrição e registrar presença sem câmera.

- [ ] `P1` Melhorar fila offline.
  Área: eventos/offline.
  Detalhe: fila atual guarda basicamente o enrollmentId. Deve guardar operador, tenant, deviceId, evento, timestamp local e status de sincronização.
  Critério de aceite: sincronização mostra itens pendentes, sucesso, erro e conflitos.

- [ ] `P1` Validar evento ativo no check-in.
  Área: eventos/backend.
  Detalhe: impedir check-in em evento cancelado, arquivado, de outro tenant ou fora da janela configurada, salvo override autorizado.
  Critério de aceite: backend aplica janela e status do evento.

- [ ] `P1` Testar QR em Android/iOS.
  Área: QA/mobile.
  Detalhe: validar HTTPS, permissão de câmera, troca de câmera, reload, bloqueio de permissão e PWA.
  Critério de aceite: checklist com dispositivos reais ou emuladores confiáveis.

- [ ] `P2` Adicionar feedback sonoro/háptico opcional.
  Área: UX portaria.
  Detalhe: sucesso, pendente, duplicado e inválido devem ter respostas rápidas.
  Critério de aceite: opção configurável e acessível.

## Entrega 5 - Células, consolidação e autonomia operacional

Objetivo: transformar ações visuais em fluxo rastreável.

- [ ] `P0` Transformar "Consolidar" em tarefa/follow-up real.
  Área: células/pastoral.
  Detalhe: botão atual apenas orienta por alerta.
  Critério de aceite: cria `visitor_followup` ou `task` com responsável, prazo, status, visitante e célula.

- [ ] `P0` Persistir "Eu Quero" da escala da célula.
  Área: células/escalas.
  Detalhe: interesse deve chegar ao líder e virar escala ou tarefa.
  Critério de aceite: cria `scale_interest` ou atualiza escala oficial com status `pending`.

- [ ] `P1` Persistir geração de escala da célula.
  Área: células/escalas.
  Detalhe: escala sorteada localmente precisa virar registro operacional.
  Critério de aceite: geração cria `scales` ou `tasks` com participantes e status.

- [ ] `P1` Corrigir filtro de região em células.
  Área: células/frontend.
  Detalhe: filtro visual não afeta `filteredCells`.
  Critério de aceite: seleção de região altera lista exibida.

- [ ] `P1` Substituir mapa fixo por pins reais.
  Área: células/mobile/mapa.
  Detalhe: iframe fixo de Guarapari não representa células cadastradas.
  Critério de aceite: mapa lista células por localização/coordenação, com fallback sem geocoding.

- [ ] `P1` Medir consolidação por célula.
  Área: dados/indicadores.
  Detalhe: indicadores de visitantes, contato, retorno, vínculo e batismo/membresia.
  Critério de aceite: dados aparecem em dashboard por líder/supervisor.

## Entrega 6 - Ministérios, escalas e briefings

Objetivo: tornar ministérios menos dependentes de escrita direta pelo cliente e mais auditáveis.

- [ ] `P0` Criar endpoints para aceitar/recusar escala.
  Área: ministérios/backend.
  Detalhe: substituir gravação direta do cliente por BFF/tRPC com validação de tenant, papel e conflito.
  Critério de aceite: aceite/recusa de escala passa por backend e gera log.

- [ ] `P1` Validar conflitos de escala.
  Área: ministérios/escalas.
  Detalhe: impedir sobreposição de datas/horários para a mesma pessoa quando aplicável.
  Critério de aceite: backend retorna erro claro em conflito.

- [ ] `P1` Criar presença real por escala.
  Área: ministérios/indicadores.
  Detalhe: dashboard hoje tem métricas hardcoded em alguns pontos.
  Critério de aceite: presença/falta por escala vem de registros reais.

- [ ] `P1` Criar `ministry_service_reports`.
  Área: ministérios/dados.
  Detalhe: relatórios por culto/evento, equipe, faltas, necessidades e observações.
  Critério de aceite: relatório alimenta indicadores por ministério.

- [ ] `P2` Trocar `prompt` de recusa por modal/sheet.
  Área: UX/mobile.
  Detalhe: motivo de recusa deve ser estruturado e auditável.
  Critério de aceite: UI salva motivo, operador e timestamp.

## Entrega 7 - Escola IDE, certificados e Jornada

Objetivo: transformar Escola e Jornada em trilhas oficiais mensuráveis, não apenas experiência visual.

- [ ] `P0` Decidir papel oficial da Jornada.
  Área: produto/arquitetura.
  Detalhe: definir se Jornada é jogo de apoio ou trilha oficial de discipulado.
  Critério de aceite: decisão documentada e refletida no modelo de dados.

- [ ] `P1` Quebrar `SchoolView` em submódulos.
  Área: frontend/manutenção.
  Detalhe: separar dashboard, catálogo, player, admin, trilhas, certificados, checkout.
  Critério de aceite: subcomponentes menores com responsabilidades claras.

- [ ] `P1` Criar coleção `certificates`.
  Área: escola/dados.
  Detalhe: certificado HTML baixável não basta para auditoria.
  Critério de aceite: emissão salva certificado com código verificável, curso, aluno, tenant e data.

- [ ] `P1` Criar `watch_progress`.
  Área: escola/indicadores.
  Detalhe: progresso por aula deve ser mais granular que matrícula.
  Critério de aceite: player salva progresso por lição e alimenta conclusão.

- [ ] `P1` Criar `lesson_questions`.
  Área: escola/suporte.
  Detalhe: campo de pergunta no player precisa virar suporte real.
  Critério de aceite: pergunta vira registro com status, responsável e resposta.

- [ ] `P1` Criar `course_reviews`.
  Área: escola/qualidade.
  Detalhe: avaliação de curso deve ser persistida.
  Critério de aceite: review vinculada a matrícula/curso e aparece no admin.

- [ ] `P1` Migrar ou aposentar `SchoolContext`.
  Área: arquitetura/escola.
  Detalhe: componentes antigos de admin, quiz e suporte usam contexto local.
  Critério de aceite: tudo usa API real ou é removido da navegação.

- [ ] `P1` Criar dados oficiais da Jornada.
  Área: jornada/dados.
  Detalhe: se Jornada for oficial, criar `journey_sessions`, `journey_participants`, `journey_progress`.
  Critério de aceite: progresso não depende só de estado local.

- [ ] `P2` Remover funis hardcoded do admin de Jornada.
  Área: indicadores.
  Detalhe: funil deve vir de matrículas, progresso e certificados.
  Critério de aceite: números calculados a partir de coleções reais.

## Entrega 8 - Pastoral, agenda, social e notificações

Objetivo: fechar atendimento humano com agenda, consentimento e comunicação real.

- [ ] `P0` Evoluir armazenamento de tokens Google.
  Área: pastoral/calendar/segurança.
  Detalhe: tokens hoje foram protegidos por fluxo, mas ainda devem ir para storage mais segregado, com revogação e rotação.
  Critério de aceite: tokens têm owner, tenant, escopo, revogação e não ficam misturados ao cadastro público do pastor.

- [ ] `P1` Criar coleção de disponibilidade e bloqueios pastorais.
  Área: pastoral/agenda.
  Detalhe: agenda precisa ter slots, bloqueios, exceções e duração.
  Critério de aceite: disponibilidade vem de dados próprios, não só string/lista simples.

- [ ] `P1` Criar consentimento pastoral/social.
  Área: pastoral/social/compliance.
  Detalhe: atendimentos sensíveis devem registrar aceite e limites de uso de dados.
  Critério de aceite: agendamento exige consentimento versionado.

- [ ] `P1` Substituir tarefas pastorais por formulário/modal.
  Área: pastoral/UX.
  Detalhe: criação via `window.prompt` é frágil.
  Critério de aceite: modal salva título, descrição, prioridade, responsável e prazo.

- [ ] `P1` Implementar provedor real de WhatsApp/e-mail com fila.
  Área: notificações.
  Detalhe: `/api/notifications/whatsapp` retorna `501`, `src/lib/whatsapp.ts` é simulado e e-mail pastoral apenas loga em alguns casos.
  Critério de aceite: `notification_jobs` e `notification_deliveries` registram envio, erro e retry.

- [ ] `P1` Criar agenda com bloqueio de slots para Social.
  Área: social/agenda.
  Detalhe: evitar dois agendamentos no mesmo horário/profissional.
  Critério de aceite: backend valida disponibilidade antes de criar agendamento.

- [ ] `P2` Remover placeholders visuais no Social.
  Área: UX/conteúdo.
  Detalhe: imagens `via.placeholder.com` devem virar fallback oficial ou upload.
  Critério de aceite: estado sem foto é visual próprio, sem URL externa genérica.

## Entrega 9 - Loja, estoque e unidades

Objetivo: fechar operação física com estoque, pedidos e unidades oficiais.

- [ ] `P1` Criar `inventory_movements`.
  Área: loja/estoque.
  Detalhe: estoque precisa registrar entrada, saída, ajuste, pedido e cancelamento.
  Critério de aceite: cada movimento tem produto, variação, quantidade, motivo, operador e tenant.

- [ ] `P1` Bloquear exclusão de produto com pedido.
  Área: loja/dados.
  Detalhe: produto com histórico deve ser arquivado, não apagado.
  Critério de aceite: backend impede delete e oferece `archived`.

- [ ] `P1` Vincular pedido a entrega/retirada.
  Área: loja/operação.
  Detalhe: pedido pago precisa gerar tarefa ou status operacional.
  Critério de aceite: fluxo contém `paid`, `preparing`, `ready`, `delivered/cancelled`.

- [ ] `P1` Mover CRUD de produtos para BFF/tRPC.
  Área: loja/segurança.
  Detalhe: hoje ainda há CRUD direto pelo cliente.
  Critério de aceite: regras Firestore bloqueiam escrita direta não administrativa; backend valida.

- [ ] `P1` Seedar unidades padrão no banco.
  Área: unidades/dados.
  Detalhe: remover fallback mock de unidades em produção.
  Critério de aceite: `units` tem seed oficial; UI mostra estado vazio honesto se banco vazio.

- [ ] `P2` Criar status de unidade.
  Área: unidades/admin.
  Detalhe: `active`, `hidden`, `archived`.
  Critério de aceite: UI pública só mostra unidades ativas.

## Entrega 10 - Automação, tarefas e indicadores

Objetivo: converter ações recorrentes em dados, filas e painéis por papel.

- [ ] `P0` Implementar `automation_rules`.
  Área: automações.
  Detalhe: `AdminAutomations` hoje mostra regras hardcoded e botões desabilitados.
  Critério de aceite: admin cria regra com gatilho, público, canal, template, status e tenant.

- [ ] `P0` Implementar `notification_jobs`.
  Área: automações/notificações.
  Detalhe: cada disparo deve ir para fila com retries e status.
  Critério de aceite: job criado, processado e registrado com sucesso/erro.

- [ ] `P0` Implementar `notification_deliveries`.
  Área: automações/auditoria.
  Detalhe: cada destinatário precisa de log próprio.
  Critério de aceite: relatório de disparos mostra destinatário, canal, status, erro e horário.

- [ ] `P1` Criar `audit_log` transversal.
  Área: governança/dados.
  Detalhe: ações críticas de papéis, pagamentos, check-in, conciliação, agenda e automações.
  Critério de aceite: helper server-side registra eventos padronizados.

- [ ] `P1` Padronizar `tasks`.
  Área: planejamento.
  Detalhe: toda task deve ter tenant, owner, assignee, source module, priority, due date e audit trail.
  Critério de aceite: contrato e regras exigem campos mínimos; UI exibe responsável e origem.

- [ ] `P1` Criar dashboards por papel.
  Área: indicadores.
  Detalhe: pastor, supervisor, líder de célula, líder de ministério e financeiro precisam de visões próprias.
  Critério de aceite: cada papel vê métricas acionáveis e filtradas por escopo.

- [ ] `P1` Expandir SQL/BI.
  Área: dados/BI.
  Detalhe: incluir pastoral, social, ministérios, automações, Jornada, check-in audit e follow-ups.
  Critério de aceite: sync gera fatos/dimensões novos e valida contagens contra Firestore.

- [ ] `P2` Remover indicadores hardcoded.
  Área: dados/frontend.
  Detalhe: funis, ranking e métricas fixas devem vir de consultas reais ou estado vazio.
  Critério de aceite: busca por dados hardcoded críticos retorna apenas exemplos explicitamente marcados.

## Entrega 11 - UX/UI mobile first

Objetivo: tornar a plataforma confortável e confiável no celular.

- [ ] `P0` Rodar QA mobile dos fluxos críticos.
  Área: QA/UX.
  Detalhe: login, eventos, QR, pagamento, célula, membros, escola, pastoral e social.
  Critério de aceite: checklist em 390px, 430px, tablet e desktop com evidências.

- [ ] `P1` Substituir `alert`, `confirm` e `prompt` por modais/sheets.
  Área: UX/mobile.
  Detalhe: priorizar Células, Pastoral, Ministérios, Financeiro, Loja e Escola.
  Critério de aceite: ações críticas têm estado de loading, erro e sucesso; sem prompt nativo.

- [ ] `P1` Simplificar telas longas por tarefa.
  Área: UX/produto.
  Detalhe: reduzir densidade de `SchoolView`, `EventsView`, `MinistriesView`.
  Critério de aceite: fluxo principal por tela tem uma ação primária clara em mobile.

- [ ] `P1` Ajustar cards muito arredondados/densos.
  Área: UI.
  Detalhe: padronizar radius e espaçamento para telas operacionais.
  Critério de aceite: revisão visual em mobile não apresenta sobreposição/truncamento.

- [ ] `P1` Lazy load de mapas, QR e gráficos.
  Área: performance.
  Detalhe: carregar `html5-qrcode`, mapas e charts só quando aba/tela exigir.
  Critério de aceite: bundle inicial reduzido e funcionalidade carregada sob demanda.

- [ ] `P2` Criar testes Playwright por viewport.
  Área: QA automatizado.
  Detalhe: cobrir navegação, forms e estados vazios.
  Critério de aceite: CI roda smoke visual básico em mobile e desktop.

## Entrega 12 - Conteúdo, estados vazios e mocks restantes

Objetivo: remover aparência de dado oficial quando o dado ainda é exemplo/local.

- [ ] `P0` Inventariar mocks e fallbacks.
  Área: produto/QA.
  Detalhe: buscar `mock`, `placeholder`, `localStorage`, `alert`, números hardcoded e fallbacks de coleção.
  Critério de aceite: planilha/markdown com cada ocorrência, decisão de remover, implementar ou manter como fallback explícito.

- [ ] `P1` Remover fallback mock de unidades em produção.
  Área: unidades.
  Detalhe: `UnitsView` cai para lista mock quando snapshot vem vazio.
  Critério de aceite: produção mostra estado vazio orientativo ou seed real.

- [ ] `P1` Persistir notas do culto opcionalmente.
  Área: Home/experiência.
  Detalhe: notas hoje ficam só no dispositivo.
  Critério de aceite: usuário pode salvar notas no perfil ou manter apenas local conscientemente.

- [ ] `P1` Criar funil de visitantes.
  Área: Home/pastoral/células.
  Detalhe: lead criado, contato feito, primeira visita, célula indicada, consolidado, membro.
  Critério de aceite: status do visitante alimenta indicadores e tarefas.

- [ ] `P2` Padronizar estados vazios honestos.
  Área: UX/conteúdo.
  Detalhe: quando não há dado real, não exibir número demonstrativo como se fosse oficial.
  Critério de aceite: telas críticas têm empty state com próxima ação real.

## Sequência recomendada de execução

1. Entrega 0: release, secrets e CI.
2. Entrega 1: fonte de verdade por domínio.
3. Entrega 2: permissões e rules com testes por perfil.
4. Entrega 3: pagamentos e webhook único.
5. Entrega 4: QR, modo portaria e auditoria.
6. Entregas 5 e 6: células, ministérios e autonomia operacional.
7. Entregas 7 e 8: Escola, Jornada, Pastoral, Social e notificações.
8. Entregas 9 e 10: loja, unidades, automações, indicadores e BI.
9. Entregas 11 e 12: UX mobile, performance, mocks e acabamento.

## Validação final para considerar a auditoria sanada

- [ ] `npm run lint` passa.
- [ ] `npm run lint:rules` passa.
- [ ] `npm run validate:firestore` passa.
- [ ] `npm run build` passa.
- [ ] `npm --prefix functions run build` passa.
- [ ] `npm run next:build` passa.
- [ ] `npm run test:flows` passa.
- [ ] Testes Firestore Rules por papel passam.
- [ ] Smoke de pagamento Mercado Pago sandbox passa para Loja, Eventos, Escola, Financeiro e Social.
- [ ] Smoke de QR em mobile real passa.
- [ ] Smoke de login/onboarding/aprovação de membro passa.
- [ ] QA mobile documentado para 390px, 430px, tablet e desktop.
- [ ] Nenhum segredo aparece em arquivos versionáveis.
- [ ] Nenhuma ação crítica depende apenas de `alert`, `prompt`, `confirm` ou estado local.
- [ ] Cada módulo crítico alimenta dados persistidos e indicadores definidos.

# 📌 Relatório de Revisão e Refatoração - Plataforma Ecossistema Coroado

Este documento detalha o estado atual da plataforma, os pontos discutidos que precisam de ajustes, dívidas técnicas, melhorias de UI/UX (interface e experiência) e um roadmap para evoluções futuras.

---

## 1. 🎨 UI/UX, Layout e Design (Front-end)

### 1.1 Responsividade (Mobile-First)
* **Status Atual:** A aplicação usa o Tailwind CSS, e possui uma bottom-bar para navegação mobile. No entanto, telas muito ricas em dados (Kanban de Planejamento, Tabelas financeiras, Relatórios de Células, Gestão de Cursos na Escola IDE) podem estar quebrando o layout ou exigindo scroll horizontal desconfortável.
* **Ajustes Necessários:**
  * Refatorar tabelas para versão em "Cards" contextuais em telas pequenas (até `md:`).
  * Ajustar o menu lateral/inferior para comportar todas as opções do usuário sem poluição visual.
  * Otimizar área visual do leitor de QR Code (`EventsView`) para se adaptar à tela d0 celular, sem gerar overflow.

### 1.2 Identidade Visual (Tipografia e Logo)
* **Fontes:** Atualmente a plataforma usa as fontes padrão de sistema/Inter. Precisamos definir e padronizar as tipografias corporativas (ex: uma fonte serifada elegante para cabeçalhos e uma sans-serif clean para as tabelas/dashboard).
* **Logo:** Estamos usando texto ("COROADO"). Precisamos substituir pelo Logotipo Oficial da igreja em formato SVG ou PNG de alta qualidade no `Layout.tsx` e tela de Login.
* **Cores:** As cores estão usando um tom principal (primary) que pode ser amarelo/dourado para combinar com "Coroado", num tema predominantemente escuro (Dark Mode). Precisa haver checagem de contraste em botões e inputs.

---

## 2. ⚙️ Regras Lógicas e Permissões (RBAC)

* **Status Atual:** O front-end agora reflete as regras blindadas do Firestore. A hierarquia, as abas e os fluxos de aprovação operam conforme os *roles* do usuário ativo.
* **Concluído:**
  * **Ocultar/Exibir menus:** Membros comuns não enxergam o admin. Líderes de célula que acessam o 'Gestão' não podem visualizar o Dashboard Financeiro nem o acesso ao *Seeder*.
  * **Hierarquia Pastoral:** A tela de membros efetua cortes automáticos: Líderes visualizam apenas os membros debaixo de sua liderança (ou mesma célula). Pastores e admins têm acesso a todos filiados sob a mesma *tenantId*.
  * **Aprovação de Cadastros:** Nova feature de filtro de "Pendentes" e aprovação em "1-clique" adicionada diretamente à interface de gestão de Membros.

---

## 3. 📝 Formulários e Validações

* **Status Atual:** A maioria das inserções (Criação de ministérios, células, cursos) é feita por formulários simples ou via script de Seeder.
* **Ajustes Necessários / Evolução:**
  * **Novos Campos Necessários:** Data de Nascimento nos Membros (para automação de aniversariante), Estado Civil, Profissão, Redes Sociais. Nos Cursos da Escola: módulos de aulas em vídeo, anexo de PDF.
  * **Validação Robusta:** Implementar bibliotecas como `react-hook-form` + `zod` para preenchimento de inputs de forma mais restrita (ex: Validação de CPF, formatador automática de Telefone, CEP que busca endereço automaticamente).
  * **Upload de Imagens:** Permitir trocar avatar, subir capa do evento, e logotipo do ministério direto para um Google Cloud Storage / Firebase Storage.

---

## 4. 🔗 Integrações Externas (O que Falta Conectar)

Esses são pontos vitais para tornar a plataforma autossuficiente:
1. **Gateway de Pagamento (Loja e Eventos):** Integração via MercadoPago, Stripe, PagSeguro ou Pagar.me para processar checkouts (atualmente na Loja Coroado finaliza de forma fictícia). Pix copia-e-cola e geração de cobrança dinâmica para o Financeiro da Igreja.
2. **WhatsApp API / Notificações Push:** Quando um voluntário for inscrito em uma escala, ou um visitante preencher a ficha de Vida (Jornada), ele e o líder devem receber um "Olá" automático no WhatsApp.
3. **Plataforma de Vídeo (Escola IDE):** Suporte nativo e otimizado para Youtube/Vimeo nos cursos, controlando progresso.

---

## 5. 🏗️ Módulos e Funcionalidades (Oportunidades)

Aqui listamos revisões de funcionalidades abordadas que precisam de profundidade:

* **Gestão do Voluntariado (Escalas):** Uma dor comum em igrejas. Precisamos garantir no *MinistriesView* que um líder possa selecionar o dia (culto), apontar membros para posições (ex: guitarra, recepção, câmera) e eles deem "Aceite/Recusa".
* **Escola IDE (LMS):** Atualmente tem controle de turmas. Precisamos de 'Provas/Questionários' simples em cada módulo para liberar o próximo módulo do membro.
* **Check-in Kids / QR Code Segregado:** O checkin atual funciona bem para eventos normais, mas Ministério Infantil precisa de lógica de Pai (QR do responsável vinculado ao QR da Criança) e etiquetas para impressão.
* **Culto Ao Vivo (Social / Home):** Adicionar um player fixo no Home quando a congregação estiver ao vivo, além de abas para Notas de Pregação em tempo real.

---

## 🗓️ Plano de Ação Imediato (Próximos Passos Sugeridos)

Se você aprovar, podemos atacar isso em ciclos (Sprints):

1. **Sprint 1: UI e UX Geral** (Hoje/Amanhã) - **Concluído**
   - [x] Padronizar Fonte e Inserir a Logo da Igreja no Login.
   - [x] Revisar visualização mobile das tabelas (KanBan está OK, Tables da Escola adaptadas para Cards).
   - [x] Arrumar cores de botões e hover states globais.

2. **Sprint 2: Entidades e Formulários Reforçados** - **Concluído**
   - [x] Melhorar tela de `MembersView` permitindo de foto (Avatar base64 preview), e campos de perfil (profissão/estado civil/data niver/redes sociais/telefone).
   - [x] Regras de Segurança de update do Firestore para Membros liberam os novos parâmetros em conformidade.
   - [x] Tela de Aprovação de Novos Membros.

3. **Sprint 3: Fechamento Logística de Cédulas e Eventos** - **Concluído**
   - [x] Garantir check-in offline com sync posterior e estabilizar scanner (FPS e facingMode default).
   - [x] Gestão fina das Escalas de Voluntários (Kanban/lista de aceites e UI de "Minhas Escalas" na Home).

4. **Sprint 4: Integração de Pagamento** - **Concluído**
   - [x] Ligar a aba "Store" a um Checkout via Backend (Ex: SDK Mercado Pago) usando Server Express.

5. **Sprint 5: Módulos e Oportunidades Em Andamento**
   - [x] Culto Ao Vivo (Social / Home): Player de fundo e interface de notas da pregação para membros.
   - [x] Check-in Kids / QR Code Segregado: Adicionado dependentes/Crianças no registro de eventos e funcionalidade de impressão de etiqueta no check-in do Admin.
   - [x] WhatsApp API / Notificações Push automáticas: Criado módulo base `src/lib/whatsapp.ts` e configuração aguardando API Keys.

---

> **Por favor, avalie este relatório.**
> Me indique por onde quer que eu comece, se posso já executar a Sprint 1 de melhorias de interface (Logo, fonte, e responsividade) ou se deseja inserir mais algum módulo ausente nesta lista.

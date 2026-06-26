import * as React from "react";
import { ArrowLeft, FileText, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LegalPolicySlug = "privacidade" | "servico" | "devolucao" | "frete";

type PolicySection = {
  title: string;
  body: string;
};

type PolicyContent = {
  title: string;
  description: string;
  icon: LucideIcon;
  sections: PolicySection[];
};

const policyContent: Record<LegalPolicySlug, PolicyContent> = {
  privacidade: {
    title: "Politica de Privacidade",
    description:
      "Esta Politica de Privacidade descreve, de forma simples e transparente, como a Igreja Coroado pode coletar, utilizar, armazenar e proteger dados pessoais fornecidos por membros, visitantes, voluntarios e usuarios da plataforma.",
    icon: ShieldCheck,
    sections: [
      {
        title: "1. Dados que podemos coletar",
        body:
          "Podemos coletar dados fornecidos voluntariamente por membros, visitantes, voluntarios e usuarios da plataforma, como nome, telefone, e-mail, informacoes de cadastro, participacao em celulas, ministerios, eventos, cursos e demais interacoes com a Igreja Coroado.",
      },
      {
        title: "2. Como usamos os dados",
        body:
          "Utilizamos os dados para gestao ministerial, comunicacao institucional, acompanhamento pastoral, organizacao de celulas, eventos, cursos, voluntariado, atendimento aos membros e melhoria da experiencia na plataforma.",
      },
      {
        title: "3. Compartilhamento de informacoes",
        body:
          "Nao vendemos dados pessoais. As informacoes podem ser compartilhadas apenas quando necessario para operacao da plataforma, cumprimento de obrigacoes legais, seguranca, suporte tecnico ou atividades diretamente relacionadas a Igreja Coroado.",
      },
      {
        title: "4. Seguranca e armazenamento",
        body:
          "Adotamos medidas tecnicas e administrativas para proteger dados pessoais contra acesso nao autorizado, perda, alteracao, divulgacao indevida ou uso inadequado.",
      },
      {
        title: "5. Direitos do titular",
        body:
          "O titular pode solicitar acesso, correcao, atualizacao ou exclusao dos seus dados pessoais, conforme a legislacao aplicavel e os limites tecnicos, legais e pastorais da operacao.",
      },
      {
        title: "6. Contato",
        body:
          "Para duvidas ou solicitacoes relacionadas a privacidade e protecao de dados, entre em contato com a Igreja Coroado pelos canais oficiais de atendimento.",
      },
    ],
  },
  servico: {
    title: "Termos de Servico",
    description:
      "Estes termos organizam as condicoes basicas de uso da plataforma digital da Igreja Coroado, incluindo acesso, cadastro, eventos, escola, loja, contribuicoes e comunicacoes institucionais.",
    icon: FileText,
    sections: [
      {
        title: "1. Uso da plataforma",
        body:
          "A plataforma foi criada para apoiar a vida comunitaria da Igreja Coroado. O acesso deve respeitar a finalidade ministerial, as orientacoes da lideranca, a seguranca dos dados e o bom uso dos recursos digitais.",
      },
      {
        title: "2. Cadastro e responsabilidades",
        body:
          "O usuario e responsavel por fornecer informacoes corretas, manter seus dados atualizados e proteger o acesso a sua conta. Perfis podem depender de aprovacao ou revisao da lideranca conforme o tipo de acesso solicitado.",
      },
      {
        title: "3. Conteudos, eventos e cursos",
        body:
          "Informacoes sobre eventos, cursos, materiais, inscricoes e atividades podem ser atualizadas para refletir disponibilidade, agenda, criterios pastorais, ajustes operacionais ou necessidades da igreja.",
      },
      {
        title: "4. Pagamentos e contribuicoes",
        body:
          "Compras, inscricoes pagas e contribuicoes devem seguir as informacoes exibidas no momento da confirmacao. Falhas, duplicidades ou inconsistencias de pagamento podem ser analisadas pelos canais oficiais de atendimento.",
      },
      {
        title: "5. Condutas de seguranca",
        body:
          "Nao e permitido usar a plataforma para tentar acessar dados de terceiros, burlar permissoes, publicar conteudo ofensivo, automatizar acoes indevidas ou comprometer a disponibilidade dos servicos.",
      },
      {
        title: "6. Atualizacoes dos termos",
        body:
          "A Igreja Coroado pode atualizar estes termos para refletir melhorias da plataforma, mudancas operacionais ou exigencias legais. A versao publicada nesta pagina e a referencia vigente.",
      },
    ],
  },
  devolucao: {
    title: "Politica de Devolucao",
    description:
      "Esta politica orienta pedidos de cancelamento, estorno, troca ou devolucao relacionados a loja, eventos, cursos e demais operacoes realizadas pela plataforma.",
    icon: RotateCcw,
    sections: [
      {
        title: "1. Analise por tipo de operacao",
        body:
          "Pedidos relacionados a produtos fisicos, eventos, cursos, materiais digitais, inscricoes e contribuicoes podem ter tratativas diferentes conforme a natureza da operacao, o status do pedido e a legislacao aplicavel.",
      },
      {
        title: "2. Produtos fisicos",
        body:
          "Solicitacoes de troca ou devolucao de produtos fisicos devem informar numero do pedido, dados de contato, motivo da solicitacao e condicao do item recebido para que a equipe possa orientar os proximos passos.",
      },
      {
        title: "3. Eventos e cursos",
        body:
          "Cancelamentos de inscricoes em eventos ou cursos dependem da etapa da inscricao, disponibilidade, custos ja assumidos e regras especificas comunicadas na pagina da atividade.",
      },
      {
        title: "4. Contribuicoes e ofertas",
        body:
          "Contribuicoes, ofertas e doacoes sao tratadas com cuidado pastoral e administrativo. Em caso de erro, duplicidade ou inconsistencia, o titular deve entrar em contato pelos canais oficiais para analise.",
      },
      {
        title: "5. Prazos de resposta",
        body:
          "A equipe buscara responder as solicitacoes em prazo razoavel, considerando a necessidade de confirmar dados do pedido, status do pagamento, entrega, disponibilidade de estoque ou registro financeiro.",
      },
      {
        title: "6. Canais oficiais",
        body:
          "Pedidos de devolucao, troca, cancelamento ou estorno devem ser enviados aos canais oficiais de atendimento da Igreja Coroado, com as informacoes necessarias para identificacao da transacao.",
      },
    ],
  },
  frete: {
    title: "Politica de Frete e Envio",
    description:
      "Esta politica explica como a Igreja Coroado pode organizar retiradas, entregas e comunicacoes de envio relacionadas a produtos fisicos adquiridos pela plataforma.",
    icon: Truck,
    sections: [
      {
        title: "1. Modalidades de entrega",
        body:
          "A entrega ou retirada de produtos pode variar conforme disponibilidade, localidade, agenda da igreja, evento relacionado, parceiro logistico ou combinados informados durante o pedido.",
      },
      {
        title: "2. Informacoes de envio",
        body:
          "O usuario deve conferir nome, contato, endereco e demais dados de entrega antes de confirmar o pedido. Informacoes incompletas ou incorretas podem gerar atraso ou necessidade de novo contato.",
      },
      {
        title: "3. Prazos",
        body:
          "Prazos de envio ou retirada sao estimativas operacionais e podem variar por disponibilidade de estoque, confirmacao de pagamento, agenda interna, distancia, eventos locais ou fatores externos.",
      },
      {
        title: "4. Custos de frete",
        body:
          "Quando houver cobranca de frete, o valor sera informado antes da confirmacao do pedido ou combinado pelos canais oficiais de atendimento.",
      },
      {
        title: "5. Acompanhamento",
        body:
          "Atualizacoes sobre separacao, retirada, entrega ou eventual problema logistico podem ser enviadas pelos canais de contato cadastrados ou pelos canais oficiais da Igreja Coroado.",
      },
      {
        title: "6. Problemas na entrega",
        body:
          "Em caso de atraso relevante, item divergente, dano aparente ou dificuldade de retirada, o usuario deve acionar o atendimento para que a equipe possa verificar o pedido e orientar a solucao.",
      },
    ],
  },
};

const relatedPolicies: Array<{ slug: LegalPolicySlug; label: string }> = [
  { slug: "privacidade", label: "Privacidade" },
  { slug: "servico", label: "Termos" },
  { slug: "devolucao", label: "Devolucao" },
  { slug: "frete", label: "Frete" },
];

export function LegalPolicyPage({ policy }: { policy: LegalPolicySlug }) {
  const content = policyContent[policy] || policyContent.privacidade;
  const Icon = content.icon;

  React.useEffect(() => {
    document.title = `${content.title} | Igreja Coroado`;
  }, [content.title]);

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12 sm:px-8 lg:px-10">
        <a
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-amber-300 transition hover:border-amber-300/40 hover:bg-amber-300/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o inicio
        </a>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-300">
                Igreja Coroado
              </p>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {content.title}
              </h1>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
              <Icon className="h-7 w-7" />
            </div>
          </div>

          <p className="mt-4 text-sm text-white/55">
            Ultima atualizacao: 26 de junho de 2026.
          </p>

          <p className="mt-8 text-base leading-8 text-white/75">
            {content.description}
          </p>

          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Politicas da plataforma">
            {relatedPolicies.map((item) => (
              <a
                key={item.slug}
                href={`/politicas/${item.slug}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  item.slug === policy
                    ? "border-amber-300/50 bg-amber-300 text-black"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:border-amber-300/40 hover:text-amber-200"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-10 space-y-8">
            {content.sections.map((section) => (
              <section key={section.title} className="border-t border-white/10 pt-6">
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <p className="mt-3 text-base leading-8 text-white/70">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm leading-7 text-amber-50/90">
            Esta pagina e publica e nao exige login, cadastro ou aprovacao de perfil
            para ser acessada.
          </div>
        </div>
      </section>
    </main>
  );
}

export function PrivacyPolicyPage() {
  return <LegalPolicyPage policy="privacidade" />;
}

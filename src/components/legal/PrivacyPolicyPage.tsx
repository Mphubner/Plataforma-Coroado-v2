import * as React from "react";

const sections = [
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
];

export function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12 sm:px-8 lg:px-10">
        <a
          href="/"
          className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-amber-300 transition hover:border-amber-300/40 hover:bg-amber-300/10"
        >
          Voltar para o inicio
        </a>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-300">
            Igreja Coroado
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Politica de Privacidade
          </h1>

          <p className="mt-4 text-sm text-white/55">
            Ultima atualizacao: 25 de junho de 2026.
          </p>

          <p className="mt-8 text-base leading-8 text-white/75">
            Esta Politica de Privacidade descreve, de forma simples e transparente,
            como a Igreja Coroado pode coletar, utilizar, armazenar e proteger
            dados pessoais fornecidos por membros, visitantes, voluntarios e usuarios
            da plataforma.
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
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

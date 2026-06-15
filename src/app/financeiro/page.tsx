import { FinanceiroNativeClient } from './FinanceiroNativeClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="flex flex-col gap-3 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Coroado Financeiro</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Contribuições e campanhas</h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/60">
            Receita, pendências, recorrência e campanhas em uma visão operacional.
          </p>
        </section>

        <FinanceiroNativeClient />
      </div>
    </main>
  );
}

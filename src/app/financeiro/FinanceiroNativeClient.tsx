'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, RefreshCw, Target, Users } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';

type FinanceOverview = {
  generatedAt: string;
  totals: {
    totalRevenue: number;
    pendingRevenue: number;
    recurringRevenue: number;
    activeSubscribers: number;
    transactionCount: number;
    pendingCount: number;
    campaignCount: number;
    planCount: number;
    campaignTarget: number;
    campaignRaised: number;
  };
  latestTransactions: Array<{
    id: string;
    userName: string;
    type: string;
    status: string;
    method: string;
    amount: number;
    date: string;
  }>;
};

type LoadState = 'loading' | 'signedOut' | 'ready' | 'error';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(`${value}T12:00:00`));
}

export function FinanceiroNativeClient() {
  const [state, setState] = React.useState<LoadState>('loading');
  const [overview, setOverview] = React.useState<FinanceOverview | null>(null);
  const [error, setError] = React.useState('');

  const loadOverview = React.useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setState('signedOut');
      setOverview(null);
      return;
    }

    setState('loading');
    setError('');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/finance/overview', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel carregar os dados.');
      }

      setOverview(payload.overview);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os dados.');
      setState('error');
    }
  }, []);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      void loadOverview();
    });

    return () => unsub();
  }, [loadOverview]);

  if (state === 'loading') {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map(item => (
          <div key={item} className="h-32 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (state === 'signedOut') {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Financeiro</p>
            <h1 className="mt-2 text-3xl font-black">Acesse sua conta</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">Entre para consultar contribuições, campanhas e histórico financeiro.</p>
          </div>
          <Button className="bg-primary text-black hover:bg-primary/90" onClick={() => { window.location.href = '/login'; }}>
            Entrar
          </Button>
        </div>
      </section>
    );
  }

  if (state === 'error' || !overview) {
    return (
      <section className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-red-300" />
            <div>
              <h1 className="text-xl font-black">Resumo indisponível</h1>
              <p className="mt-1 text-sm text-red-100/70">{error}</p>
            </div>
          </div>
          <Button variant="outline" className="border-white/10 text-white hover:bg-white/5" onClick={() => void loadOverview()}>
            Tentar novamente
          </Button>
        </div>
      </section>
    );
  }

  const progress = overview.totals.campaignTarget > 0
    ? Math.min((overview.totals.campaignRaised / overview.totals.campaignTarget) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={CheckCircle2} label="Receita conciliada" value={formatCurrency(overview.totals.totalRevenue)} tone="text-emerald-300" />
        <MetricCard icon={Clock3} label="Pendente" value={formatCurrency(overview.totals.pendingRevenue)} tone="text-amber-300" />
        <MetricCard icon={CreditCard} label="Recorrente" value={formatCurrency(overview.totals.recurringRevenue)} tone="text-primary" />
        <MetricCard icon={Users} label="Assinantes" value={String(overview.totals.activeSubscribers)} tone="text-sky-300" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Últimas transações</p>
              <h2 className="mt-1 text-2xl font-black">Movimento financeiro</h2>
            </div>
            <Button size="icon" variant="ghost" className="rounded-full text-white/60 hover:bg-white/10 hover:text-white" onClick={() => void loadOverview()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="divide-y divide-white/10">
            {overview.latestTransactions.length === 0 ? (
              <p className="py-8 text-sm text-white/50">Nenhuma transação registrada.</p>
            ) : (
              overview.latestTransactions.map(tx => (
                <div key={tx.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-bold text-white">{tx.userName}</p>
                    <p className="mt-1 text-xs uppercase tracking-widest text-white/40">{tx.type} · {tx.method} · {formatDate(tx.date)}</p>
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                      {tx.status}
                    </span>
                    <span className="min-w-28 text-right font-black">{formatCurrency(tx.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Campanhas</p>
              <h2 className="text-2xl font-black">{overview.totals.campaignCount} ativas</h2>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Arrecadado</span>
              <span className="font-bold">{formatCurrency(overview.totals.campaignRaised)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs uppercase tracking-widest text-white/40">
              <span>{Math.round(progress)}%</span>
              <span>Meta {formatCurrency(overview.totals.campaignTarget)}</span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-black/30 p-4">
              <p className="text-xs uppercase tracking-widest text-white/40">Planos</p>
              <p className="mt-2 text-2xl font-black">{overview.totals.planCount}</p>
            </div>
            <div className="rounded-md bg-black/30 p-4">
              <p className="text-xs uppercase tracking-widest text-white/40">Pendências</p>
              <p className="mt-2 text-2xl font-black">{overview.totals.pendingCount}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-white/5">
        <Icon className={`h-5 w-5 ${tone}`} />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

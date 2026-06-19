'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Calendar, CheckCircle2, Clock3, MapPin, RefreshCw, Ticket, Users } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, functions } from '../../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Button } from '../../../components/ui/button';
import { listItemMotion, pageMotion, panelMotion } from '../../lib/motion/presets';
import { CheckoutModal } from '@/src/components/CheckoutModal';

type EventOverviewItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: string;
  status: string;
  capacity: number;
  enrolled: number;
  availableSeats: number | null;
  isPaid: boolean;
  price: number;
  ticketTypes?: { id: string; name: string; price: number; capacity: number }[];
  allowChildren?: boolean;
  childTicketPrice?: number;
  servantsSlug?: string;
  servantsPrice?: number;
  requiresRegistration: boolean;
  description: string;
  image: string;
  pendingPayments: number;
  checkins: number;
};

type TicketOverviewItem = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  paymentStatus: string;
  checkedIn: boolean;
};

type EventsOverview = {
  generatedAt: string;
  scope: 'public' | 'member' | 'manager';
  totals: {
    totalEvents: number;
    upcomingEvents: number;
    paidEvents: number;
    openSeats: number;
    totalEnrollments: number;
    totalAttendees: number;
    approvedEnrollments: number;
    pendingPayments: number;
    checkins: number;
    checkinRate: number;
  };
  nextEvents: EventOverviewItem[];
  myTickets: TicketOverviewItem[];
  paymentPendingEvents: Array<{
    id: string;
    title: string;
    date: string;
    pendingPayments: number;
  }>;
};

type LoadState = 'loading' | 'ready' | 'error';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function paymentLabel(status: string) {
  if (['approved', 'paid', 'completed', 'authorized'].includes(status)) return 'confirmado';
  if (status === 'pending') return 'pendente';
  return status || 'sem status';
}

export function EventosNativeClient() {
  const [state, setState] = React.useState<LoadState>('loading');
  const [overview, setOverview] = React.useState<EventsOverview | null>(null);
  const [error, setError] = React.useState('');
  const [actionEventId, setActionEventId] = React.useState('');
  const [checkoutEvent, setCheckoutEvent] = React.useState<EventOverviewItem | null>(null);
  const [userToken, setUserToken] = React.useState('');

  const loadOverview = React.useCallback(async () => {
    setState('loading');
    setError('');

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/events/overview', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Nao foi possivel carregar os eventos.');
      }

      setOverview(payload.overview);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os eventos.');
      setState('error');
    }
  }, []);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
         const t = await user.getIdToken();
         setUserToken(t);
      } else {
         setUserToken('');
      }
      void loadOverview();
    });

    return () => unsub();
  }, [loadOverview]);

  async function handleEnroll(event: EventOverviewItem) {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = '/login?redirect=/eventos';
      return;
    }

    if (event.isPaid) {
      setCheckoutEvent(event);
      return;
    }

    setActionEventId(event.id);
    setError('');

    try {
      const enrollFunction = httpsCallable(functions, 'createEventEnrollment');
      const response = await enrollFunction({
        eventId: event.id,
        kids: []
      });
      const payload: any = response.data;

      if (!payload.success) {
        throw new Error(payload.error || 'Nao foi possivel fazer a inscricao.');
      }

      if (payload.initPoint) {
        window.location.href = payload.initPoint;
        return;
      }

      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel fazer a inscricao.');
      setState('error');
    } finally {
      setActionEventId('');
    }
  }

  if (state === 'loading') {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map(item => (
          <div key={item} className="h-32 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (state === 'error' || !overview) {
    return (
      <section className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-red-300" />
            <div>
              <h1 className="text-xl font-black">Eventos indisponiveis</h1>
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

  const isManager = overview.scope === 'manager';
  const isMember = overview.scope === 'member';

  return (
    <motion.div {...pageMotion} className="space-y-6">
      <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">
            {isManager ? 'Gestao de eventos' : isMember ? 'Meus eventos' : 'Agenda publica'}
          </p>
          <p className="mt-1 text-sm text-white/60">
            Atualizado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(overview.generatedAt))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!auth.currentUser && (
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5" onClick={() => { window.location.href = '/login'; }}>
              Entrar
            </Button>
          )}
          <Button size="icon" variant="ghost" className="rounded-full text-white/60 hover:bg-white/10 hover:text-white" onClick={() => void loadOverview()} aria-label="Atualizar eventos">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Calendar} label="Proximos" value={String(overview.totals.upcomingEvents)} tone="text-primary" />
        <MetricCard icon={Users} label="Vagas abertas" value={String(overview.totals.openSeats)} tone="text-sky-300" />
        <MetricCard icon={Ticket} label={isManager ? 'Inscricoes' : 'Meus ingressos'} value={String(overview.totals.totalEnrollments)} tone="text-emerald-300" />
        <MetricCard icon={Clock3} label={isManager ? 'Pendencias' : 'Eventos pagos'} value={String(isManager ? overview.totals.pendingPayments : overview.totals.paidEvents)} tone="text-amber-300" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.div {...panelMotion} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Agenda</p>
            <h2 className="mt-1 text-2xl font-black">Proximos eventos</h2>
          </div>

          <div className="space-y-3">
            {overview.nextEvents.length === 0 ? (
              <p className="py-8 text-sm text-white/50">Nenhum evento aprovado nos proximos dias.</p>
            ) : (
              overview.nextEvents.map((event, index) => (
                <motion.article key={event.id} {...listItemMotion(index)} className="rounded-md border border-white/10 bg-black/30 p-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">{event.type}</span>
                        {event.isPaid && (
                          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
                            {formatCurrency(event.price)}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-xl font-black text-white">{event.title}</h3>
                      {event.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">{event.description}</p>}
                      <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-white/45">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(event.date)}</span>
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{event.time}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>
                      </div>
                    </div>

                    <div className="flex min-w-44 flex-col gap-3 md:items-end">
                      <div className="text-left md:text-right">
                        <p className="text-xs uppercase tracking-widest text-white/40">Inscritos</p>
                        <p className="mt-1 text-2xl font-black">{event.enrolled}{event.capacity > 0 ? `/${event.capacity}` : ''}</p>
                      </div>
                      {event.requiresRegistration && (
                        <Button
                          className="w-full bg-primary text-black hover:bg-primary/90 md:w-auto"
                          disabled={actionEventId === event.id}
                          onClick={() => void handleEnroll(event)}
                        >
                          {actionEventId === event.id ? 'Enviando' : event.isPaid ? 'Garantir Inscrição' : 'Inscrever'}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))
            )}
          </div>
        </motion.div>

        <motion.aside {...panelMotion} className="space-y-4">
          {isManager ? (
            <>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40">Check-in</p>
                    <h2 className="text-2xl font-black">{overview.totals.checkinRate}%</h2>
                  </div>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(overview.totals.checkinRate, 100)}%` }} />
                </div>
                <p className="mt-3 text-sm text-white/55">{overview.totals.checkins} check-ins confirmados.</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">Pagamentos pendentes</p>
                <div className="mt-4 space-y-3">
                  {overview.paymentPendingEvents.length === 0 ? (
                    <p className="text-sm text-white/50">Nenhum evento com pagamento pendente.</p>
                  ) : (
                    overview.paymentPendingEvents.map(event => (
                      <div key={event.id} className="flex items-center justify-between gap-3 rounded-md bg-black/30 p-3">
                        <div>
                          <p className="font-bold">{event.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-widest text-white/40">{formatDate(event.date)}</p>
                        </div>
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">{event.pendingPayments}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Ingressos</p>
              <h2 className="mt-1 text-2xl font-black">{isMember ? 'Meus registros' : 'Acesso do membro'}</h2>
              <div className="mt-4 space-y-3">
                {isMember && overview.myTickets.length > 0 ? (
                  overview.myTickets.map(ticket => (
                    <div key={ticket.id} className="rounded-md bg-black/30 p-3">
                      <p className="font-bold">{ticket.eventTitle}</p>
                      <p className="mt-1 text-xs uppercase tracking-widest text-white/40">{formatDate(ticket.eventDate)} - {paymentLabel(ticket.paymentStatus)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-white/55">Entre para ver seus ingressos e acompanhar inscricoes.</p>
                )}
              </div>
            </div>
          )}
        </motion.aside>
      </section>
      
      <CheckoutModal
        isOpen={!!checkoutEvent}
        event={checkoutEvent}
        onClose={() => setCheckoutEvent(null)}
        onSuccess={() => {
          setCheckoutEvent(null);
          void loadOverview();
        }}
        isLoggedIn={Boolean(userToken)}
        onLoginClick={() => {
          window.location.href = '/login?redirect=/eventos';
        }}
      />
    </motion.div>
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

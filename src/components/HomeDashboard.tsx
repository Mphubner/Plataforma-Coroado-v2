import React from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Target, ShieldCheck, Heart, Crosshair, ArrowRight, BookOpen, Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageMotion } from '@/src/lib/motion/presets';

function PersonalDashboard({ events, myScales }: { events: any[], myScales: any[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Próxima Célula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">Quinta, 20h</div>
            <p className="text-xs text-primary mt-1">Célula Nova Vida</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Escola IDE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">2 Cursos</div>
            <p className="text-xs text-red-400 mt-1">Há 5 dias sem acesso</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Devocional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">Disponível</div>
            <Button variant="link" className="text-primary p-0 h-auto text-xs mt-1">Ler agora <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Trilha Crescimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">Consolidação</div>
            <p className="text-xs text-white/50 mt-1">Você está no passo 2</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-[2rem] border border-white/5">
          <h3 className="font-serif italic text-2xl font-black mb-4">Próximos Eventos</h3>
          <div className="space-y-4">
            {events.slice(0, 3).map((ev: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-black/40">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">{ev.title}</h4>
                  <p className="text-sm text-white/50">{ev.date} - {ev.loc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {myScales.length > 0 && (
          <div className="glass-card p-6 rounded-[2rem] border border-white/5">
            <h3 className="font-serif italic text-2xl font-black mb-4">Minhas Escalas</h3>
            <div className="space-y-4">
              {myScales.map((scale: any) => (
                <div key={scale.id} className="flex flex-col gap-2 p-4 rounded-xl bg-black/40 border border-primary/20">
                  <h4 className="font-bold">{scale.eventName}</h4>
                  <p className="text-sm text-primary">{scale.date} às {scale.time}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CellLeaderDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Saúde da Célula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-400">85%</div>
            <p className="text-xs text-white/50 mt-1">+5% nesta semana</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Membros & Visitantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">12 <span className="text-lg text-primary">+3</span></div>
            <p className="text-xs text-white/50 mt-1">Visitantes retidos: 2</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Engajamento IDE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">40%</div>
            <p className="text-xs text-white/50 mt-1">Dos membros estão estudando</p>
          </CardContent>
        </Card>
      </div>

      <div className="glass-card p-6 rounded-[2rem] border border-white/5">
        <h3 className="font-serif italic text-2xl font-black mb-4">Métricas Pessoais do Líder</h3>
        <p className="text-white/60">Seu engajamento nos treinamentos de liderança e discipulado.</p>
        <div className="mt-4 flex gap-4">
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30">Discipulado em dia</Badge>
          <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">IDE Concluído</Badge>
        </div>
      </div>
    </div>
  )
}

function SupervisorDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Células Supervisionadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">4</div>
            <p className="text-xs text-white/50 mt-1">Total de membros agregados: 48</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Saúde Média da Rede</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-yellow-400">72%</div>
            <p className="text-xs text-white/50 mt-1">Atenção em 1 célula</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Encontros com Líderes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">3/4</div>
            <p className="text-xs text-red-400 mt-1">1 Líder pendente de discipulado</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MinistryLeaderDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Servos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">25</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Escalas Preenchidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-400">100%</div>
            <p className="text-xs text-white/50 mt-1">Para o próximo domingo</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MacroDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-primary/50 shadow-lg shadow-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary uppercase tracking-wider font-bold">Total de Membros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">1.204</div>
            <p className="text-xs text-green-400 mt-1">+12 esse mês</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Total de Células</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">84</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Supervisões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">12</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Atendimentos Pastorais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">5</div>
            <p className="text-xs text-white/50 mt-1">Pendentes na agenda</p>
          </CardContent>
        </Card>
      </div>

      <div className="glass-card p-6 rounded-[2rem] border border-white/5">
        <h3 className="font-serif italic text-2xl font-black mb-4 flex items-center gap-2">
          <ShieldCheck className="text-primary" /> Árvore de Supervisão (Macro)
        </h3>
        <p className="text-white/50">Navegue pelas redes, supervisões e células em formato de árvore. (Em desenvolvimento)</p>
        <div className="mt-4 p-8 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/30 font-medium">
          Integração com a base de hierarquia em breve...
        </div>
      </div>
    </div>
  )
}

export function HomeDashboard({ userData, events, myScales }: { userData: any, events: any[], myScales: any[] }) {
  const roles = userData?.roles || [];
  const isAdmin = roles.includes('admin');
  const isSeniorPastor = roles.includes('seniorPastor') || isAdmin;
  const isNetworkPastor = roles.includes('networkPastor');
  const isMinistryLeader = roles.includes('ministryLeader') || isAdmin;
  const isSupervisor = roles.includes('supervisor') || roles.includes('networkPastor') || isAdmin;
  const isCellLeader = roles.includes('cellLeader') || isSupervisor || isAdmin;

  let defaultTab = "personal";
  if (isSeniorPastor || isNetworkPastor) defaultTab = "macro";
  else if (isSupervisor) defaultTab = "supervisor";
  else if (isCellLeader) defaultTab = "leader";

  return (
    <motion.div {...pageMotion} className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 shadow-lg shadow-primary/20">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight font-serif italic text-white">
            Olá, {userData?.name?.split(' ')[0] || 'Irmão'}!
          </h1>
          <p className="text-white/60 text-lg font-medium">Bem-vindo ao seu painel pessoal.</p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-zinc-900 border border-white/10 p-1.5 rounded-full overflow-x-auto whitespace-nowrap flex w-fit gap-1">
          <TabsTrigger value="personal" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/70 font-bold transition-all">
            Visão Pessoal
          </TabsTrigger>
          {isCellLeader && (
            <TabsTrigger value="leader" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/70 font-bold transition-all">
              Minha Célula
            </TabsTrigger>
          )}
          {isSupervisor && (
            <TabsTrigger value="supervisor" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/70 font-bold transition-all">
              Supervisão
            </TabsTrigger>
          )}
          {isMinistryLeader && (
            <TabsTrigger value="ministry" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/70 font-bold transition-all">
              Meu Ministério
            </TabsTrigger>
          )}
          {(isSeniorPastor || isNetworkPastor) && (
            <TabsTrigger value="macro" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/70 font-bold transition-all">
              Visão Igreja
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="personal" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <PersonalDashboard events={events} myScales={myScales} />
        </TabsContent>
        {isCellLeader && (
          <TabsContent value="leader" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <CellLeaderDashboard />
          </TabsContent>
        )}
        {isSupervisor && (
          <TabsContent value="supervisor" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <SupervisorDashboard />
          </TabsContent>
        )}
        {isMinistryLeader && (
          <TabsContent value="ministry" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <MinistryLeaderDashboard />
          </TabsContent>
        )}
        {(isSeniorPastor || isNetworkPastor) && (
          <TabsContent value="macro" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <MacroDashboard />
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
}

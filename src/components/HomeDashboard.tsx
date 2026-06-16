import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Target, ShieldCheck, Heart, Crosshair, ArrowRight, BookOpen, Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageMotion } from '@/src/lib/motion/presets';
import { AdminDashboardMetrics } from './AdminDashboardMetrics';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function PersonalDashboard({ events, myScales, userData }: { events: any[], myScales: any[], userData: any }) {
  const nextScale = myScales?.[0];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Próxima Escala</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{nextScale ? new Date(nextScale.date).toLocaleDateString() : 'Nenhuma'}</div>
            <p className="text-xs text-primary mt-1">{nextScale ? nextScale.ministry : 'Você não possui escalas'}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Escola IDE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">2 Cursos</div>
            <p className="text-xs text-green-400 mt-1">Ativos no momento</p>
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
    </div>
  )
}

function CellLeaderDashboard({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10 border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Membros Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{stats.cellMembers || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Saúde da Célula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-400">Boa</div>
            <p className="text-xs text-white/50 mt-1">Baseado nos últimos relatórios</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SupervisorDashboard({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10 border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60 uppercase tracking-wider">Células na Supervisão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{stats.supervisorCells || 0}</div>
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

export function HomeDashboard({ userData, events, myScales }: { userData: any, events: any[], myScales: any[] }) {
  const [stats, setStats] = useState<any>({ cellMembers: 0, supervisorCells: 0 });
  const roles = userData?.roles || [];
  const isAdmin = roles.includes('admin');
  const isSeniorPastor = roles.includes('seniorPastor') || isAdmin;
  const isNetworkPastor = roles.includes('networkPastor');
  const isMinistryLeader = roles.includes('ministryLeader') || isAdmin;
  const isSupervisor = roles.includes('supervisor') || roles.includes('networkPastor') || isAdmin;
  const isCellLeader = roles.includes('cellLeader') || isSupervisor || isAdmin;

  useEffect(() => {
    if (!userData?.id) return;
    const fetchStats = async () => {
      if (isSupervisor) {
        const q = query(collection(db, 'cells'), where('supervisorId', '==', userData.id));
        const snap = await getDocs(q);
        setStats((s: any) => ({ ...s, supervisorCells: snap.size }));
      }
      if (isCellLeader && userData.cellId) {
        const q = query(collection(db, 'members'), where('cellId', '==', userData.cellId));
        const snap = await getDocs(q);
        setStats((s: any) => ({ ...s, cellMembers: snap.size }));
      }
    };
    fetchStats();
  }, [userData, isSupervisor, isCellLeader]);

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
          <p className="text-white/60 text-lg font-medium">Bem-vindo ao seu painel.</p>
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
          {(isSeniorPastor || isNetworkPastor || isAdmin) && (
            <TabsTrigger value="macro" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/70 font-bold transition-all">
              Visão Igreja
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="personal" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <PersonalDashboard events={events} myScales={myScales} userData={userData} />
        </TabsContent>
        {isCellLeader && (
          <TabsContent value="leader" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <CellLeaderDashboard stats={stats} />
          </TabsContent>
        )}
        {isSupervisor && (
          <TabsContent value="supervisor" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <SupervisorDashboard stats={stats} />
          </TabsContent>
        )}
        {isMinistryLeader && (
          <TabsContent value="ministry" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <MinistryLeaderDashboard />
          </TabsContent>
        )}
        {(isSeniorPastor || isNetworkPastor || isAdmin) && (
          <TabsContent value="macro" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-6">
              <AdminDashboardMetrics userData={userData} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
}

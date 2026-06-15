'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AdminDashboardMetrics } from '../../components/AdminDashboardMetrics';
import { AdminStrategicGoals } from '../../components/AdminStrategicGoals';
import { AdminAutomations } from '../../components/AdminAutomations';
import { AdminPlanningKanban } from '../../components/AdminPlanningKanban';
import { AdminSeeder } from '../../components/AdminSeeder';
// import { AdminSchoolTab, AdminJornadaTab } from '../../App'; // App depends on react-router
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { pagePreset } from '../../lib/motion/presets';

export function GestaoNativeClient() {
  const [userData, setUserData] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const token = await user.getIdTokenResult();
        const profileType = token.claims.profileType || 'member';
        const roles = token.claims.roles || [];
        setUserData({
          id: user.uid,
          tenantId: token.claims.tenantId,
          roles,
          profileType
        });
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><span className="animate-pulse text-white/50">Carregando...</span></div>;
  }

  const isLeader = userData?.roles?.includes('admin') || userData?.roles?.includes('manager') || userData?.roles?.includes('pastor') || userData?.roles?.includes('seniorPastor');
  const isAdmin = userData?.roles?.includes('admin');

  if (!isLoggedIn || !isLeader) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <h2 className="text-2xl font-bold font-serif italic text-white">Acesso Restrito</h2>
        <p className="text-white/50">Você não tem permissão para acessar a gestão de liderança.</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-primary text-black font-bold rounded-full">
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <motion.div {...pagePreset} className="container mx-auto px-4 py-24 max-w-7xl space-y-8 mt-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase text-white">Gestão da Liderança</h1>
        <p className="text-white/60">Análise de dados, metas, automações e planejamento estratégico.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-900 border border-white/10 p-1.5 rounded-full overflow-x-auto whitespace-nowrap flex w-fit gap-1 custom-scrollbar">
          <TabsTrigger value="analytics" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all">Analytics (Visão 360)</TabsTrigger>
          <TabsTrigger value="goals" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all">Metas 2026</TabsTrigger>
          <TabsTrigger value="planning" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all">Planejamento (Kanban)</TabsTrigger>
          <TabsTrigger value="automations" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all">Notificações & PWA</TabsTrigger>
          {isAdmin && <TabsTrigger value="seeder" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all">Massa de Dados</TabsTrigger>}
        </TabsList>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="analytics" className="space-y-6 mt-0">
              <AdminDashboardMetrics userData={userData} />
            </TabsContent>

            <TabsContent value="goals" className="space-y-6 mt-0">
              <AdminStrategicGoals userData={userData} />
            </TabsContent>

            <TabsContent value="planning" className="space-y-6 mt-0">
              <AdminPlanningKanban />
            </TabsContent>

            <TabsContent value="automations" className="space-y-6 mt-0">
              <AdminAutomations />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="seeder" className="space-y-6 mt-0">
                <AdminSeeder userData={userData} />
              </TabsContent>
            )}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </motion.div>
  );
}

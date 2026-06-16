import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDashboardMetrics } from "./AdminDashboardMetrics";
import { AdminStrategicGoals } from "./AdminStrategicGoals";
import { AdminAutomations } from "./AdminAutomations";
import { AdminPlanningKanban } from "./AdminPlanningKanban";
import { AdminSeeder } from "./AdminSeeder";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { AdminSchoolTab, AdminJornadaTab } from "../App";
import { can } from "@/src/lib/permissions";

export function AdminView({ userData }: { userData?: any }) {
  const [activeTab, setActiveTab] = React.useState("analytics");

  const isAdmin = can(userData, "manage:seed");

  return (
    <div className="container mx-auto px-4 py-24 max-w-7xl space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase">Gestão da Liderança</h1>
        <p className="text-white/60">Análise de dados, metas, automações e planejamento estratégico.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-900 border border-white/10 p-1 rounded-full overflow-x-auto whitespace-nowrap flex w-fit">
          <TabsTrigger value="analytics" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Analytics (Visão 360)</TabsTrigger>
          <TabsTrigger value="goals" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Metas 2026</TabsTrigger>
          <TabsTrigger value="planning" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Planejamento (Kanban)</TabsTrigger>
          <TabsTrigger value="school" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Escola IDE</TabsTrigger>
          <TabsTrigger value="jornada" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Trilhas Formativas</TabsTrigger>
          <TabsTrigger value="automations" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Notificações & PWA</TabsTrigger>
          {isAdmin && <TabsTrigger value="seeder" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Massa de Dados</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <AdminDashboardMetrics userData={userData} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6 mt-6">
          <AdminStrategicGoals userData={userData} />
        </TabsContent>

        <TabsContent value="planning" className="space-y-6 mt-6">
          <AdminPlanningKanban userData={userData} />
        </TabsContent>

        <TabsContent value="school" className="space-y-6 mt-6">
          <AdminSchoolTab userData={userData} />
        </TabsContent>

        <TabsContent value="jornada" className="space-y-6 mt-6">
          <AdminJornadaTab />
        </TabsContent>

        <TabsContent value="automations" className="space-y-6 mt-6">
          <AdminAutomations />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="seeder" className="space-y-6 mt-6">
            <AdminSeeder userData={userData} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

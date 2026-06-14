import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCourses } from "./AdminCourses";
import { AdminQuizzes } from "./AdminQuizzes";
import { AdminSupport } from "./AdminSupport";
import { AdminFinance } from "./AdminFinance";
import { AdminAutomations } from "../AdminAutomations";

export function AdminSchoolTab({ userData }: { userData?: any }) {
  const [activeTab, setActiveTab] = React.useState("courses");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="bg-zinc-900 border border-white/10 p-1 rounded-full flex flex-wrap gap-2 h-auto w-fit">
        <TabsTrigger value="courses" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Cursos</TabsTrigger>
        <TabsTrigger value="quizzes" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Quizzes</TabsTrigger>
        <TabsTrigger value="support" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Central de Suporte</TabsTrigger>
        <TabsTrigger value="finance" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Financeiro</TabsTrigger>
        <TabsTrigger value="automations" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Notificações</TabsTrigger>
        <TabsTrigger value="google" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Google Workspace</TabsTrigger>
      </TabsList>
      
      <TabsContent value="courses" className="space-y-6">
        <AdminCourses />
      </TabsContent>
      <TabsContent value="quizzes" className="space-y-6">
        <AdminQuizzes />
      </TabsContent>
      <TabsContent value="support" className="space-y-6">
        <AdminSupport />
      </TabsContent>
      <TabsContent value="finance" className="space-y-6">
        <AdminFinance userData={userData} />
      </TabsContent>
      <TabsContent value="automations" className="space-y-6">
        <AdminAutomations />
      </TabsContent>
      <TabsContent value="google" className="space-y-6 mt-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden p-4 space-y-4">
             <h3 className="font-bold text-white">Apresentação Institucional (Google Slides)</h3>
             <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                <iframe src="https://docs.google.com/presentation/d/e/2PACX-1vT1TjJ0P5z_B3S0tZk_GZgL0KxN9C4G7xV2yZ_H6Q8W5Z_B3S0tZk_GZgL0KxN9C4G7xV2yZ/embed?start=false&loop=false&delayms=3000" frameBorder="0" width="100%" height="100%" allowFullScreen></iframe>
             </div>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden p-4 space-y-4">
             <h3 className="font-bold text-white">Formulário de Inscrição (Google Forms)</h3>
             <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-white">
                <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSe-0P0-1P0/viewform?embedded=true" width="100%" height="100%" frameBorder="0" marginHeight={0} marginWidth={0}>Carregando…</iframe>
             </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

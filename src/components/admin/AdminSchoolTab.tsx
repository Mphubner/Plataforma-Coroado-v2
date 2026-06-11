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
      <TabsList className="bg-zinc-900 border border-white/10 p-1 rounded-full">
        <TabsTrigger value="courses" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Cursos</TabsTrigger>
        <TabsTrigger value="quizzes" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Quizzes</TabsTrigger>
        <TabsTrigger value="support" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Central de Suporte</TabsTrigger>
        <TabsTrigger value="finance" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Financeiro</TabsTrigger>
        <TabsTrigger value="automations" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Notificações</TabsTrigger>
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
    </Tabs>
  );
}

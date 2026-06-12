import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Calendar, MapPin, Plus, Target, CheckSquare, Clock, Phone, AlertCircle, Edit, ListTodo, Trophy, BadgeAlert, Share2, QrCode, BookOpen, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function ResumoTab({ cell, members, reports }: { cell: any, members: any[], reports: any[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-white/10 rounded-[2rem]">
          <CardContent className="p-8">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-2 tracking-widest">Membros Ativos</p>
            <div className="text-5xl font-black text-primary">{members.length} <span className="text-sm font-medium text-white/40 ml-2">discipulados</span></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10 rounded-[2rem]">
          <CardContent className="p-8">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-2 tracking-widest">Média Mensal de Visitantes</p>
            <div className="text-5xl font-black text-white">2 <span className="text-sm font-medium text-white/40 ml-2">novos contatos</span></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10 rounded-[2rem]">
          <CardContent className="p-8">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-2 tracking-widest">Relatórios Lançados</p>
            <div className="text-5xl font-black text-white">0 <span className="text-sm font-medium text-green-400 ml-2">100% em dia</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-900 border-white/10 rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-xl font-bold font-serif italic">Metas e Projetos de Multiplicação</CardTitle>
              <p className="text-sm text-white/50">Células saudáveis geram mais comunhão de perto</p>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-white/60">Engajamento Total (Multiplicação Semente)</span>
                   <span className="text-primary font-bold">0%</span>
                 </div>
                 <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                   <div className="h-full bg-primary w-0"></div>
                 </div>
                 <p className="text-xs text-white/40 italic mt-1">Alvo: 15 membros treinados para abertura de nova célula.</p>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-white/5 rounded-2xl bg-black/20 flex items-center gap-3">
                    <CheckSquare className="text-primary/50 w-5 h-5" />
                    <span className="text-sm text-white/70">Formar 2 Líderes em Treinamento na Escola IDE</span>
                  </div>
                  <div className="p-4 border border-white/5 rounded-2xl bg-black/20 flex items-center gap-3">
                    <CheckSquare className="text-primary/50 w-5 h-5" />
                    <span className="text-sm text-white/70">Manter a média acima de 80% de presença</span>
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/10 rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-xl font-bold font-serif italic flex items-center gap-2">
                <Target className="text-primary w-5 h-5" /> Monitor de Saúde da Célula
              </CardTitle>
              <p className="text-sm text-white/50">Status de engajamento e discipulado (Escola IDE e Frequência)</p>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="font-bold text-white/80">Assiduidade aos Encontros</span>
                     <span className="text-red-400 font-bold">65%</span>
                   </div>
                   <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                     <div className="h-full bg-red-400 w-[65%]"></div>
                   </div>
                   <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Últimas 4 semanas: Abaixo da meta de 70%</p>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="font-bold text-white/80">Engajamento na Escola IDE</span>
                     <span className="text-green-400 font-bold">85%</span>
                   </div>
                   <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                     <div className="h-full bg-green-400 w-[85%]"></div>
                   </div>
                   <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Consolidado (Rede)</p>
                 </div>
               </div>

               <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-2xl flex gap-4 items-start">
                 <BadgeAlert className="text-red-400 w-5 h-5 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="text-red-400 font-bold mb-1">Alerta de Quebra de Engajamento</h4>
                   <p className="text-sm text-red-400/70">A assiduidade aos encontros da célula caiu para 65%. Considere realizar visitas pastorais.</p>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="bg-zinc-900 border-white/10 rounded-[2rem]">
             <CardHeader>
               <CardTitle className="text-lg font-bold font-serif italic">Ações de Liderança</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <Button className="w-full bg-primary text-black font-bold h-12 rounded-xl">
                 <CheckSquare className="w-4 h-4 mr-2" /> Lançar Encontro Semanal
               </Button>
               <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl">
                 <Plus className="w-4 h-4 mr-2" /> Adicionar Novo Membro
               </Button>
               <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl">
                 <Plus className="w-4 h-4 mr-2" /> Registrar Novo Visitante
               </Button>
             </CardContent>
           </Card>

           <Card className="bg-zinc-900 border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent rounded-[2rem]">
             <CardHeader>
               <CardTitle className="text-lg font-bold text-red-400 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" /> Alertas de Cuidado
               </CardTitle>
               <p className="text-[10px] uppercase text-red-400/50">Membros inativos (Faltas ou IDE parada > 3 sem).</p>
             </CardHeader>
             <CardContent className="space-y-3">
                <div className="p-4 rounded-xl border border-red-500/20 bg-black/20 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">Lucas Ferreira</h4>
                    <p className="text-xs text-red-400/70 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> Sem freq. há 3 sem.</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-full text-xs h-8">WhatsApp</Button>
                </div>
                <div className="p-4 rounded-xl border border-red-500/20 bg-black/20 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">Mariana Costa</h4>
                    <p className="text-xs text-red-400/70 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> Sem acesso à Escola IDE</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-full text-xs h-8">Ligar</Button>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}

function ResumoMembroTab({ cell, userData }: { cell: any, userData: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-white/10 rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-serif italic">Meu Engajamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-white/80">Minha Frequência</span>
                <span className="text-green-400 font-bold">100%</span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 w-[100%]"></div>
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Últimas 4 semanas</p>
            </div>
            
            <div className="space-y-3">
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest border-b border-white/10 pb-2">Minhas Escalas</p>
              <div className="p-3 border border-white/5 rounded-xl bg-black/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                     <Target className="w-4 h-4 text-primary"/>
                  </div>
                  <div>
                    <p className="text-xs font-bold">Louvor e Adoração</p>
                    <p className="text-[10px] text-white/50">Próximo Encontro</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/20 text-primary text-[10px]">Confirmado</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/20 to-zinc-900 border-primary/20 rounded-[2rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20"><QrCode className="w-32 h-32" /></div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-bold font-serif italic text-white flex items-center gap-2">
               <Share2 className="w-5 h-5 text-primary" /> Convidar Visitantes
            </CardTitle>
            <p className="text-sm text-white/70">Compartilhe o link da célula para amigos e interessados.</p>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            <Button className="w-full bg-primary text-black font-bold h-12 rounded-xl hover:bg-primary/90">
              Copiar Link Compartilhável
            </Button>
            <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl text-white">
              <QrCode className="w-4 h-4 mr-2" /> Mostrar QR Code
            </Button>
            <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl text-white">
              <Phone className="w-4 h-4 mr-2" /> Nosso Instagram
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MembrosTab({ members, isLeader }: { members: any[], isLeader: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-900 border border-white/10 p-4 rounded-2xl">
         <h3 className="font-bold font-serif italic text-xl pl-2">Nossa Família de Membros</h3>
         {isLeader && <Button className="bg-primary text-black font-bold rounded-full"><Plus className="w-4 h-4 mr-2"/> Adicionar</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(m => (
          <Card key={m.id} className="bg-zinc-900 border-white/10 rounded-[2rem] hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-primary/20">
                  <AvatarFallback className="bg-black text-primary font-bold">{m.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold text-lg leading-tight">{m.name}</h4>
                  <p className="text-xs text-white/50 mt-1">{m.roles?.join(', ') || 'Membro'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                 <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] uppercase">IDE 100%</Badge>
                 <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] uppercase">Servindo: Recepção</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {members.length === 0 && <div className="col-span-full text-center py-10 text-white/40">Nenhum membro encontrado.</div>}
      </div>
    </div>
  )
}

function VisitantesTab({ isLeader }: { isLeader: boolean }) {
  const visitors = [
    { id: 1, name: "Carlos Eduardo", date: "26/05/2026", status: "Em consolidação" },
    { id: 2, name: "Fernanda Ribeiro", date: "19/05/2026", status: "Acompanhamento" }
  ];

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-zinc-900 border border-white/10 p-6 rounded-[2rem]">
         <div>
           <h3 className="font-bold font-serif italic text-xl">Consolidação de Visitantes de Perto</h3>
           <p className="text-white/50 text-sm mt-1">Faça o acompanhamento estratégico das primeiras visitas</p>
         </div>
         {isLeader && <Button className="bg-primary text-black font-bold rounded-full"><Plus className="w-4 h-4 mr-2"/> Registrar</Button>}
       </div>

       <div className="space-y-4">
         {visitors.map(v => (
           <div key={v.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-zinc-900 border border-white/10 rounded-[2rem] gap-4">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                  {v.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{v.name}</h4>
                  <p className="text-xs text-white/50 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3"/> Presente em: {v.date}</p>
                </div>
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <Button variant="outline" className="flex-1 md:flex-none border-white/10 hover:bg-white/5 rounded-full"><Phone className="w-4 h-4 mr-2"/> Enviar Mensagem</Button>
               {isLeader && <Button variant="outline" className="flex-1 md:flex-none border-primary/20 text-primary hover:bg-primary/10 rounded-full"><Users className="w-4 h-4 mr-2"/> Consolidar no Rol</Button>}
             </div>
           </div>
         ))}
       </div>
    </div>
  )
}

function EscalasDinâmicasTab({ isLeader, members }: { isLeader: boolean, members: any[] }) {
  // Lógica de Sorteio Lazy: Em produção, isso seria do backend. No front, simulamos um state.
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Dar Estudo / Ministração', assignee: 'Gabriel Henrique', status: 'Confirmado', icon: <BookOpen className="w-5 h-5 text-blue-400" /> },
    { id: '2', title: 'Louvor e Adoração', assignee: 'Priscila Mendes', status: 'Confirmado', icon: <Phone className="w-5 h-5 text-purple-400" /> },
    { id: '3', title: 'Oração Inicial', assignee: null, status: 'Pendente', icon: <Heart className="w-5 h-5 text-red-400" /> },
    { id: '4', title: 'Dinâmica de Quebra-Gelo', assignee: 'Danilo Soares', status: 'Confirmado', icon: <Target className="w-5 h-5 text-yellow-400" /> },
    { id: '5', title: 'Recepção / Boas Vindas', assignee: null, status: 'Pendente', icon: <Users className="w-5 h-5 text-green-400" /> },
    { id: '6', title: 'Lanche / Comes e Bebes', assignee: 'Todos participam', status: 'Mesa da Partilha', icon: <AlertCircle className="w-5 h-5 text-orange-400" /> },
  ]);

  const handleSortear = () => {
     // Motor Lógico Simplificado: Pega membros que não tem tarefa e aloca nas pendentes.
     if (!isLeader) return;
     let availableMembers = [...members];
     
     const updatedTasks = tasks.map(t => {
        if (t.status === 'Pendente' && availableMembers.length > 0) {
           // random pick
           const randIdx = Math.floor(Math.random() * availableMembers.length);
           const chosen = availableMembers[randIdx];
           availableMembers.splice(randIdx, 1); // remove picked
           return { ...t, assignee: chosen.name, status: 'Sorteado (Aguardando Confirmação)' };
        }
        return t;
     });
     setTasks(updatedTasks);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900 border border-white/10 p-6 rounded-[2rem] gap-4">
         <div>
           <h3 className="font-bold font-serif italic text-xl">Escalas do Encontro</h3>
           <p className="text-white/50 text-sm mt-1">Distribua as funções para o próximo encontro.</p>
         </div>
         <div className="flex gap-2">
           {isLeader && <Button onClick={handleSortear} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 rounded-full font-bold">Sortear Pendentes</Button>}
           {isLeader && <Button className="bg-primary text-black font-bold rounded-full"><Plus className="w-4 h-4 mr-2"/> Nova Escala</Button>}
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {tasks.map(t => (
           <div key={t.id} className="p-6 bg-zinc-900 border border-white/10 rounded-[2rem] flex items-center justify-between group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-black/50 flex items-center justify-center shrink-0 border border-white/5">
                   {t.icon}
                 </div>
                 <div>
                   <h4 className="font-bold">{t.title}</h4>
                   <p className="text-sm text-white/50 mt-1">{t.assignee || 'Aguardando voluntário'}</p>
                 </div>
              </div>
              <div className="text-right">
                {t.status === 'Pendente' ? (
                   <Button variant="link" className="text-primary font-bold uppercase tracking-widest text-xs">Eu Quero</Button>
                ) : (
                   <span className={`text-[10px] uppercase font-bold tracking-widest ${t.status.includes('Confirmado') ? 'text-green-400' : 'text-yellow-400'}`}>
                     {t.status}
                   </span>
                )}
              </div>
           </div>
         ))}
       </div>
    </div>
  )
}

function RelatoriosTab({ isLeader, reports }: { isLeader: boolean, reports: any[] }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-900 border border-white/10 p-4 rounded-[2rem]">
         <h3 className="font-bold font-serif italic text-xl pl-4">Histórico de Relatórios Enviados</h3>
         {isLeader && <Button className="bg-primary text-black font-bold rounded-full"><Plus className="w-4 h-4 mr-2"/> Lançar Novo</Button>}
      </div>
      <div className="space-y-4">
         {reports.length === 0 ? (
           <div className="text-center p-12 bg-zinc-900 border border-white/10 rounded-[2rem] text-white/40 italic text-sm">
             Nenhum relatório lançado ainda.
           </div>
         ) : (
           reports.map(r => (
             <div key={r.id} className="p-6 bg-zinc-900 border border-white/10 rounded-[2rem] flex justify-between items-center">
               <div>
                 <p className="font-bold text-lg">{new Date(r.date).toLocaleDateString()}</p>
                 <p className="text-sm text-white/60 mt-1">Presentes: {r.present} | Visitantes: {r.visitors}</p>
               </div>
               <Button variant="outline" className="border-white/10 rounded-full">Ver Detalhes</Button>
             </div>
           ))
         )}
      </div>
    </div>
  )
}

export function CellManagementDashboard({ isLeader, cell, userData }: { isLeader: boolean; cell: any; userData: any }) {
  const [activeTab, setActiveTab] = useState("resumo");
  const [members, setMembers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const isSupervisor = userData?.roles?.includes('supervisor') || userData?.roles?.includes('admin');

  useEffect(() => {
    if (!cell?.id || !userData?.tenantId) return;
    const qM = query(collection(db, 'users'), where('tenantId', '==', userData.tenantId), where('cellId', '==', cell.id));
    const unsubM = onSnapshot(qM, (snap) => setMembers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    const qR = query(collection(db, 'cell_reports'), where('tenantId', '==', userData.tenantId), where('cellId', '==', cell.id));
    const unsubR = onSnapshot(qR, (snap) => setReports(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubM(); unsubR(); };
  }, [cell?.id, userData?.tenantId]);

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-gradient-to-r from-zinc-900 to-black border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-4">
            <div className="flex gap-2">
               <Badge className="bg-primary/20 text-primary border-primary/20 uppercase tracking-widest text-[10px] font-bold px-3 py-1">Painel de Gestão da Célula</Badge>
               {isSupervisor && <Badge variant="outline" className="border-white/10 text-white/50 uppercase tracking-widest text-[10px]">Acesso de Rede (Multi-Células)</Badge>}
            </div>
            <h1 className="text-5xl md:text-6xl font-black font-serif italic tracking-tight">{cell.name}</h1>
            <p className="text-white/60 flex items-center gap-3 text-lg font-medium">
              <MapPin className="w-5 h-5 text-primary" /> {cell.neighborhood} - {cell.city || 'São Paulo'} • <Clock className="w-5 h-5 text-primary ml-2" /> {cell.day} às {cell.time}
            </p>
          </div>
          
          {isSupervisor && (
             <div className="flex items-center gap-4 bg-black/40 p-2 pl-6 rounded-full border border-white/10">
               <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Gerir Rede:</span>
               <select className="bg-zinc-800 text-white border-none rounded-full px-4 py-2 font-bold focus:ring-primary">
                 <option>{cell.name} (Centro)</option>
                 <option>Célula Vida (Norte)</option>
                 <option>Célula Sal (Sul)</option>
               </select>
             </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-zinc-900 border border-white/10 p-1.5 rounded-full overflow-x-auto whitespace-nowrap flex w-fit gap-1">
          <TabsTrigger value="resumo" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Resumo</TabsTrigger>
          <TabsTrigger value="members" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Membros ({members.length})</TabsTrigger>
          <TabsTrigger value="visitors" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Visitantes (2)</TabsTrigger>
          <TabsTrigger value="escalas" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Escalas Dinâmicas</TabsTrigger>
          {isLeader && <TabsTrigger value="reports" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Relatórios</TabsTrigger>}
          {isLeader && <TabsTrigger value="charts" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Gráficos Base</TabsTrigger>}
          {isSupervisor && <TabsTrigger value="network" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Gestão da Rede</TabsTrigger>}
        </TabsList>

        <TabsContent value="resumo" className="mt-6 focus-visible:outline-none">
          {isLeader ? (
            <ResumoTab cell={cell} members={members} reports={reports} />
          ) : (
            <ResumoMembroTab cell={cell} userData={userData} />
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-6 focus-visible:outline-none">
          <MembrosTab members={members} isLeader={isLeader} />
        </TabsContent>
        
        <TabsContent value="visitors" className="mt-6 focus-visible:outline-none">
          <VisitantesTab isLeader={isLeader} />
        </TabsContent>
        
        <TabsContent value="escalas" className="mt-6 focus-visible:outline-none">
          <EscalasDinâmicasTab isLeader={isLeader} members={members} />
        </TabsContent>

        {isLeader && (
          <TabsContent value="reports" className="mt-6 focus-visible:outline-none">
             <RelatoriosTab isLeader={isLeader} reports={reports} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

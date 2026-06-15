import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Calendar, MapPin, Plus, Target, CheckSquare, Clock, Phone, AlertCircle, Edit, ListTodo, Trophy, BadgeAlert, Share2, QrCode, BookOpen, Heart, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import ReactQrCode from 'react-qr-code';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import { createCellReport } from '@/src/lib/services/cellReportsService';

function ResumoTab({ cell, members, reports, onOpenReports, onOpenMembers, onOpenVisitors }: { cell: any, members: any[], reports: any[], onOpenReports: () => void, onOpenMembers: () => void, onOpenVisitors: () => void }) {
  const reportCount = reports.length;
  const totalVisitors = reports.reduce((sum, report) => sum + Number(report.visitors || 0), 0);
  const monthlyVisitorAverage = reportCount > 0 ? Math.round((totalVisitors / reportCount) * 10) / 10 : 0;
  const lastFourReports = reports
    .filter(report => report.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const attendanceRate = members.length > 0 && lastFourReports.length > 0
    ? Math.round((lastFourReports.reduce((sum, report) => sum + Number(report.present || 0), 0) / (lastFourReports.length * members.length)) * 100)
    : 0;
  const attendanceTone = attendanceRate >= 70 ? 'text-green-400' : 'text-red-400';
  const attendanceBar = attendanceRate >= 70 ? 'bg-green-400' : 'bg-red-400';
  const reportsStatus = reportCount > 0 ? 'em dia' : 'pendente';

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
            <div className="text-5xl font-black text-white">{monthlyVisitorAverage} <span className="text-sm font-medium text-white/40 ml-2">por encontro</span></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10 rounded-[2rem]">
          <CardContent className="p-8">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-2 tracking-widest">Relatórios Lançados</p>
            <div className="text-5xl font-black text-white">{reportCount} <span className="text-sm font-medium text-green-400 ml-2">{reportsStatus}</span></div>
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
                     <span className={`${attendanceTone} font-bold`}>{attendanceRate}%</span>
                   </div>
                   <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                     <div className={`h-full ${attendanceBar}`} style={{ width: `${Math.min(attendanceRate, 100)}%` }}></div>
                   </div>
                   <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Últimos {lastFourReports.length || 0} encontros: meta de 70%</p>
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
                   <h4 className="text-red-400 font-bold mb-1">{attendanceRate >= 70 ? 'Acompanhamento Preventivo' : 'Alerta de Quebra de Engajamento'}</h4>
                   <p className="text-sm text-red-400/70">A assiduidade atual está em {attendanceRate}%. {attendanceRate >= 70 ? 'Mantenha o acompanhamento de discipulado.' : 'Considere realizar visitas pastorais.'}</p>
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
               <Button onClick={onOpenReports} className="w-full bg-primary text-black font-bold h-12 rounded-xl">
                 <CheckSquare className="w-4 h-4 mr-2" /> Lançar Encontro Semanal
               </Button>
               <Button onClick={onOpenMembers} variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl">
                 <Plus className="w-4 h-4 mr-2" /> Adicionar Novo Membro
               </Button>
               <Button onClick={onOpenVisitors} variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl">
                 <Plus className="w-4 h-4 mr-2" /> Registrar Novo Visitante
               </Button>
             </CardContent>
           </Card>

           <Card className="bg-zinc-900 border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent rounded-[2rem]">
             <CardHeader>
               <CardTitle className="text-lg font-bold text-red-400 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" /> Alertas de Cuidado
               </CardTitle>
               <p className="text-[10px] uppercase text-red-400/50">Membros inativos (Faltas ou IDE parada &gt; 3 sem).</p>
             </CardHeader>
             <CardContent className="space-y-3">
                <div className="p-4 rounded-xl border border-red-500/20 bg-black/20 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">Lucas Ferreira</h4>
                    <p className="text-xs text-red-400/70 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> Sem freq. há 3 sem.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => window.location.href = '/membros'} className="border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-full text-xs h-8">WhatsApp</Button>
                </div>
                <div className="p-4 rounded-xl border border-red-500/20 bg-black/20 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">Mariana Costa</h4>
                    <p className="text-xs text-red-400/70 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> Sem acesso à Escola IDE</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => window.location.href = '/membros'} className="border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-full text-xs h-8">Ligar</Button>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}

function ResumoMembroTab({ cell, userData }: { cell: any, userData: any }) {
  const [showInviteQr, setShowInviteQr] = useState(false);
  const inviteUrl = `${window.location.origin}/celulas?cell=${encodeURIComponent(cell?.id || cell?.name || '')}`;
  const instagramUrl = cell?.instagram || 'https://www.instagram.com/igrejacoroado/';

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showInviteQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-sm text-center space-y-5">
              <div className="bg-white p-4 rounded-2xl inline-block">
                <ReactQrCode value={inviteUrl} size={180} />
              </div>
              <div>
                <h3 className="font-black text-xl text-white">Convite da célula</h3>
                <p className="text-xs text-white/50 break-all mt-2">{inviteUrl}</p>
              </div>
              <Button onClick={() => setShowInviteQr(false)} variant="outline" className="w-full border-white/10">Fechar</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
            <Button onClick={async () => {
              await navigator.clipboard.writeText(inviteUrl);
              alert('Link da célula copiado.');
            }} className="w-full bg-primary text-black font-bold h-12 rounded-xl hover:bg-primary/90">
              Copiar Link Compartilhável
            </Button>
            <Button onClick={() => setShowInviteQr(true)} variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl text-white">
              <QrCode className="w-4 h-4 mr-2" /> Mostrar QR Code
            </Button>
            <Button onClick={() => window.open(instagramUrl, '_blank')} variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl text-white">
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
         {isLeader && <Button onClick={() => window.location.href = '/membros'} className="bg-primary text-black font-bold rounded-full"><Plus className="w-4 h-4 mr-2"/> Adicionar</Button>}
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

function VisitantesTab({ isLeader, visitors }: { isLeader: boolean, visitors: any[] }) {

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-zinc-900 border border-white/10 p-6 rounded-[2rem]">
         <div>
           <h3 className="font-bold font-serif italic text-xl">Consolidação de Visitantes de Perto</h3>
           <p className="text-white/50 text-sm mt-1">Faça o acompanhamento estratégico das primeiras visitas</p>
         </div>
         {isLeader && <Button onClick={() => alert('Para registrar visitante com vínculo à célula, lance um relatório de encontro com o visitante informado.')} className="bg-primary text-black font-bold rounded-full"><Plus className="w-4 h-4 mr-2"/> Registrar</Button>}
       </div>

       <div className="space-y-4">
         {visitors.length === 0 && <div className="text-center py-8 text-white/40 bg-zinc-900 border border-white/10 rounded-[2rem]">Nenhum visitante registrado ainda nos relatórios.</div>}
         {visitors.map(v => (
           <div key={v.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-zinc-900 border border-white/10 rounded-[2rem] gap-4">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                  {v.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{v.name}</h4>
                  <p className="text-xs text-white/50 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3"/> Última visita: {v.lastDate} ({v.count} presenças)</p>
                  <span className={`text-[10px] font-bold mt-1 inline-block ${v.count >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>{v.status}</span>
                </div>
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <Button onClick={() => alert('Este visitante veio de relatórios da célula. Cadastre o WhatsApp no próximo lançamento para abrir contato direto.')} variant="outline" className="flex-1 md:flex-none border-white/10 hover:bg-white/5 rounded-full"><Phone className="w-4 h-4 mr-2"/> Enviar Mensagem</Button>
               {isLeader && v.count >= 3 && <Button onClick={() => window.location.href = '/membros'} variant="outline" className="flex-1 md:flex-none border-green-500/20 text-green-400 hover:bg-green-500/10 rounded-full"><Users className="w-4 h-4 mr-2"/> Tornar Membro</Button>}
               {isLeader && v.count < 3 && <Button onClick={() => alert('Plano de consolidação criado: entre em contato, convide para o próximo encontro e registre a nova presença no relatório semanal.')} variant="outline" className="flex-1 md:flex-none border-primary/20 text-primary hover:bg-primary/10 rounded-full"><Heart className="w-4 h-4 mr-2"/> Consolidar</Button>}
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
            {isLeader && <Button onClick={() => alert('Use Sortear Pendentes para gerar a próxima escala base. A persistência de escalas da célula será consolidada no módulo de escalas.')} className="bg-primary text-black font-bold rounded-full"><Plus className="w-4 h-4 mr-2"/> Nova Escala</Button>}
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
                   <p className="text-sm text-white/50 mt-1">{t.assignee || 'Aguardando servo'}</p>
                 </div>
              </div>
              <div className="text-right">
                {t.status === 'Pendente' ? (
                   <Button onClick={() => alert('Interesse registrado visualmente. O líder deve confirmar a escala no próximo lançamento.')} variant="link" className="text-primary font-bold uppercase tracking-widest text-xs">Eu Quero</Button>
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

function RelatoriosTab({ isLeader, reports, members, cell, userData }: { isLeader: boolean, reports: any[], members: any[], cell: any, userData: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingType, setMeetingType] = useState('Célula');
  const [presentMembers, setPresentMembers] = useState<string[]>([]);
  const [hasVisitors, setHasVisitors] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.tenantId || !cell?.id) return;
    setSubmitting(true);
    try {
      await createCellReport({
        cellId: cell.id,
        date,
        meetingType,
        tenantId: userData.tenantId,
        presentMembersIds: presentMembers,
        createdBy: auth.currentUser?.uid || userData.id,
        visitorName: hasVisitors ? visitorName : '',
      });
      setIsModalOpen(false);
      setPresentMembers([]);
      setHasVisitors(false);
      setVisitorName('');
      alert("Relatório salvo com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar relatório.");
    }
    setSubmitting(false);
  };

  const toggleMember = (id: string) => {
    setPresentMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center bg-zinc-900 border border-white/10 p-4 rounded-[2rem]">
         <h3 className="font-bold font-serif italic text-xl pl-4">Histórico de Relatórios</h3>
         {isLeader && <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-black font-bold rounded-full"><Plus className="w-4 h-4 mr-2"/> Lançar Novo</Button>}
      </div>

      <div className="space-y-4">
         {reports.length === 0 ? (
           <div className="text-center p-12 bg-zinc-900 border border-white/10 rounded-[2rem] text-white/40 italic text-sm">
             Nenhum relatório lançado ainda.
           </div>
         ) : (
           reports.map(r => (
             <div key={r.id} className="p-6 bg-zinc-900 border border-white/10 rounded-[2rem] flex justify-between items-center hover:border-primary/30 transition-colors">
               <div>
                 <p className="font-bold text-lg">{new Date(r.date).toLocaleDateString()} <span className="text-sm font-normal text-white/40 ml-2">({r.meetingType || 'Célula'})</span></p>
                 <p className="text-sm text-white/60 mt-1">Presentes: {r.present} | Visitantes: {r.visitors}</p>
               </div>
               <Button
                 onClick={() => alert(r.summary || `${r.meetingType || 'Encontro'}: ${r.present || 0} presentes e ${r.visitors || 0} visitantes.`)}
                 variant="outline"
                 className="border-white/10 rounded-full"
               >
                 Ver Detalhes
               </Button>
             </div>
           ))
         )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
               className="bg-zinc-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
             >
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-bold font-serif italic text-primary">Novo Relatório de Presença</h2>
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white rounded-full">X</Button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-sm font-bold text-white/70">Data do Encontro</label>
                       <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-sm font-bold text-white/70">Tipo de Encontro</label>
                       <select value={meetingType} onChange={e => setMeetingType(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none appearance-none">
                         <option value="Célula">Encontro de Célula</option>
                         <option value="Discipulado">Discipulado</option>
                         <option value="Evento">Evento / Confraternização</option>
                         <option value="Outro">Outro</option>
                       </select>
                     </div>
                   </div>

                   <div className="space-y-3">
                     <label className="text-sm font-bold text-white/70">Membros Presentes</label>
                     <div className="bg-black/30 border border-white/5 rounded-2xl p-4 max-h-60 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {members.length === 0 ? <p className="text-xs text-white/40 italic">Nenhum membro vinculado a esta célula.</p> : null}
                        {members.map(m => (
                          <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${presentMembers.includes(m.id) ? 'bg-primary/10 border-primary/30' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                            <input type="checkbox" checked={presentMembers.includes(m.id)} onChange={() => toggleMember(m.id)} className="w-4 h-4 accent-primary" />
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6"><AvatarFallback className="text-[10px]">{m.name?.[0]}</AvatarFallback></Avatar>
                              <span className="text-sm">{m.name}</span>
                            </div>
                          </label>
                        ))}
                     </div>
                   </div>

                   <div className="space-y-4 border-t border-white/10 pt-6">
                     <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={hasVisitors} onChange={e => setHasVisitors(e.target.checked)} className="w-5 h-5 accent-primary" />
                        <span className="font-bold text-white">Tivemos Visitantes!</span>
                     </label>

                     {hasVisitors && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2 overflow-hidden">
                         <label className="text-sm text-white/70">Nome do Visitante Principal / Resumo</label>
                         <input type="text" placeholder="Ex: Carlos e esposa" value={visitorName} onChange={e => setVisitorName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" />
                       </motion.div>
                     )}
                   </div>

                   <div className="pt-4 flex justify-end gap-3">
                     <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-full border-white/10">Cancelar</Button>
                     <Button type="submit" disabled={submitting} className="bg-primary text-black font-bold rounded-full px-8">
                       {submitting ? 'Salvando...' : 'Salvar Relatório'}
                     </Button>
                   </div>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
    
    const qR = query(collection(db, COLLECTIONS.cellReports), where('tenantId', '==', userData.tenantId), where('cellId', '==', cell.id));
    const unsubR = onSnapshot(qR, (snap) => setReports(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubM(); unsubR(); };
  }, [cell?.id, userData?.tenantId]);

  const consolidatedVisitors = React.useMemo(() => {
    const counts: Record<string, { count: number, dates: string[], originalName: string }> = {};
    reports.forEach(r => {
      if (r.visitorData?.name) {
         const name = r.visitorData.name.trim();
         const key = name.toLowerCase();
         if (!counts[key]) {
            counts[key] = { count: 0, dates: [], originalName: name };
         }
         counts[key].count += 1;
         counts[key].dates.push(new Date(r.date).toLocaleDateString());
      }
    });
    return Object.values(counts).map((v, idx) => ({
       id: idx,
       name: v.originalName,
       count: v.count,
       lastDate: v.dates.sort().reverse()[0],
       status: v.count >= 3 ? "Pronto para ser Membro" : (v.count === 2 ? "Acompanhamento" : "Primeira Visita")
    }));
  }, [reports]);

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
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="bg-zinc-800/50 border-white/10 hover:bg-white/10 rounded-full text-white"
                onClick={() => window.open('https://chat.google.com/', '_blank')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Espaço no Google Chat
              </Button>
            </div>
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
          <TabsTrigger value="visitors" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Visitantes ({consolidatedVisitors.length})</TabsTrigger>
          <TabsTrigger value="escalas" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Escalas Dinâmicas</TabsTrigger>
          {isLeader && <TabsTrigger value="reports" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Relatórios</TabsTrigger>}
          {isLeader && <TabsTrigger value="charts" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Gráficos Base</TabsTrigger>}
          {isSupervisor && <TabsTrigger value="network" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black text-white/70 font-bold transition-all">Gestão da Rede</TabsTrigger>}
        </TabsList>

        <TabsContent value="resumo" className="mt-6 focus-visible:outline-none">
          {isLeader ? (
            <ResumoTab
              cell={cell}
              members={members}
              reports={reports}
              onOpenReports={() => setActiveTab('reports')}
              onOpenMembers={() => setActiveTab('members')}
              onOpenVisitors={() => setActiveTab('visitors')}
            />
          ) : (
            <ResumoMembroTab cell={cell} userData={userData} />
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-6 focus-visible:outline-none">
          <MembrosTab members={members} isLeader={isLeader} />
        </TabsContent>
        
        <TabsContent value="visitors" className="mt-6 focus-visible:outline-none">
          <VisitantesTab isLeader={isLeader} visitors={consolidatedVisitors} />
        </TabsContent>
        
        <TabsContent value="escalas" className="mt-6 focus-visible:outline-none">
          <EscalasDinâmicasTab isLeader={isLeader} members={members} />
        </TabsContent>

        {isLeader && (
          <TabsContent value="reports" className="mt-6 focus-visible:outline-none">
             <RelatoriosTab isLeader={isLeader} reports={reports} members={members} cell={cell} userData={userData} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, TrendingUp, Users, DollarSign, Activity, Settings, X, Plus } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area } from 'recharts';
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

const mockAnalyticsData = [
  { month: 'Jan', cellules: 78, revenue: 38000, visitors: 15 },
  { month: 'Fev', cellules: 80, revenue: 41000, visitors: 22 },
  { month: 'Mar', cellules: 82, revenue: 40500, visitors: 18 },
  { month: 'Abr', cellules: 84, revenue: 45000, visitors: 30 },
];

export function AdminDashboardMetrics({ userData }: { userData?: any }) {
  const [activeModal, setActiveModal] = useState<'service' | 'financial' | 'targets' | null>(null);

  // Targets
  const [targets, setTargets] = useState<any>({
    activeCells: 100,
    attendanceAvg: 90,
    visitorsTarget: 50,
    revenueTarget: 50000
  });

  // KPI Entries (Service, Finance)
  const [services, setServices] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);

  // Form states
  const [serviceForm, setServiceForm] = useState({ name: '', date: '', actual: 0, target: 0, visActual: 0, visTarget: 0 });
  const [financeForm, setFinanceForm] = useState({ title: '', date: '', amount: 0, target: 0 });
  const [targetForm, setTargetForm] = useState({ activeCells: 0, attendanceAvg: 0, visitorsTarget: 0, revenueTarget: 0 });

  const isHighLevel = userData?.roles?.includes('admin') || userData?.roles?.includes('pastor');

  useEffect(() => {
    if (!userData?.tenantId) return;
    
    const unT = onSnapshot(query(collection(db, 'kpi_targets'), where('tenantId', '==', userData.tenantId)), (snap) => {
       const userTargets: any = { ...targets };
       snap.docs.forEach(d => {
         const data = d.data();
         if (data.name === 'activeCells') userTargets.activeCells = data.targetValue;
         if (data.name === 'attendanceAvg') userTargets.attendanceAvg = data.targetValue;
         if (data.name === 'visitorsTarget') userTargets.visitorsTarget = data.targetValue;
         if (data.name === 'revenueTarget') userTargets.revenueTarget = data.targetValue;
       });
       setTargets(userTargets);
       setTargetForm(userTargets);
    });

    const unS = onSnapshot(query(collection(db, 'service_reports'), where('tenantId', '==', userData.tenantId)), (snap) => {
       setServices(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    if (isHighLevel) {
      const unF = onSnapshot(query(collection(db, 'financial_reports'), where('tenantId', '==', userData.tenantId)), (snap) => {
         setFinancials(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      return () => { unT(); unS(); unF(); };
    }

    return () => { unT(); unS(); };
  }, [userData, isHighLevel]);

  const handleSaveTarget = async (name: string, value: number) => {
    if (!userData?.tenantId) return;
    const q = query(collection(db, 'kpi_targets'), where('tenantId', '==', userData.tenantId), where('name', '==', name));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, 'kpi_targets', snap.docs[0].id), { targetValue: value, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'kpi_targets'), {
        name, period: 'Global', targetValue: value, unit: '', tenantId: userData.tenantId, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    }
  };

  const handleSaveAllTargets = async () => {
    await handleSaveTarget('activeCells', Number(targetForm.activeCells));
    await handleSaveTarget('attendanceAvg', Number(targetForm.attendanceAvg));
    await handleSaveTarget('visitorsTarget', Number(targetForm.visitorsTarget));
    await handleSaveTarget('revenueTarget', Number(targetForm.revenueTarget));
    setActiveModal(null);
  };

  const handleAddService = async () => {
    if (!userData?.tenantId) return;
    await addDoc(collection(db, 'service_reports'), {
       serviceName: serviceForm.name || 'Culto Geral',
       date: serviceForm.date || new Date().toISOString().split('T')[0],
       attendanceActual: Number(serviceForm.actual),
       attendanceTarget: Number(serviceForm.target),
       visitorsActual: Number(serviceForm.visActual),
       visitorsTarget: Number(serviceForm.visTarget),
       tenantId: userData.tenantId,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp()
    });
    setServiceForm({ name: '', date: '', actual: 0, target: 0, visActual: 0, visTarget: 0 });
    setActiveModal(null);
  };

  const handleAddFinance = async () => {
    if (!userData?.tenantId) return;
    await addDoc(collection(db, 'financial_reports'), {
       title: financeForm.title || 'Dízimos e Ofertas',
       date: financeForm.date || new Date().toISOString().split('T')[0],
       amount: Number(financeForm.amount),
       target: Number(financeForm.target),
       tenantId: userData.tenantId,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp()
    });
    setFinanceForm({ title: '', date: '', amount: 0, target: 0 });
    setActiveModal(null);
  };

  // Real data calculations
  const totalFinancial = financials.reduce((acc, curr) => acc + curr.amount, 0);
  const totalVisitors = services.reduce((acc, curr) => acc + curr.visitorsActual, 0);
  const maxAttendance = services.length > 0 ? Math.max(...services.map(s => s.attendanceActual)) : 80; // dummy fallback
  const cellMocks = 84; 

  // Compute Chart Data based on actual entries
  const chartDataMap: Record<string, any> = {
    'Jan': { month: 'Jan', cellules: 78, revenue: 0, visitors: 0 },
    'Fev': { month: 'Fev', cellules: 80, revenue: 0, visitors: 0 },
    'Mar': { month: 'Mar', cellules: 82, revenue: 0, visitors: 0 },
    'Abr': { month: 'Abr', cellules: 84, revenue: 0, visitors: 0 },
    'Mai': { month: 'Mai', cellules: 86, revenue: 0, visitors: 0 },
    'Jun': { month: 'Jun', cellules: 88, revenue: 0, visitors: 0 },
    'Jul': { month: 'Jul', cellules: 90, revenue: 0, visitors: 0 },
    'Ago': { month: 'Ago', cellules: 92, revenue: 0, visitors: 0 },
    'Set': { month: 'Set', cellules: 95, revenue: 0, visitors: 0 },
    'Out': { month: 'Out', cellules: 98, revenue: 0, visitors: 0 },
    'Nov': { month: 'Nov', cellules: 100, revenue: 0, visitors: 0 },
    'Dez': { month: 'Dez', cellules: 105, revenue: 0, visitors: 0 }
  };

  const getMonthStr = (dateStr: string) => {
    if (!dateStr) return 'Jan';
    const parts = dateStr.split('-');
    if (parts.length < 2) return 'Jan';
    const m = parts[1];
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return months[parseInt(m, 10)-1] || 'Jan';
  };

  financials.forEach(f => {
    const m = getMonthStr(f.date);
    if (chartDataMap[m]) chartDataMap[m].revenue += f.amount;
  });

  services.forEach(s => {
    const m = getMonthStr(s.date);
    if (chartDataMap[m]) chartDataMap[m].visitors += s.visitorsActual;
  });

  // Convert to array and slice up to current month or show everything
  const computedAnalyticsData = Object.values(chartDataMap);

  return (
    <div className="space-y-6">
      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 p-6 rounded-2xl shadow-2xl space-y-6"
            >
              {activeModal === 'targets' && (
                <>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5"/> Ajustar Metas Globais</h3>
                    <Button variant="ghost" size="icon" onClick={() => setActiveModal(null)}><X className="w-5 h-5"/></Button>
                  </div>
                  <div className="space-y-4">
                    <div><label className="text-xs text-white/60 uppercase">Meta Células Ativas</label><Input type="number" value={targetForm.activeCells} onChange={e => setTargetForm({...targetForm, activeCells: e.target.value as any})} className="bg-zinc-900"/></div>
                    <div><label className="text-xs text-white/60 uppercase">Média Pessoas (Cultos)</label><Input type="number" value={targetForm.attendanceAvg} onChange={e => setTargetForm({...targetForm, attendanceAvg: e.target.value as any})} className="bg-zinc-900"/></div>
                    <div><label className="text-xs text-white/60 uppercase">Meta Novos Visitantes (Mês)</label><Input type="number" value={targetForm.visitorsTarget} onChange={e => setTargetForm({...targetForm, visitorsTarget: e.target.value as any})} className="bg-zinc-900"/></div>
                    {isHighLevel && (
                      <div><label className="text-xs text-white/60 uppercase">Meta Financeira (R$)</label><Input type="number" value={targetForm.revenueTarget} onChange={e => setTargetForm({...targetForm, revenueTarget: e.target.value as any})} className="bg-zinc-900"/></div>
                    )}
                  </div>
                  <Button className="w-full bg-primary text-black font-bold" onClick={handleSaveAllTargets}>Salvar Metas</Button>
                </>
              )}

              {activeModal === 'service' && (
                <>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Activity className="w-5 h-5"/> Lançar Relatório de Culto</h3>
                    <Button variant="ghost" size="icon" onClick={() => setActiveModal(null)}><X className="w-5 h-5"/></Button>
                  </div>
                  <div className="space-y-4 grid grid-cols-2 gap-4">
                    <div className="col-span-2"><label className="text-xs text-white/60">Data Referência</label><Input type="date" value={serviceForm.date} onChange={e => setServiceForm({...serviceForm, date: e.target.value})} className="bg-zinc-900"/></div>
                    <div className="col-span-2"><label className="text-xs text-white/60">Unidade/Horário (Ex: Sede 10h)</label><Input value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} className="bg-zinc-900"/></div>
                    
                    <div><label className="text-xs text-white/60">Presentes (Realizado)</label><Input type="number" value={serviceForm.actual} onChange={e => setServiceForm({...serviceForm, actual: e.target.value as any})} className="bg-zinc-900"/></div>
                    <div><label className="text-xs text-white/60">Presentes (Meta)</label><Input type="number" value={serviceForm.target} onChange={e => setServiceForm({...serviceForm, target: e.target.value as any})} className="bg-zinc-900"/></div>
                    
                    <div><label className="text-xs text-white/60">Visitantes (Realizado)</label><Input type="number" value={serviceForm.visActual} onChange={e => setServiceForm({...serviceForm, visActual: e.target.value as any})} className="bg-zinc-900"/></div>
                    <div><label className="text-xs text-white/60">Visitantes (Meta)</label><Input type="number" value={serviceForm.visTarget} onChange={e => setServiceForm({...serviceForm, visTarget: e.target.value as any})} className="bg-zinc-900"/></div>
                  </div>
                  <Button className="w-full bg-primary text-black font-bold mt-4" onClick={handleAddService}>Registrar Culto</Button>
                  
                  <div className="mt-6 border-t border-white/10 pt-4">
                     <h4 className="text-sm font-bold mb-3 text-white/60">Histórico de Cultos</h4>
                     <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                       {services.sort((a,b) => b.date.localeCompare(a.date)).map(s => (
                         <div key={s.id} className="text-xs bg-white/5 p-2 rounded flex justify-between">
                            <div><span className="font-bold text-white">{s.date}</span> - {s.name}</div>
                            <div className="text-right text-white/60">Pres: {s.attendanceActual}/{s.attendanceTarget} | Vis: {s.visitorsActual}</div>
                         </div>
                       ))}
                       {services.length === 0 && <p className="text-xs text-white/40">Nenhum culto registrado.</p>}
                     </div>
                  </div>
                </>
              )}

              {activeModal === 'financial' && (
                <>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><DollarSign className="w-5 h-5"/> Lançar Arrecadação</h3>
                    <Button variant="ghost" size="icon" onClick={() => setActiveModal(null)}><X className="w-5 h-5"/></Button>
                  </div>
                  <div className="space-y-4">
                    <div><label className="text-xs text-white/60">Data Fechamento</label><Input type="date" value={financeForm.date} onChange={e => setFinanceForm({...financeForm, date: e.target.value})} className="bg-zinc-900"/></div>
                    <div><label className="text-xs text-white/60">Título / Origem</label><Input placeholder="Ex: Dízimos Domingo" value={financeForm.title} onChange={e => setFinanceForm({...financeForm, title: e.target.value})} className="bg-zinc-900"/></div>
                    <div><label className="text-xs text-white/60">Arrecadação R$ (Realizado)</label><Input type="number" value={financeForm.amount} onChange={e => setFinanceForm({...financeForm, amount: e.target.value as any})} className="bg-zinc-900"/></div>
                    <div><label className="text-xs text-white/60">Meta Período R$</label><Input type="number" value={financeForm.target} onChange={e => setFinanceForm({...financeForm, target: e.target.value as any})} className="bg-zinc-900"/></div>
                  </div>
                  <Button className="w-full bg-primary text-black font-bold mt-4" onClick={handleAddFinance}>Registrar Conta</Button>
                  
                  <div className="mt-6 border-t border-white/10 pt-4">
                     <h4 className="text-sm font-bold mb-3 text-white/60">Histórico de Receitas</h4>
                     <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                       {financials.sort((a,b) => b.date.localeCompare(a.date)).map(f => (
                         <div key={f.id} className="text-xs bg-white/5 p-2 rounded flex justify-between items-center">
                            <div><span className="font-bold text-white">{f.date}</span> - {f.title}</div>
                            <div className="text-right text-green-400 font-bold">R$ {f.amount.toFixed(2).replace('.', ',')}</div>
                         </div>
                       ))}
                       {financials.length === 0 && <p className="text-xs text-white/40">Nenhuma receita registrada.</p>}
                     </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { id: 'cells', label: "Células Ativas", value: cellMocks.toString(), meta: `Meta: ${targets.activeCells}`, progress: Math.min((cellMocks/targets.activeCells)*100, 100).toFixed(0), color: "text-primary", icon: Activity, action: () => setActiveModal('targets') },
          { id: 'attendance', label: "Frequência Cultos Máx", value: maxAttendance.toString(), meta: `Meta Avg: ${targets.attendanceAvg}`, progress: Math.min((maxAttendance/targets.attendanceAvg)*100, 100).toFixed(0), color: "text-secondary", icon: Users, action: () => setActiveModal('service') },
          { id: 'visitors', label: "Novos Visitantes", value: totalVisitors.toString(), meta: `Meta: ${targets.visitorsTarget}`, progress: targets.visitorsTarget ? Math.min((totalVisitors/targets.visitorsTarget)*100, 100).toFixed(0) : 0, color: "text-primary", icon: TrendingUp, action: () => setActiveModal('service') },
          { id: 'finance', label: "Receita (Dízimos/Off)", value: `R$ ${(totalFinancial/1000).toFixed(1)}k`, meta: `Meta: R$ ${(targets.revenueTarget/1000).toFixed(1)}k`, progress: targets.revenueTarget ? Math.min((totalFinancial/targets.revenueTarget)*100, 100).toFixed(0) : 0, color: "text-secondary", icon: DollarSign, action: () => setActiveModal('financial') },
        ].filter(kpi => kpi.id !== 'finance' || isHighLevel).map((kpi, i) => (
          <Card key={i} className="bg-zinc-900 border-white/10 relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-all" onClick={kpi.action}>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-1 group-hover:text-primary transition-colors">
                  {kpi.label}
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <kpi.icon className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-3xl font-black tracking-tight">{kpi.value}</h3>
              <div className="space-y-1 relative z-10">
                <div className="h-1 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${kpi.progress}%` }} />
                </div>
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="text-white/40">{kpi.meta}</span>
                  {Number(kpi.progress) < 100 && <span className="text-white/20">{kpi.progress}% atingido</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Analytics Chart */}
        <Card className="lg:col-span-2 bg-zinc-900 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Crescimento Integrado</CardTitle>
                <CardDescription>Células vs. Receita vs. Visitantes (2026)</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/50 text-primary">Q1 2026</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <AreaChart data={computedAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="month" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                {isHighLevel && <YAxis yAxisId="left" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value / 1000}k`} />}
                <YAxis yAxisId={isHighLevel ? "right" : "left"} orientation={isHighLevel ? "right" : "left"} stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                {isHighLevel && <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#eab308" fillOpacity={1} fill="url(#colorRevenue)" name="Receita (R$)" />}
                <Area yAxisId={isHighLevel ? "right" : "left"} type="monotone" dataKey="cellules" stroke="#22c55e" fillOpacity={1} fill="url(#colorCell)" name="Células" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actionable Alerts & Health */}
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-white/10 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Saúde da Liderança</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              {[
                { label: "Supervisores Engajados", value: "85%", color: "bg-green-500" },
                { label: "Meta de Multiplicação", value: "40%", color: "bg-red-500" },
                { label: "Retenção de Visitantes", value: "65%", color: "bg-yellow-500" },
              ].map((metric, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80 font-medium">{metric.label}</span>
                    <span className="font-bold">{metric.value}</span>
                  </div>
                  <div className="h-2 bg-black rounded-full overflow-hidden">
                    <div className={`h-full ${metric.color}`} style={{ width: metric.value }} />
                  </div>
                </div>
              ))}
              
              <div className="mt-auto pt-6">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-bold">Atenção Necessária</span>
                  </div>
                  <p className="text-xs text-white/60">
                    Setor B teve queda de 15% na frequência dos cultos neste mês. Sugere-se visita pastoral.
                  </p>
                  <Button size="sm" variant="outline" className="w-full mt-2 border-red-500/30 text-red-400 hover:bg-red-500/20">Agendar Reunião</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

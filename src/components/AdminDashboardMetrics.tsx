import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, TrendingUp, Users, DollarSign, Target, Settings, X, Plus, Database } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area } from 'recharts';
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { can } from "@/src/lib/permissions";

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
  const [kpiEntries, setKpiEntries] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [cellCount, setCellCount] = useState(0);

  // Form states
  const [financeForm, setFinanceForm] = useState({ title: '', date: '', amount: '', target: '', unit: '', category: '', project: '', receipt: '' });
  const [targetForm, setTargetForm] = useState({ activeCells: 0, attendanceAvg: 0, visitorsTarget: 0, revenueTarget: 0 });

  const [unitsList, setUnitsList] = useState<any[]>([]);

  const isHighLevel = can(userData, 'manage:finance');

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

    const unKpis = onSnapshot(query(collection(db, 'kpi_entries'), where('tenantId', '==', userData.tenantId)), (snap) => {
       setKpiEntries(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    const unC = onSnapshot(query(collection(db, 'cells'), where('tenantId', '==', userData.tenantId)), (snap) => {
       setCellCount(snap.size);
    });

    const unUnits = onSnapshot(query(collection(db, 'units'), where('tenantId', '==', userData.tenantId)), (snap) => {
       setUnitsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    if (isHighLevel) {
      const unF = onSnapshot(query(collection(db, 'financial_reports'), where('tenantId', '==', userData.tenantId)), (snap) => {
         setFinancials(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      return () => { unT(); unKpis(); unC(); unUnits(); unF(); };
    }

    return () => { unT(); unKpis(); unC(); unUnits(); };
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

  const handleAddFinance = async () => {
    if (!userData?.tenantId) return;
    await addDoc(collection(db, 'financial_reports'), {
       title: financeForm.title || `${financeForm.category || 'Receita'} - ${financeForm.unit || 'Geral'}`,
       date: financeForm.date || new Date().toISOString().split('T')[0],
       amount: Number(financeForm.amount),
       target: Number(financeForm.target) || 0,
       unit: financeForm.unit,
       category: financeForm.category,
       project: financeForm.project,
       receipt: financeForm.receipt,
       tenantId: userData.tenantId,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp()
    });
    setFinanceForm({ title: '', date: '', amount: '', target: '', unit: '', category: '', project: '', receipt: '' });
    setActiveModal(null);
  };

  const totalRevenue = financials.reduce((acc, f) => acc + f.amount, 0);
  const freqs = kpiEntries.filter(e => e.kpiName === 'kpi_frequencia_celebracoes');
  const totalAttendance = freqs.reduce((acc, curr) => acc + Number(curr.actualValue || 0), 0);
  const totalVisitors = freqs.reduce((acc, curr) => acc + Number(curr.visitors || 0), 0);
  const maxAttendance = freqs.length > 0 ? Math.max(...freqs.map(s => Number(s.actualValue || 0))) : 0;
  
  const activeCells = cellCount;
  const formatPercent = (value: number) => `${Math.round(Math.max(0, Math.min(value, 100)))}%`;
  const attendanceTargetRate = targets.attendanceAvg > 0 ? (totalAttendance / (freqs.length || 1) / targets.attendanceAvg) * 100 : 0;
  const multiplicationRate = targets.activeCells ? (activeCells / targets.activeCells) * 100 : 0;
  const visitorGoalRate = targets.visitorsTarget ? (totalVisitors / targets.visitorsTarget) * 100 : 0;
  
  const healthMetrics = [
    { label: "Frequencia vs Meta", value: formatPercent(attendanceTargetRate), color: attendanceTargetRate >= 80 ? "bg-green-500" : "bg-yellow-500" },
    { label: "Meta de Multiplicacao", value: formatPercent(multiplicationRate), color: multiplicationRate >= 70 ? "bg-green-500" : "bg-red-500" },
    { label: "Visitantes vs Meta", value: formatPercent(visitorGoalRate), color: visitorGoalRate >= 70 ? "bg-green-500" : "bg-yellow-500" },
  ];

  const chartDataMap: Record<string, any> = {
    'Jan': { month: 'Jan', membros: 0, revenue: 0, visitors: 0 },
    'Fev': { month: 'Fev', membros: 0, revenue: 0, visitors: 0 },
    'Mar': { month: 'Mar', membros: 0, revenue: 0, visitors: 0 },
    'Abr': { month: 'Abr', membros: 0, revenue: 0, visitors: 0 },
    'Mai': { month: 'Mai', membros: 0, revenue: 0, visitors: 0 },
    'Jun': { month: 'Jun', membros: 0, revenue: 0, visitors: 0 },
    'Jul': { month: 'Jul', membros: 0, revenue: 0, visitors: 0 },
    'Ago': { month: 'Ago', membros: 0, revenue: 0, visitors: 0 },
    'Set': { month: 'Set', membros: 0, revenue: 0, visitors: 0 },
    'Out': { month: 'Out', membros: 0, revenue: 0, visitors: 0 },
    'Nov': { month: 'Nov', membros: 0, revenue: 0, visitors: 0 },
    'Dez': { month: 'Dez', membros: 0, revenue: 0, visitors: 0 }
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

  freqs.forEach(s => {
    const m = getMonthStr(s.date);
    if (chartDataMap[m]) {
       chartDataMap[m].visitors += Number(s.visitors || 0);
       chartDataMap[m].membros += Number(s.actualValue || 0);
    }
  });

  const computedAnalyticsData = Object.values(chartDataMap);

  return (
    <div className="space-y-6">
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
                  <Button className="w-full bg-primary text-black font-bold mt-4" onClick={handleSaveAllTargets}>Salvar Metas Globais</Button>
                </>
              )}

              {activeModal === 'financial' && (
                <>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><DollarSign className="w-5 h-5"/> Lançar Arrecadação</h3>
                    <Button variant="ghost" size="icon" onClick={() => setActiveModal(null)}><X className="w-5 h-5"/></Button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                       <div><label className="text-xs text-white/60">Data Fechamento</label><Input type="date" value={financeForm.date} onChange={e => setFinanceForm({...financeForm, date: e.target.value})} className="bg-zinc-900"/></div>
                       <div>
                          <label className="text-xs text-white/60">Unidade Geradora</label>
                          <select value={financeForm.unit} onChange={e => setFinanceForm({...financeForm, unit: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-md p-2 text-sm text-white h-10 mt-1">
                             <option value="">Selecione...</option>
                             {unitsList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <div>
                          <label className="text-xs text-white/60">Categoria da Receita</label>
                          <Input list="financeCategories" placeholder="Ex: Dízimos" value={financeForm.category} onChange={e => setFinanceForm({...financeForm, category: e.target.value})} className="bg-zinc-900"/>
                          <datalist id="financeCategories">
                             <option value="Dízimos e Ofertas" />
                             <option value="Bazar" />
                             <option value="Livraria" />
                             <option value="Cantina" />
                             <option value="Eventos" />
                          </datalist>
                       </div>
                       <div>
                          <label className="text-xs text-white/60">Projeto / Destinação</label>
                          <Input list="financeProjects" placeholder="Ex: Caixa Geral" value={financeForm.project} onChange={e => setFinanceForm({...financeForm, project: e.target.value})} className="bg-zinc-900"/>
                          <datalist id="financeProjects">
                             <option value="Caixa Geral" />
                             <option value="Missões" />
                             <option value="Construção Boquira" />
                          </datalist>
                       </div>
                    </div>

                    <div><label className="text-xs text-white/60">Valor Arrecadado R$ (Realizado)</label><Input type="number" placeholder="0.00" value={financeForm.amount} onChange={e => setFinanceForm({...financeForm, amount: e.target.value as any})} className="bg-zinc-900 font-bold"/></div>
                    
                    <div className="grid grid-cols-2 gap-2">
                       <div><label className="text-xs text-white/60">Comprovante (Anexo ou Link)</label><Input type="text" placeholder="URL do arquivo..." value={financeForm.receipt} onChange={e => setFinanceForm({...financeForm, receipt: e.target.value})} className="bg-zinc-900"/></div>
                       <div><label className="text-xs text-white/60">Título (Opcional)</label><Input placeholder="Ex: Oferta Culto 10h" value={financeForm.title} onChange={e => setFinanceForm({...financeForm, title: e.target.value})} className="bg-zinc-900"/></div>
                    </div>
                  </div>
                  <Button className="w-full bg-primary text-black font-bold mt-4" onClick={handleAddFinance}>Registrar Conta</Button>
                  
                  <div className="mt-6 border-t border-white/10 pt-4">
                     <h4 className="text-sm font-bold mb-3 text-white/60">Histórico de Receitas</h4>
                     <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                         {financials.sort((a,b) => b.date.localeCompare(a.date)).map(f => (
                           <div key={f.id} className="text-xs bg-white/5 p-2 rounded flex justify-between items-center">
                              <div>
                                 <span className="font-bold text-white">{f.date}</span> - {f.title || f.category}
                                 {f.unit && <span className="text-white/40 block">Unidade: {f.unit} • Destino: {f.project}</span>}
                              </div>
                              <div className="text-right text-green-400 font-bold">R$ {Number(f.amount || 0).toFixed(2).replace('.', ',')}</div>
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
          { id: 'cells', label: "Células Ativas", value: activeCells.toString(), meta: `Meta: ${targets.activeCells}`, progress: targets.activeCells ? Math.min((activeCells/targets.activeCells)*100, 100).toFixed(0) : 0, color: "text-primary", icon: Target, action: () => setActiveModal('targets') },
          { id: 'attendance', label: "Frequência Cultos Máx", value: maxAttendance.toString(), meta: `Meta Avg: ${targets.attendanceAvg}`, progress: Math.min((maxAttendance/targets.attendanceAvg)*100, 100).toFixed(0), color: "text-secondary", icon: Users, action: () => {} },
          { id: 'visitors', label: "Novos Visitantes", value: totalVisitors.toString(), meta: `Meta: ${targets.visitorsTarget}`, progress: targets.visitorsTarget ? Math.min((totalVisitors/targets.visitorsTarget)*100, 100).toFixed(0) : 0, color: "text-primary", icon: TrendingUp, action: () => {} },
          { id: 'finance', label: "Receita (Dízimos/Off)", value: `R$ ${(totalRevenue/1000).toFixed(1)}k`, meta: `Meta: R$ ${(targets.revenueTarget/1000).toFixed(1)}k`, progress: targets.revenueTarget ? Math.min((totalRevenue/targets.revenueTarget)*100, 100).toFixed(0) : 0, color: "text-secondary", icon: DollarSign, action: () => setActiveModal('financial') },
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
                <CardTitle className="text-xl font-black">Acompanhamento Integrado</CardTitle>
                <CardDescription>Membros vs. Receitas vs. Visitantes (2026)</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/50 text-primary">Q1 2026</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="99%" height={300}>
              <AreaChart data={computedAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMembros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
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
                <Area yAxisId={isHighLevel ? "right" : "left"} type="monotone" dataKey="membros" stroke="#22c55e" fillOpacity={1} fill="url(#colorMembros)" name="Membros" />
                <Area yAxisId={isHighLevel ? "right" : "left"} type="monotone" dataKey="visitors" stroke="#06b6d4" fillOpacity={1} fill="url(#colorVisitors)" name="Visitantes" />
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
              {healthMetrics.map((metric, i) => (
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

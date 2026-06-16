import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Edit, Target, TrendingUp, Calendar, Trash2, LineChart, Activity } from 'lucide-react';
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, deleteDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, startOfYear, getWeek, formatISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCrossModuleMetrics } from '@/src/hooks/useCrossModuleMetrics';

export function AdminStrategicGoals({ userData }: { userData?: any }) {
  const [kpis, setKpis] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  
  // Drill-down Modal State
  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  
  // Filters and Controls
  const [timeView, setTimeView] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [monthsRange, setMonthsRange] = useState<number>(12); // Custom range filter
  const [filterUnit, setFilterUnit] = useState<string>('Todas');

  // Cross Module Hook
  const { virtualKpis, virtualEntries, loading: virtualLoading } = useCrossModuleMetrics(userData?.tenantId, monthsRange);
  
  // Combine native and virtual data
  const combinedKpis = useMemo(() => [...kpis, ...virtualKpis], [kpis, virtualKpis]);
  const combinedEntries = useMemo(() => [...entries, ...virtualEntries], [entries, virtualEntries]);

  // Custom Aggregation toggles per KPI (stored in state for session)
  const [kpiAggregations, setKpiAggregations] = useState<Record<string, 'sum' | 'avg' | 'last'>>({
     'kpi_celulas': 'last',
     'kpi_batismos': 'sum',
     'kpi_freq_sede': 'avg',
     'kpi_freq_norte': 'avg',
     'kpi_freq_br': 'avg',
     'kpi_total_celebracoes': 'avg',
     'kpi_freq_celulas': 'avg',
     'kpi_lideres': 'last',
     'kpi_virt_celulas_freq': 'avg',
     'kpi_virt_celulas_vis': 'sum',
     'kpi_virt_escola_ide_ativos': 'sum',
     'kpi_virt_pastoral_atendimentos': 'sum',
     'kpi_virt_social_atendimentos': 'sum'
  });

  // Form State for new entry
  const [entryDate, setEntryDate] = useState<string>(formatISO(new Date(), { representation: 'date' }));
  const [entryValue, setEntryValue] = useState<string>('');
  const [entryUnit, setEntryUnit] = useState<string>('Sede');
  const [entryTime, setEntryTime] = useState<string>('18h');
  const [entryVisitors, setEntryVisitors] = useState<string>('0');

  // Available units and times
  const [unitsList, setUnitsList] = useState<any[]>([]);

  // When unit changes, parse serviceTimes to get available times for that unit
  useEffect(() => {
     const unit = unitsList.find(u => u.name === entryUnit);
     if (unit && unit.serviceTimes) {
        // Extract times like "10h", "18:00", etc
        const times = unit.serviceTimes.match(/\b(?:[01]?\d|2[0-3])(?:h|:\d{2})\b/gi);
        if (times && times.length > 0) {
           setEntryTime(times[0]);
        } else {
           setEntryTime('Culto Único');
        }
     }
  }, [entryUnit, unitsList]);

  // Social Override State
  const [socialMode, setSocialMode] = useState<'auto'|'manual'>('auto');
  const [socialDate, setSocialDate] = useState<string>(formatISO(new Date(), { representation: 'date' }));
  const [socialPaid, setSocialPaid] = useState<string>('0');
  const [socialFree, setSocialFree] = useState<string>('0');
  const [socialNotes, setSocialNotes] = useState<string>('');

  useEffect(() => {
    if (!userData?.tenantId) return;
    // Fetch KPI Definitions
    const qKpi = query(collection(db, 'kpi_goals'), where('tenantId', '==', userData.tenantId));
    const unKpi = onSnapshot(qKpi, (snap) => setKpis(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Fetch KPI Entries
    const qEntries = query(collection(db, 'kpi_entries'), where('tenantId', '==', userData.tenantId));
    const unEntries = onSnapshot(qEntries, (snap) => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Fetch Units
    const qUnits = query(collection(db, 'units'), where('tenantId', '==', userData.tenantId));
    const unUnits = onSnapshot(qUnits, (snap) => {
       const list = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
       if (list.length === 0) {
          // Fallback
          setUnitsList([{ name: 'Coroado Sede', serviceTimes: '10h, 18h, 20h' }, { name: 'Coroado Norte', serviceTimes: '19h' }]);
       } else {
          setUnitsList(list);
       }
    });

    return () => { unKpi(); unEntries(); unUnits(); }
  }, [userData?.tenantId]);

  // Derived KPIs Calculation (Total Celebrações)
  const computedKpis = useMemo(() => {
     let list = combinedKpis.filter(k => !['kpi_freq_sede', 'kpi_freq_norte', 'kpi_freq_br'].includes(k.id));
     const order = [
       'kpi_celulas', 'kpi_batismos', 'kpi_frequencia_celebracoes', 
       'kpi_virt_celulas_freq', 'kpi_virt_celulas_vis', 'kpi_virt_escola_ide_ativos',
       'kpi_virt_pastoral_atendimentos', 'kpi_virt_social_atendimentos',
       'kpi_freq_celulas', 'kpi_lideres'
     ];
     
     // Add pseudo-KPI for Frequência Integrada
     list.push({
        id: 'kpi_frequencia_celebracoes',
        title: 'Frequência nas Celebrações',
        pillar: 'Crescer',
        targetData: {
           2025: 430, 2026: 552, 2027: 617, 2028: 678.5, 2029: 746.85, 2030: 821, 2031: 903
        },
        color: 'border-blue-500',
        isDerived: false
     });

     return list.sort((a,b) => {
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);
        return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
     });
  }, [combinedKpis]);

  // Engine: Group and aggregate entries for a KPI
  const getAggregatedData = (kpiId: string) => {
     let relevantEntries = [];
     if (kpiId === 'kpi_frequencia_celebracoes') {
         // Gather the new combined kpi entries AND the old legacy entries for backwards compatibility
         relevantEntries = combinedEntries.filter(e => ['kpi_frequencia_celebracoes', 'kpi_freq_sede', 'kpi_freq_norte', 'kpi_freq_br'].includes(e.kpiName));
     } else {
         relevantEntries = combinedEntries.filter(e => e.kpiName === kpiId);
     }

     if (filterUnit !== 'Todas') {
         relevantEntries = relevantEntries.filter(e => e.unit === filterUnit || (e.kpiName.includes('sede') && filterUnit.includes('Sede')) || (e.kpiName.includes('norte') && filterUnit.includes('Norte')));
     }

     const aggType = kpiAggregations[kpiId] || 'sum';

     // Group by TimeView
     const grouped: Record<string, number[]> = {};

     relevantEntries.forEach(entry => {
         const date = parseISO(entry.date);
         let key = '';
         if (timeView === 'weekly') {
             key = format(date, 'yyyy-MM-dd');
         } else if (timeView === 'monthly') {
             key = format(date, 'yyyy-MM');
         } else {
             key = format(date, 'yyyy');
         }
         
         if (!grouped[key]) grouped[key] = [];
         
         // Combine actualValue and visitors for the total count
         const totalFreq = Number(entry.actualValue || 0) + Number(entry.visitors || 0) + Number(entry.kids || 0) + Number(entry.teens || 0) + Number(entry.servants || 0);
         
         if (entry.kpiName === 'kpi_virt_social_atendimentos' && entry.isOverride) {
             // For social overrides, we sum pagods + free
             grouped[key].push(Number(entry.socialPaid || 0) + Number(entry.socialFree || 0));
         } else {
             grouped[key].push(totalFreq);
         }
     });

     const chartData = Object.keys(grouped).sort((a,b) => {
        return a.localeCompare(b);
     }).map(key => {
         const vals = grouped[key];
         let val = 0;
         if (aggType === 'sum') val = vals.reduce((acc, v) => acc + v, 0);
         else if (aggType === 'avg') val = Math.round(vals.reduce((acc, v) => acc + v, 0) / vals.length);
         else if (aggType === 'last') val = vals[vals.length - 1];

         let displayKey = key;
         if (timeView === 'weekly') displayKey = format(parseISO(key), 'dd/MM/yyyy');
         else if (timeView === 'monthly') displayKey = format(parseISO(key + '-01'), 'MMM yyyy', { locale: ptBR });

         return { name: displayKey, Realizado: val, originalKey: key };
     });

     // Fill targets if view is Yearly
     const kpiDef = computedKpis.find(k => k.id === kpiId);
     if (timeView === 'yearly' && kpiDef && kpiDef.targetData) {
         chartData.forEach(d => {
             d.Expectativa = kpiDef.targetData[Number(d.name)] || 0;
         });
         [2025, 2026, 2027, 2028, 2029, 2030, 2031].forEach(y => {
             if (!chartData.find(d => d.name === y.toString())) {
                 chartData.push({ name: y.toString(), Realizado: null, Expectativa: kpiDef.targetData[y] || 0 });
             }
         });
         chartData.sort((a,b) => a.name.localeCompare(b.name));
     }

     return chartData;
  };

  const [entryKids, setEntryKids] = useState<string>('0');
  const [entryTeens, setEntryTeens] = useState<string>('0');
  const [entryServants, setEntryServants] = useState<string>('0');

  const handleAddEntry = async () => {
    if (!userData?.tenantId || !selectedKpi) return;
    
    // Virtual block but overriding
    if (selectedKpi.id === 'kpi_virt_social_atendimentos' && socialMode === 'manual') {
       if (!socialDate) return;
       await addDoc(collection(db, 'kpi_entries'), {
         kpiName: selectedKpi.id,
         date: socialDate,
         isOverride: true,
         socialPaid: Number(socialPaid),
         socialFree: Number(socialFree),
         notes: socialNotes,
         actualValue: Number(socialPaid) + Number(socialFree),
         tenantId: userData.tenantId,
         createdAt: serverTimestamp()
       });
       setSocialPaid('0'); setSocialFree('0'); setSocialNotes('');
       return;
    }

    if (selectedKpi.isDerived || selectedKpi.isVirtual) return;

    const val = Number(entryValue);
    if (isNaN(val) || !entryDate) return;

    const payload: any = {
      kpiName: selectedKpi.id,
      actualValue: val,
      date: entryDate,
      tenantId: userData.tenantId,
      createdAt: serverTimestamp()
    };

    if (selectedKpi.id === 'kpi_frequencia_celebracoes') {
       payload.unit = entryUnit;
       payload.serviceTime = entryTime;
       payload.visitors = Number(entryVisitors) || 0;
       payload.kids = Number(entryKids) || 0;
       payload.teens = Number(entryTeens) || 0;
       payload.servants = Number(entryServants) || 0;
       // We can store actualValue as the adults/base
       payload.actualValue = val;
    }

    await addDoc(collection(db, 'kpi_entries'), payload);

    setEntryValue('');
    if (selectedKpi.id === 'kpi_frequencia_celebracoes') {
       setEntryVisitors('0');
       setEntryKids('0');
       setEntryTeens('0');
       setEntryServants('0');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm("Deseja excluir este registro?")) {
       await deleteDoc(doc(db, 'kpi_entries', entryId));
    }
  };

  const renderChart = (kpi: any, height = 160) => {
     const data = getAggregatedData(kpi.id);
     const isDerived = kpi.isDerived;
     const colorBase = isDerived ? '#ffffff' : (kpi.color.includes('blue') ? '#3b82f6' : kpi.color.includes('cyan') ? '#06b6d4' : kpi.color.includes('orange') ? '#f97316' : kpi.color.includes('yellow') ? '#eab308' : kpi.color.includes('green') ? '#22c55e' : kpi.color.includes('purple') ? '#a855f7' : '#ec4899');

     return (
        <div style={{ height: `${height}px` }} className="w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {timeView === 'yearly' ? (
              <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`colorTarget-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id={`colorActual-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorBase} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={colorBase} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="Expectativa" stroke="#ffffff40" strokeDasharray="3 3" fillOpacity={1} fill={`url(#colorTarget-${kpi.id})`} />
                <Area type="monotone" dataKey="Realizado" stroke={colorBase} strokeWidth={3} fillOpacity={1} fill={`url(#colorActual-${kpi.id})`} connectNulls={true} />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20', borderRadius: '8px' }} cursor={{fill: '#ffffff10'}} />
                <Bar dataKey="Realizado" fill={colorBase} radius={[4,4,0,0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {selectedKpi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedKpi(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl">
                <div>
                  <h3 className="text-2xl font-black flex items-center gap-2 text-white">{selectedKpi.title}</h3>
                  <p className="text-white/60 text-sm mt-1">Visão detalhada e histórico de registros</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedKpi(null)}><X className="w-6 h-6"/></Button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Left Column: Chart & Aggregation */}
                 <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                       <div className="flex space-x-1">
                         <Button size="sm" variant={timeView === 'weekly' ? 'default' : 'ghost'} onClick={() => setTimeView('weekly')}>Semanal</Button>
                         <Button size="sm" variant={timeView === 'monthly' ? 'default' : 'ghost'} onClick={() => setTimeView('monthly')}>Mensal</Button>
                         <Button size="sm" variant={timeView === 'yearly' ? 'default' : 'ghost'} onClick={() => setTimeView('yearly')}>Anual</Button>
                       </div>
                       
                       <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40">Cálculo:</span>
                          <select 
                            className="bg-black border border-white/10 text-xs rounded p-1 text-white"
                            value={kpiAggregations[selectedKpi.id] || 'sum'}
                            onChange={(e: any) => setKpiAggregations({...kpiAggregations, [selectedKpi.id]: e.target.value})}
                          >
                            <option value="sum">Soma Acumulada</option>
                            <option value="avg">Média do Período</option>
                            <option value="last">Último Registro</option>
                          </select>
                       </div>
                    </div>

                    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                       <h4 className="text-sm font-bold text-white/40 mb-4 uppercase tracking-wider flex items-center gap-2">
                         <LineChart className="w-4 h-4"/> Evolução Gráfica
                       </h4>
                       {renderChart(selectedKpi, 300)}
                    </div>
                 </div>

                 {/* Right Column: Entry Form & History */}
                 <div className="space-y-6">
                    {/* Social Override Form */}
                    {selectedKpi.id === 'kpi_virt_social_atendimentos' && (
                      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-4">
                         <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                              <Plus className="w-4 h-4"/> Lançamento Social
                            </h4>
                            <div className="flex bg-black/50 rounded-lg p-1">
                               <button onClick={() => setSocialMode('auto')} className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${socialMode === 'auto' ? 'bg-primary text-black' : 'text-white/40'}`}>Automático</button>
                               <button onClick={() => setSocialMode('manual')} className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${socialMode === 'manual' ? 'bg-primary text-black' : 'text-white/40'}`}>Manual</button>
                            </div>
                         </div>
                         {socialMode === 'manual' ? (
                            <div className="space-y-3">
                               <div>
                                  <label className="text-xs font-bold text-white/60">Data Ref.</label>
                                  <Input type="date" value={socialDate} onChange={e => setSocialDate(e.target.value)} className="bg-black border-white/10 mt-1 h-9" />
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                  <div>
                                     <label className="text-xs font-bold text-white/60">Pagos</label>
                                     <Input type="number" placeholder="Ex: 97" value={socialPaid} onChange={e => setSocialPaid(e.target.value)} className="bg-black border-white/10 mt-1 h-9 font-black" />
                                  </div>
                                  <div>
                                     <label className="text-xs font-bold text-white/60">Gratuitos/Subsidiados</label>
                                     <Input type="number" placeholder="Ex: 6" value={socialFree} onChange={e => setSocialFree(e.target.value)} className="bg-black border-white/10 mt-1 h-9 font-black" />
                                  </div>
                               </div>
                               <div>
                                  <label className="text-xs font-bold text-white/60">Observações</label>
                                  <textarea value={socialNotes} onChange={e => setSocialNotes(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white mt-1 h-16 custom-scrollbar focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Justificativa..."></textarea>
                               </div>
                               <Button className="w-full bg-primary text-black font-bold h-9" onClick={handleAddEntry}>Lançar Dados (Override)</Button>
                            </div>
                         ) : (
                            <p className="text-xs text-white/50 mb-2">Os dados sociais estão sendo extraídos automaticamente do módulo de Cuidado. Mude para "Manual" caso precise corrigir ou lançar um valor consolidado antigo.</p>
                         )}
                      </div>
                    )}

                    {(!selectedKpi.isDerived && !selectedKpi.isVirtual && selectedKpi.id !== 'kpi_virt_social_atendimentos') && (
                      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-4">
                         <h4 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                           <Plus className="w-4 h-4"/> Novo Lançamento
                         </h4>
                         <div className="space-y-3">
                            <div>
                               <label className="text-xs font-bold text-white/60">Data Ref.</label>
                               <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="bg-black border-white/10 mt-1 h-9" />
                            </div>
                            
                            {selectedKpi.id === 'kpi_frequencia_celebracoes' && (
                               <div className="grid grid-cols-2 gap-2">
                                  <div>
                                     <label className="text-xs font-bold text-white/60">Unidade</label>
                                     <select value={entryUnit} onChange={e => setEntryUnit(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white h-9 mt-1 focus:outline-none focus:ring-1 focus:ring-primary">
                                        {unitsList.map((u, i) => <option key={i} value={u.name}>{u.name}</option>)}
                                     </select>
                                  </div>
                                  <div>
                                     <label className="text-xs font-bold text-white/60">Reunião / Horário</label>
                                     <Input list="serviceTimesList" value={entryTime} onChange={e => setEntryTime(e.target.value)} className="bg-black border-white/10 mt-1 h-9" placeholder="Ex: 18h" />
                                     <datalist id="serviceTimesList">
                                        {unitsList.find(u => u.name === entryUnit)?.serviceTimes?.match(/\b(?:[01]?\d|2[0-3])(?:h|:\d{2})\b/gi)?.map((t: string) => <option key={t} value={t} />)}
                                        <option value="Culto Manhã" />
                                        <option value="Culto Único" />
                                        <option value="Ministério Kids" />
                                        <option value="Ministério Teens" />
                                     </datalist>
                                  </div>
                               </div>
                            )}

                            {selectedKpi.id === 'kpi_frequencia_celebracoes' ? (
                               <div className="grid grid-cols-2 gap-2">
                                  <div>
                                     <label className="text-xs font-bold text-white/60">Adultos (Base)</label>
                                     <Input type="number" placeholder="Ex: 15" value={entryValue} onChange={e => setEntryValue(e.target.value)} className="bg-black border-white/10 mt-1 h-9 font-black" />
                                  </div>
                                  <div>
                                     <label className="text-xs font-bold text-white/60">Visitantes</label>
                                     <Input type="number" placeholder="Ex: 5" value={entryVisitors} onChange={e => setEntryVisitors(e.target.value)} className="bg-black border-white/10 mt-1 h-9 font-black" />
                                  </div>
                                  <div>
                                     <label className="text-xs font-bold text-white/60">Kids</label>
                                     <Input type="number" placeholder="Ex: 0" value={entryKids} onChange={e => setEntryKids(e.target.value)} className="bg-black border-white/10 mt-1 h-9 font-black" />
                                  </div>
                                  <div>
                                     <label className="text-xs font-bold text-white/60">Teens</label>
                                     <Input type="number" placeholder="Ex: 0" value={entryTeens} onChange={e => setEntryTeens(e.target.value)} className="bg-black border-white/10 mt-1 h-9 font-black" />
                                  </div>
                                  <div className="col-span-2">
                                     <label className="text-xs font-bold text-white/60">Servos Escalados</label>
                                     <Input type="number" placeholder="Ex: 10" value={entryServants} onChange={e => setEntryServants(e.target.value)} className="bg-black border-white/10 mt-1 h-9 font-black" />
                                  </div>
                                  <div className="col-span-2 bg-black/50 border border-white/10 rounded-lg p-3 flex justify-between items-center mt-2">
                                     <span className="text-xs font-bold text-white/60 uppercase">Total Consolidado</span>
                                     <span className="text-lg font-black text-primary">{(Number(entryValue) || 0) + (Number(entryVisitors) || 0) + (Number(entryKids) || 0) + (Number(entryTeens) || 0) + (Number(entryServants) || 0)}</span>
                                  </div>
                               </div>
                            ) : (
                               <div>
                                  <label className="text-xs font-bold text-white/60">Valor Realizado</label>
                                  <Input type="number" placeholder="Ex: 15" value={entryValue} onChange={e => setEntryValue(e.target.value)} className="bg-black border-white/10 mt-1 h-9 font-black" />
                               </div>
                            )}

                            <Button className="w-full bg-primary text-black font-bold h-9" onClick={handleAddEntry}>Lançar Dados</Button>
                         </div>
                      </div>
                    )}

                    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex-1">
                       <h4 className="text-sm font-bold text-white/40 mb-4 uppercase tracking-wider flex items-center gap-2">
                         <Activity className="w-4 h-4"/> Histórico Bruto
                       </h4>
                       {selectedKpi.isVirtual && (
                         <p className="text-xs text-white/50 mb-2">Estes dados são extraídos automaticamente dos módulos da Plataforma e não podem ser excluídos por aqui.</p>
                       )}
                       <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                          {combinedEntries.filter(e => e.kpiName === selectedKpi.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                             <div key={e.id} className="flex justify-between items-center p-2 rounded bg-black/40 border border-white/5 hover:border-white/20 transition-colors group">
                                <div>
                                   <p className="text-xs font-bold text-white">{format(parseISO(e.date), 'dd/MM/yyyy')}</p>
                                   <p className="text-xs text-white/40">
                                       {e.actualValue} {e.isOverride ? '(Total Manual)' : 'registros'}
                                       {e.unit && ` • ${e.unit} (${e.serviceTime})`}
                                       {e.visitors !== undefined && ` • ${e.visitors} vis`}
                                       {e.kids !== undefined && ` • ${e.kids} kids`}
                                       {e.teens !== undefined && ` • ${e.teens} teens`}
                                       {e.servants !== undefined && ` • ${e.servants} servos`}
                                   </p>
                                </div>
                                {(!selectedKpi.isDerived && !selectedKpi.isVirtual) && (
                                   <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteEntry(e.id)}>
                                     <Trash2 className="w-3 h-3"/>
                                   </Button>
                                )}
                             </div>
                          ))}
                          {combinedEntries.filter(e => e.kpiName === selectedKpi.id).length === 0 && (
                             <p className="text-xs text-white/30 text-center py-4">Nenhum lançamento encontrado.</p>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold flex items-center gap-2">
             <TrendingUp className="w-6 h-6 text-primary"/> Inteligência & Metricas 360
             {virtualLoading && <span className="ml-2 text-xs text-primary animate-pulse font-normal">(Sincronizando Módulos...)</span>}
           </h2>
           <p className="text-sm text-white/60">Acompanhamento dos focos de avanço da igreja através de série temporal e coleta automática de outros módulos.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg border border-white/10">
              <select className="bg-zinc-900 text-sm text-white focus:outline-none pr-2 border-r border-white/10 mr-2" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
                 <option value="Todas" className="bg-zinc-900 text-white">Todas Unidades</option>
                 {unitsList.map((u, i) => <option key={i} value={u.name} className="bg-zinc-900 text-white">{u.name}</option>)}
              </select>
              <select className="bg-zinc-900 text-sm text-white focus:outline-none" value={monthsRange} onChange={(e) => setMonthsRange(Number(e.target.value))}>
                 <option value={1} className="bg-zinc-900 text-white">Último mês</option>
                 <option value={3} className="bg-zinc-900 text-white">Últimos 3 meses</option>
                 <option value={6} className="bg-zinc-900 text-white">Últimos 6 meses</option>
                 <option value={12} className="bg-zinc-900 text-white">Últimos 12 meses</option>
                 <option value={60}>Histórico Completo</option>
              </select>
           </div>
           <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg border border-white/10">
             <Button size="sm" variant={timeView === 'weekly' ? 'default' : 'ghost'} onClick={() => setTimeView('weekly')}>Semanal</Button>
             <Button size="sm" variant={timeView === 'monthly' ? 'default' : 'ghost'} onClick={() => setTimeView('monthly')}>Mensal</Button>
             <Button size="sm" variant={timeView === 'yearly' ? 'default' : 'ghost'} onClick={() => setTimeView('yearly')}>Anual</Button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {computedKpis.map((kpi, i) => {
          const chartData = getAggregatedData(kpi.id);
          const lastPoint = chartData[chartData.length - 1];
          const actual = lastPoint?.Realizado || 0;
          const target = timeView === 'yearly' ? (lastPoint?.Expectativa || 0) : null;
          
          return (
          <Card key={kpi.id} className={`bg-zinc-900/50 border border-white/10 border-t-4 ${kpi.color} cursor-pointer hover:bg-white/5 transition-all group lg:col-span-${kpi.id === 'kpi_frequencia_celebracoes' ? '2' : '1'}`} onClick={() => setSelectedKpi(kpi)}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                   <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{kpi.pillar}</p>
                   <CardTitle className="text-lg font-black mt-1 leading-tight group-hover:text-primary transition-colors">{kpi.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-end mt-2">
                   <div>
                      <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Status ({timeView})</p>
                      <div className="flex items-baseline gap-2">
                         <span className="text-3xl font-black text-white">{actual || '-'}</span>
                         {target && <span className="text-xs font-bold text-white/40">/ {target}</span>}
                      </div>
                   </div>
                </div>
                
                {renderChart(kpi, kpi.id === 'kpi_frequencia_celebracoes' ? 200 : 100)}
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  );
}


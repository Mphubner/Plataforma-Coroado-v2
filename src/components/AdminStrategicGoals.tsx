import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Edit, Target, TrendingUp, ChevronDown } from 'lucide-react';
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

export function AdminStrategicGoals({ userData }: { userData?: any }) {
  const [kpis, setKpis] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState<any>(null);
  
  // State for filling actual data
  const [actualYear, setActualYear] = useState<number>(new Date().getFullYear());
  const [actualValue, setActualValue] = useState<string>('');

  useEffect(() => {
    if (!userData?.tenantId) return;
    const q = query(collection(db, 'kpi_goals'), where('tenantId', '==', userData.tenantId));
    const un = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setKpis(data);
    });
    return () => un();
  }, [userData?.tenantId]);

  // Derived KPIs Calculation (Total Celebrações)
  const computedKpis = useMemo(() => {
     let list = [...kpis];
     const sede = list.find(k => k.id === 'kpi_freq_sede');
     const norte = list.find(k => k.id === 'kpi_freq_norte');
     const br = list.find(k => k.id === 'kpi_freq_br');

     if (sede && norte && br) {
        const totalTarget: any = {};
        const totalActual: any = {};
        const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031];
        
        years.forEach(y => {
           totalTarget[y] = (sede.targetData?.[y] || 0) + (norte.targetData?.[y] || 0) + (br.targetData?.[y] || 0);
           const sumActual = (sede.actualData?.[y] || 0) + (norte.actualData?.[y] || 0) + (br.actualData?.[y] || 0);
           if (sede.actualData?.[y] !== undefined || norte.actualData?.[y] !== undefined || br.actualData?.[y] !== undefined) {
             totalActual[y] = sumActual;
           }
        });

        list.push({
           id: 'kpi_total_celebracoes',
           title: 'TOTAL CELEBRAÇÕES (Soma Unidades)',
           pillar: 'Crescer',
           targetData: totalTarget,
           actualData: totalActual,
           color: 'border-white/50',
           isDerived: true
        });
     }
     
     // Sort to maintain order
     const order = ['kpi_celulas', 'kpi_batismos', 'kpi_freq_sede', 'kpi_freq_norte', 'kpi_freq_br', 'kpi_total_celebracoes', 'kpi_freq_celulas', 'kpi_lideres'];
     return list.sort((a,b) => {
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);
        return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
     });
  }, [kpis]);

  const handleSaveActual = async () => {
    if (!userData?.tenantId || !editingKpi || editingKpi.isDerived) return;
    const val = Number(actualValue);
    if (isNaN(val)) return;

    const newActualData = { ...(editingKpi.actualData || {}) };
    newActualData[actualYear] = val;

    await updateDoc(doc(db, 'kpi_goals', editingKpi.id), {
      actualData: newActualData,
      updatedAt: serverTimestamp()
    });

    setActualValue('');
    setShowModal(false);
    setEditingKpi(null);
  };

  const openEdit = (kpi: any) => {
    if (kpi.isDerived) return; // Cannot edit derived
    setEditingKpi(kpi);
    setActualYear(new Date().getFullYear());
    setActualValue(kpi.actualData?.[new Date().getFullYear()]?.toString() || '');
    setShowModal(true);
  };

  const renderChart = (kpi: any) => {
     const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031];
     const data = years.map(y => ({
        name: y.toString(),
        Realizado: kpi.actualData?.[y] !== undefined ? kpi.actualData[y] : null,
        Expectativa: kpi.targetData?.[y] || 0
     }));

     const currentYear = new Date().getFullYear();
     const isPositive = (kpi.actualData?.[currentYear] || 0) >= (kpi.targetData?.[currentYear] || 0);

     return (
        <div className="h-40 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`colorTarget-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id={`colorActual-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20', borderRadius: '8px' }}
                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="Expectativa" stroke="#ffffff40" strokeDasharray="3 3" fillOpacity={1} fill={`url(#colorTarget-${kpi.id})`} />
              <Area type="monotone" dataKey="Realizado" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill={`url(#colorActual-${kpi.id})`} connectNulls={true} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showModal && editingKpi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-zinc-950 border border-white/10 p-6 rounded-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5"/> Atualizar Realizado</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="w-5 h-5"/></Button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-white/60">Lançando dados para: <strong className="text-white">{editingKpi.title}</strong></p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Ano Referência</label>
                    <select 
                      value={actualYear} 
                      onChange={e => {
                         const y = Number(e.target.value);
                         setActualYear(y);
                         setActualValue(editingKpi.actualData?.[y]?.toString() || '');
                      }}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white h-10"
                    >
                      {[2025, 2026, 2027, 2028, 2029, 2030, 2031].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Valor Realizado</label>
                    <Input 
                      type="number" 
                      placeholder="Ex: 150" 
                      value={actualValue} 
                      onChange={e => setActualValue(e.target.value)} 
                      className="bg-zinc-900 border-white/10 text-xl font-black h-10"
                    />
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-lg flex justify-between items-center text-sm border border-white/5 mt-2">
                   <span className="text-white/60">Expectativa para {actualYear}:</span>
                   <span className="font-bold">{editingKpi.targetData?.[actualYear] || '-'}</span>
                </div>
                
                <Button className="w-full bg-primary text-black font-bold h-12 mt-4" onClick={handleSaveActual}>
                  Salvar Registro
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start">
        <div>
           <h2 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary"/> Metas & Evolução (2025-2031)</h2>
           <p className="text-sm text-white/60">Acompanhamento dos focos de avanço da igreja baseados nas expectativas de longo prazo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {computedKpis.map((kpi, i) => {
          const currentYear = new Date().getFullYear();
          const actual = kpi.actualData?.[currentYear];
          const target = kpi.targetData?.[currentYear];
          const hasActual = actual !== undefined;
          const percent = hasActual && target ? Math.round((actual / target) * 100) : 0;
          
          return (
          <Card key={kpi.id} className={`bg-zinc-900/50 border border-white/10 border-t-4 ${kpi.color} relative overflow-hidden`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                   <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{kpi.pillar}</p>
                   <CardTitle className="text-lg font-black mt-1 leading-tight">{kpi.title}</CardTitle>
                </div>
                {!kpi.isDerived && (
                   <Button size="icon" variant="ghost" className="h-8 w-8 text-white/40 hover:text-white" onClick={() => openEdit(kpi)}>
                     <Edit className="w-4 h-4" />
                   </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-end mt-2">
                   <div>
                      <p className="text-xs text-white/50 mb-1">Status {currentYear}</p>
                      <div className="flex items-baseline gap-2">
                         <span className="text-3xl font-black text-white">{hasActual ? actual : '-'}</span>
                         <span className="text-sm font-bold text-white/40">/ {target || '-'}</span>
                      </div>
                   </div>
                   {hasActual && (
                      <div className={`px-2 py-1 rounded-md text-xs font-bold ${percent >= 100 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                         {percent}%
                      </div>
                   )}
                </div>
                
                {renderChart(kpi)}
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  );
}


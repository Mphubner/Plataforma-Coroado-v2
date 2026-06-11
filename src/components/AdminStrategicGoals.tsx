import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Edit, Target, CheckCircle2 } from 'lucide-react';
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

export function AdminStrategicGoals({ userData }: { userData?: any }) {
  const [goals, setGoals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [goalEntries, setGoalEntries] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: '',
    pillar: 'Crescer',
    description: '',
    targetText: '',
    period: 'META LIDERANÇA',
    progress: 0,
    color: 'border-red-500/50'
  });

  const [campaignData, setCampaignData] = useState({
    title: 'Campanha Visão Boquira',
    desc: 'Acompanhamento Prático das Vilas Ribeirinhas.',
    raised: 11450,
    target: 15000,
    metrics: [
      { label: 'Cestas Básicas', value: '340', sub: 'Enviadas este semestre' },
      { label: 'Voluntários', value: '45', sub: 'Profissionais alocados' },
      { label: 'Próxima Viagem', value: '15 NOV', sub: 'Logística Aprovada' },
    ]
  });

  useEffect(() => {
    if (!userData?.tenantId) return;
    const q = query(collection(db, 'strategic_goals'), where('tenantId', '==', userData.tenantId));
    const un = onSnapshot(q, (snap) => {
      const g = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGoals(g);
    });
    return () => un();
  }, [userData?.tenantId]);

  useEffect(() => {
    if (!userData?.tenantId || !editingGoal?.id) {
       setGoalEntries([]);
       return;
    }
    const q = query(collection(db, 'kpi_entries'), where('tenantId', '==', userData.tenantId), where('kpiName', '==', editingGoal.id));
    const un = onSnapshot(q, (snap) => {
      setGoalEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => un();
  }, [userData?.tenantId, editingGoal?.id]);

  const handleSaveGoal = async () => {
    if (!userData?.tenantId) return;
    if (editingGoal) {
      await updateDoc(doc(db, 'strategic_goals', editingGoal.id), {
        title: form.title,
        pillar: form.pillar,
        description: form.description,
        targetText: form.targetText,
        period: form.period,
        progress: Number(form.progress),
        color: form.color,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'strategic_goals'), {
        title: form.title,
        pillar: form.pillar,
        description: form.description,
        targetText: form.targetText,
        period: form.period,
        progress: Number(form.progress),
        color: form.color,
        tenantId: userData.tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    setShowModal(false);
    setEditingGoal(null);
  };

  const openNew = () => {
    setForm({ title: '', pillar: 'Crescer', description: '', targetText: '', period: '', progress: 0, color: 'border-red-500/50' });
    setEditingGoal(null);
    setShowModal(true);
  };

  const openEdit = (g: any) => {
    setForm({ title: g.title, pillar: g.pillar, description: g.description, targetText: g.targetText, period: g.period, progress: g.progress, color: g.color });
    setEditingGoal(g);
    setShowModal(true);
  };

  const defaultMockGoals = [
    { title: "Crescer", desc: "Ganhar pessoas para Jesus", sub: "100.000 vidas", period: "META LIDERANÇA", color: "border-red-500/50", progress: 65 },
    { title: "Cuidar", desc: "Consolidar a nova vida em Cristo", sub: "Retenção de 85%", period: "CÉLULAS", color: "border-blue-500/50", progress: 80 },
    { title: "Consolidar", desc: "Discipulado cristão e maturidade", sub: "Formar 500 novos líderes", period: "ESCOLA IDE", color: "border-green-500/50", progress: 40 },
    { title: "Celebrar", desc: "Estatística de Cultos Saudáveis", sub: "4 mil pessoas/mês", period: "EVENTOS", color: "border-yellow-500/50", progress: 95 },
  ];

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-white/10 p-6 rounded-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5"/> {editingGoal ? 'Editar Meta' : 'Nova Meta Estratégica'}</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="w-5 h-5"/></Button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Pilar / Tema</label>
                    <Input placeholder="Ex: Crescer" value={form.pillar} onChange={e => setForm({...form, pillar: e.target.value})} className="bg-zinc-900"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Título da Meta</label>
                    <Input placeholder="Ex: Ganhar Pessoas" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="bg-zinc-900"/>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Descrição Ojetiva</label>
                  <Input placeholder="Ex: Plantar novas igrejas..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-zinc-900"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Valor Alvo (Texto)</label>
                    <Input placeholder="Ex: 100.000 Vidas" value={form.targetText} onChange={e => setForm({...form, targetText: e.target.value})} className="bg-zinc-900"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Prazo / Referência</label>
                    <Input placeholder="Ex: DEZ 2026" value={form.period} onChange={e => setForm({...form, period: e.target.value})} className="bg-zinc-900"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Progresso Atual (%)</label>
                    <Input type="number" min="0" max="100" value={form.progress} onChange={e => setForm({...form, progress: e.target.value as any})} className="bg-zinc-900"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Cor Destaque</label>
                    <Input placeholder="border-red-500/50" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="bg-zinc-900"/>
                  </div>
                </div>
                
                <Button className="w-full bg-primary text-black font-bold h-12 mt-4" onClick={handleSaveGoal}>
                  {editingGoal ? 'Salvar Alterações' : 'Criar Meta Global'}
                </Button>

                {editingGoal && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                     <div className="flex justify-between items-center mb-3">
                       <h4 className="text-sm font-bold text-white/60">Histórico de Progresso</h4>
                       <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" onClick={async () => {
                         const v = prompt("Qual o novo valor atual atingido?");
                         if (!v || isNaN(Number(v))) return;
                         await addDoc(collection(db, 'kpi_entries'), {
                           kpiName: editingGoal.id, // using kpiName as ID reference to satisfy rule
                           actualValue: Number(v),
                           targetValue: 0, // dummy value as rule doesn't strictly require it in keys but UI might? Rule just expects keys
                           date: new Date().toISOString().split('T')[0],
                           tenantId: userData.tenantId,
                           createdAt: serverTimestamp(),
                           updatedAt: serverTimestamp()
                         });
                       }}>+ Adicionar Registro</Button>
                     </div>
                     <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                       {goalEntries.slice().sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map(e => (
                         <div key={e.id} className="text-xs bg-white/5 p-2 rounded flex justify-between items-center">
                            <div><span className="font-bold text-white">{e.date}</span></div>
                            <div className="text-right text-white font-bold">{e.actualValue} atingidos</div>
                         </div>
                       ))}
                       {goalEntries.length === 0 && <p className="text-xs text-white/40">Nenhum registro histórico.</p>}
                     </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold">Pilares Estratégicos & Metas de Longo Prazo</h2>
           <p className="text-sm text-white/60">Acompanhamento dos focos de avanço da igreja.</p>
        </div>
        <Button className="bg-primary text-black" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Meta</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {goals.length === 0 ? defaultMockGoals.map((g, i) => (
           <Card key={i} className={`bg-zinc-900 border border-white/10 border-t-2 ${g.color} opacity-50`}>
              <CardContent className="p-4 text-center text-sm text-white/40">
                Mock Padrão. Clique em 'Nova Meta' para começar.
              </CardContent>
           </Card>
        )) : goals.map((goal, i) => (
          <Card key={goal.id} className={`bg-zinc-900 border border-white/10 border-t-2 ${goal.color} cursor-pointer hover:bg-white/5 transition-colors group`} onClick={() => openEdit(goal)}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl group-hover:text-primary transition-colors">{goal.pillar}</CardTitle>
                <Edit className="w-4 h-4 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="font-bold text-sm">{goal.title}</p>
              <CardDescription className="text-xs">{goal.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>{goal.targetText}</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                  Alvo / Prazo: {goal.period}
                </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-white/10 mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{campaignData.title}</CardTitle>
            <CardDescription>{campaignData.desc}</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="text-primary border-primary/20">Nova Ação Mensal</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Arrecadação Global</span>
                <span>R$ {campaignData.raised} / R$ {campaignData.target}</span>
              </div>
              <div className="h-4 w-full bg-black rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-primary" style={{ width: `${Math.min((campaignData.raised/campaignData.target)*100, 100)}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campaignData.metrics.map((m, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
                  <h4 className="font-bold">{m.label}</h4>
                  <p className="text-2xl font-black text-primary">{m.value}</p>
                  <p className="text-xs text-white/60 flex items-center gap-1">
                     {m.label === 'Próxima Viagem' && <CheckCircle2 className="w-3 h-3 text-green-400"/>}
                     {m.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

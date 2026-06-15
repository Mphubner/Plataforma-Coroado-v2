import * as React from "react";
import { motion } from "motion/react";
import { Plus, TrendingUp, CheckSquare, Shield, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { postJson } from "@/src/lib/api/http";
import { listItemMotion, pageMotion, panelMotion } from "@/src/lib/motion/presets";
import type { Plan, Transaction } from "@/src/types";

type ReconciliationStatus = "completed" | "failed" | "cancelled" | "refunded";

export function AdminFinance({ userData }: { userData?: any }) {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [showPlanModal, setShowPlanModal] = React.useState(false);
  const [planForm, setPlanForm] = React.useState({
    name: "",
    price: "",
    interval: "monthly" as "monthly" | "yearly",
    type: "individual" as "individual" | "family",
    featuresRaw: "",
  });

  const tenantId = userData?.tenantId || "tenant-1";

  React.useEffect(() => {
    // Load plans
    const qPlans = query(collection(db, "plans"), where("tenantId", "==", tenantId));
    const unsubPlans = onSnapshot(qPlans, (snap) => {
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Plan));
    });

    // Load transactions
    const qTx = query(collection(db, "transactions"), where("tenantId", "==", tenantId));
    const unsubTx = onSnapshot(qTx, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Transaction));
    });

    return () => {
      unsubPlans();
      unsubTx();
    };
  }, [tenantId]);

  const handleCreatePlan = async () => {
    if (!planForm.name || !planForm.price) {
      alert("Por favor preencha o nome e o preço do plano.");
      return;
    }
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      alert("Sessao expirada. Entre novamente para criar o plano.");
      return;
    }

    try {
      await postJson('/api/admin/plans', {
        name: planForm.name,
        price: Number(planForm.price),
        interval: planForm.interval,
        type: planForm.type,
        featuresRaw: planForm.featuresRaw,
      }, { token });
      setShowPlanModal(false);
      setPlanForm({ name: "", price: "", interval: "monthly", type: "individual", featuresRaw: "" });
    } catch (e) {
      console.error(e);
      alert("Erro ao criar plano: " + (e as Error).message);
    }
  };

  const mrr = transactions.filter(t => t.type === 'subscription' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0);
  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((acc, t) => acc + t.amount, 0);
  const activeSubscribers = Array.from(new Set(transactions.filter(t => t.type === 'subscription' && t.status === 'completed').map(t => t.userId))).length;
  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleExportCsv = () => {
    const rows = [
      ['id', 'userId', 'type', 'status', 'method', 'amount', 'date'],
      ...transactions.map(tx => [
        tx.id || '',
        tx.userId || '',
        tx.type || '',
        tx.status || '',
        tx.method || '',
        String(tx.amount || 0),
        tx.date || ''
      ])
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(`financeiro_coroado_${new Date().toISOString().split('T')[0]}.csv`, csv, 'text/csv;charset=utf-8');
  };
  const handleDownloadReport = () => {
    const report = [
      'Relatorio Financeiro Coroado',
      `Data: ${new Date().toLocaleDateString()}`,
      '',
      `MRR: R$ ${mrr.toFixed(2).replace('.', ',')}`,
      `Receita total: R$ ${totalRevenue.toFixed(2).replace('.', ',')}`,
      `Assinantes ativos: ${activeSubscribers}`,
      `Planos cadastrados: ${plans.length}`,
      `Transacoes registradas: ${transactions.length}`,
      '',
      'Observacao: confirme manualmente transacoes pendentes antes de usar este relatorio como fechamento financeiro.'
    ].join('\n');
    downloadFile(`relatorio_financeiro_coroado_${new Date().toISOString().split('T')[0]}.txt`, report, 'text/plain;charset=utf-8');
  };

  const handleReconcileTransaction = async (transactionId: string, status: ReconciliationStatus) => {
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      alert("Sessao expirada. Entre novamente para conciliar a transacao.");
      return;
    }

    const note = status === "completed"
      ? "Conciliado manualmente pelo painel financeiro."
      : window.prompt("Observacao da conciliacao") || "Conciliacao manual pelo painel financeiro.";

    try {
      await postJson(`/api/admin/transactions/${transactionId}/reconcile`, { status, note }, { token });
    } catch (e) {
      console.error(e);
      alert("Erro ao conciliar transacao: " + (e as Error).message);
    }
  };

  return (
    <motion.div {...pageMotion} className="space-y-6">
      {/* Modal Novo Plano */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-md w-full p-8 space-y-6 relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowPlanModal(false)}
              className="absolute top-4 right-4 rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
            <h3 className="text-2xl font-bold font-serif italic">Novo Plano de Assinatura</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Nome do Plano</label>
                <Input 
                  value={planForm.name} 
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })} 
                  className="bg-black border-white/10" 
                  placeholder="Ex: Assinatura Membro Ouro"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Preço (Mensal/Anual)</label>
                <Input 
                  type="number"
                  value={planForm.price} 
                  onChange={e => setPlanForm({ ...planForm, price: e.target.value })} 
                  className="bg-black border-white/10" 
                  placeholder="Ex: 49.90"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Intervalo</label>
                  <select 
                    value={planForm.interval}
                    onChange={e => setPlanForm({ ...planForm, interval: e.target.value as any })}
                    className="w-full h-10 bg-black border border-white/10 rounded-md px-3 text-white"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Tipo</label>
                  <select 
                    value={planForm.type}
                    onChange={e => setPlanForm({ ...planForm, type: e.target.value as any })}
                    className="w-full h-10 bg-black border border-white/10 rounded-md px-3 text-white"
                  >
                    <option value="individual">Individual</option>
                    <option value="family">Família</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase">Recursos inclusos (Separados por vírgula)</label>
                <Input 
                  value={planForm.featuresRaw} 
                  onChange={e => setPlanForm({ ...planForm, featuresRaw: e.target.value })} 
                  className="bg-black border-white/10" 
                  placeholder="Acesso a cursos, Assento Vip, Certificados"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button onClick={handleCreatePlan} className="flex-1 bg-primary text-black font-bold h-12">Criar Plano</Button>
              <Button variant="outline" onClick={() => setShowPlanModal(false)} className="flex-1 border-white/10 text-white hover:bg-white/5 h-12">Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Financeiro</h2>
          <p className="text-white/60">Acompanhamento de MRR, assinaturas e vendas avulsas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-[#0f9d58]/10 text-[#0f9d58] border-none hover:bg-[#0f9d58]/20 hidden md:flex" onClick={handleExportCsv}>
            Baixar CSV
          </Button>
          <Button variant="outline" className="bg-[#4285f4]/10 text-[#4285f4] border-none hover:bg-[#4285f4]/20 hidden md:flex" onClick={handleDownloadReport}>
            Relatório TXT
          </Button>
          <Button onClick={() => setShowPlanModal(true)} className="bg-primary text-black">
            <Plus className="mr-2 h-4 w-4" /> Novo Plano
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <motion.div {...panelMotion}>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">MRR (Receita Recorrente)</p>
            <p className="text-3xl font-bold tracking-tight text-primary">R$ {mrr.toFixed(2).replace('.', ',')}</p>
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Atualizado em tempo real</p>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div {...panelMotion}>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Receita Total</p>
            <p className="text-3xl font-bold tracking-tight text-white">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
            <p className="text-xs text-white/60 mt-2">Vendas de cursos e planos</p>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div {...panelMotion}>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Assinantes Ativos</p>
            <p className="text-3xl font-bold tracking-tight text-secondary">{activeSubscribers}</p>
            <p className="text-xs text-white/60 mt-2">Base de membros assinantes</p>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div {...panelMotion}>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">LTV Estimado</p>
            <p className="text-3xl font-bold tracking-tight text-white">R$ {activeSubscribers > 0 ? (totalRevenue / activeSubscribers).toFixed(2).replace('.', ',') : "0,00"}</p>
            <p className="text-xs text-white/60 mt-2">Receita média por assinante</p>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle>Planos de Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plans.map((plan, index) => (
              <motion.div key={plan.id} {...listItemMotion(index)} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{plan.name}</h4>
                  <p className="text-xs text-white/60">{plan.interval === 'monthly' ? 'Mensal' : 'Anual'} • {plan.type === 'individual' ? 'Individual' : 'Família'}</p>
                  {plan.features && plan.features.length > 0 && (
                    <p className="text-[10px] text-white/40 mt-1">Benefícios: {plan.features.join(", ")}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">R$ {plan.price.toFixed(2).replace('.', ',')}</p>
                </div>
              </motion.div>
            ))}
            {plans.length === 0 && <div className="text-sm text-white/40">Nenhum plano cadastrado.</div>}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactions.map((tx, index) => (
              <motion.div key={tx.id} {...listItemMotion(index)} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.method === 'pix' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {tx.method === 'pix' ? <CheckSquare className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{tx.type === 'subscription' ? 'Assinatura' : 'Curso Avulso'}</p>
                    <p className="text-xs text-white/60">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                   <p className="font-bold">R$ {tx.amount.toFixed(2).replace('.', ',')}</p>
                   <p className={`text-[10px] uppercase font-bold ${tx.status === 'completed' ? 'text-green-400' : tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>{tx.status}</p>
                   {tx.status === 'pending' && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-green-500/15 text-green-300 hover:bg-green-500/25"
                        onClick={() => handleReconcileTransaction(tx.id, "completed")}
                      >
                        <CheckSquare className="mr-1 h-3 w-3" /> Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReconcileTransaction(tx.id, "failed")}
                      >
                        <X className="mr-1 h-3 w-3" /> Rejeitar
                      </Button>
                    </div>
                   )}
                </div>
              </motion.div>
            ))}
            {transactions.length === 0 && <div className="text-sm text-white/40">Nenhuma transação recente.</div>}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

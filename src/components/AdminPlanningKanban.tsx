import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, AlignLeft, User, ChevronDown, ChevronRight, CalendarCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { createTask, updateTaskDetails } from "@/src/lib/services/planningService";

export function AdminPlanningKanban() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // New task forms
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDept, setNewTaskDept] = useState("");
  const [newTaskProblem, setNewTaskProblem] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskBudget, setNewTaskBudget] = useState("0");

  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedProbs, setExpandedProbs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!auth.currentUser) return;
    auth.currentUser.getIdTokenResult().then(token => {
       setTenantId(token.claims.tenantId as string);
    });
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    
    // Fetch members for assignee dropdown
    const fetchMembers = async () => {
      const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchMembers();

    // Fetch action plans for tree
    const q = query(collection(db, 'action_plans'), where('tenantId', '==', tenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => unsubscribe();
  }, [tenantId]);

  const handleUpdateTask = async () => {
     if (!selectedTask || !auth.currentUser) return;
     try {
       await updateTaskDetails(selectedTask.id, {
         action_title: selectedTask.action_title,
         strategy_detail: selectedTask.strategy_detail,
         group_department: selectedTask.group_department,
         root_problem: selectedTask.root_problem,
         assignee_name: selectedTask.assignee_name,
         dueDate: selectedTask.due_date || '',
         budget: parseFloat(selectedTask.budget || 0)
       });
       setSelectedTask(null);
     } catch(e) {
       console.error("Error saving task", e);
     }
  }

  const handleAddTask = async () => {
    if (!auth.currentUser || !tenantId || !newTaskTitle) return;
    try {
      await createTask({
        action_title: newTaskTitle,
        strategy_detail: newTaskDescription,
        group_department: newTaskDept || 'Geral',
        root_problem: newTaskProblem || 'Não Classificado',
        assignee_name: newTaskAssignee || 'Não atribuído',
        budget: parseFloat(newTaskBudget || '0'),
        status: 'Pendente',
        tenantId: tenantId,
        due_date: newTaskDueDate || '',
      });
      setShowModal(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDept("");
      setNewTaskProblem("");
      setNewTaskAssignee("");
      setNewTaskDueDate("");
      setNewTaskBudget("0");
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleDept = (dept: string) => setExpandedDepts(prev => ({...prev, [dept]: !prev[dept]}));
  const toggleProb = (prob: string) => setExpandedProbs(prev => ({...prev, [prob]: !prev[prob]}));

  const handleGoogleTasksSync = () => {
     alert("Integração com Google Tasks em breve! O fluxo de OAuth será iniciado por aqui.");
  };

  // Group plans into tree: Department -> Problem -> Plans
  const tree: any = {};
  plans.forEach(plan => {
    const dept = plan.group_department || 'Geral';
    const prob = plan.root_problem || 'Geral / Não Classificado';
    if (!tree[dept]) tree[dept] = {};
    if (!tree[dept][prob]) tree[dept][prob] = [];
    tree[dept][prob].push(plan);
  });

  return (
    <div className="space-y-6">
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedTask(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-white/10 p-6 rounded-2xl shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start mb-2">
                 <div className="w-full mr-4">
                    <Input 
                      className="text-2xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 h-auto"
                      value={selectedTask.action_title}
                      onChange={e => setSelectedTask({...selectedTask, action_title: e.target.value})}
                    />
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => setSelectedTask(null)}><X className="w-5 h-5"/></Button>
              </div>

              <div className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-white/40 flex items-center gap-2"><User className="w-3 h-3"/> Responsável</label>
                      <select 
                        value={selectedTask.assignee_name}
                        onChange={e => setSelectedTask({...selectedTask, assignee_name: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white h-10"
                      >
                         <option value={selectedTask.assignee_name}>{selectedTask.assignee_name} (Atual)</option>
                         {members.map(m => (
                            <option key={m.id} value={m.displayName || m.email}>{m.displayName || m.email}</option>
                         ))}
                      </select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-white/40">Data de Entrega</label>
                      <Input 
                        type="date"
                        value={selectedTask.due_date || ''}
                        onChange={e => setSelectedTask({...selectedTask, due_date: e.target.value})}
                        className="bg-zinc-900 border-white/10 text-sm w-full"
                      />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 flex items-center gap-2"><AlignLeft className="w-3 h-3"/> Detalhamento da Estratégia</label>
                    <textarea 
                      className="w-full h-32 bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      value={selectedTask.strategy_detail || ''}
                      onChange={e => setSelectedTask({...selectedTask, strategy_detail: e.target.value})}
                      placeholder="Detalhe a tarefa aqui..."
                    />
                 </div>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
                  <Button variant="outline" onClick={() => setSelectedTask(null)}>Cancelar</Button>
                  <Button className="bg-primary text-black" onClick={handleUpdateTask}>Salvar Alterações</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Nova Ação Estratégica</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="w-5 h-5"/></Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Ação / O que precisa ser feito?</label>
                  <Input 
                    placeholder="Ex: Definir orçamento da conferência..." 
                    value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} 
                    className="bg-zinc-900 border-white/10" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Estratégia (Como fazer)</label>
                  <textarea 
                    className="w-full h-20 bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="Detalhe operacional..." 
                    value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Ministério / Grupo</label>
                    <Input 
                      placeholder="Ex: Comunicação" 
                      value={newTaskDept} onChange={e => setNewTaskDept(e.target.value)} 
                      className="bg-zinc-900 border-white/10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Problema Raiz</label>
                    <Input 
                      placeholder="Ex: Falta de Braço" 
                      value={newTaskProblem} onChange={e => setNewTaskProblem(e.target.value)} 
                      className="bg-zinc-900 border-white/10" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Data de Entrega</label>
                    <Input 
                      type="date"
                      value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} 
                      className="bg-zinc-900 border-white/10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Orçamento Previsto (R$)</label>
                    <Input 
                      type="number"
                      value={newTaskBudget} onChange={e => setNewTaskBudget(e.target.value)} 
                      className="bg-zinc-900 border-white/10" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Responsável</label>
                  <select 
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white h-10"
                  >
                     <option value="">Selecione um membro</option>
                     {members.map(m => (
                        <option key={m.id} value={m.displayName || m.email}>{m.displayName || m.email}</option>
                     ))}
                  </select>
                </div>

                <Button className="w-full bg-primary text-black font-bold h-12 mt-2" onClick={handleAddTask}>
                  Salvar Ação
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">Planejamento Estratégico (Árvore)</h2>
          <p className="text-sm text-white/60">Organizado por Grupo Ministerial e Problemas Raiz.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/20 hover:bg-white/10" onClick={handleGoogleTasksSync}>
             <CalendarCheck className="w-4 h-4 mr-2" /> Google Tasks
          </Button>
          <Button className="bg-primary text-black" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Ação
          </Button>
        </div>
      </div>

      <div className="space-y-4 pt-4">
         {Object.keys(tree).map(dept => (
           <Card key={dept} className="bg-zinc-900/50 border-white/10">
              <CardContent className="p-0">
                 <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleDept(dept)}>
                    <h3 className="font-bold text-lg text-primary">{dept}</h3>
                    {expandedDepts[dept] ? <ChevronDown className="w-5 h-5 opacity-50"/> : <ChevronRight className="w-5 h-5 opacity-50"/>}
                 </div>
                 
                 {expandedDepts[dept] && (
                   <div className="px-4 pb-4 space-y-3">
                      {Object.keys(tree[dept]).map(prob => (
                        <div key={prob} className="bg-zinc-950/50 rounded-lg border border-white/5 overflow-hidden">
                           <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors bg-white/5" onClick={() => toggleProb(dept+prob)}>
                              <h4 className="font-semibold text-sm text-white/80">{prob}</h4>
                              {expandedProbs[dept+prob] ? <ChevronDown className="w-4 h-4 opacity-50"/> : <ChevronRight className="w-4 h-4 opacity-50"/>}
                           </div>
                           
                           {expandedProbs[dept+prob] && (
                              <div className="p-3 space-y-2">
                                 {tree[dept][prob].map((plan: any) => (
                                   <div 
                                      key={plan.id} 
                                      className="p-3 rounded-md bg-zinc-900 border border-white/10 hover:border-primary/50 cursor-pointer flex justify-between items-center transition-all group"
                                      onClick={() => setSelectedTask(plan)}
                                   >
                                      <div>
                                         <p className="text-sm font-medium group-hover:text-primary transition-colors">{plan.action_title}</p>
                                         <p className="text-xs text-white/40 mt-1">{plan.assignee_name} • {plan.due_date || 'Sem Prazo'}</p>
                                      </div>
                                      <div className="text-xs font-mono text-white/30">
                                         {parseFloat(plan.budget || 0) > 0 ? `R$ ${plan.budget}` : ''}
                                      </div>
                                   </div>
                                 ))}
                              </div>
                           )}
                        </div>
                      ))}
                   </div>
                 )}
              </CardContent>
           </Card>
         ))}
         {Object.keys(tree).length === 0 && (
            <div className="h-32 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-sm text-white/30">
              Nenhuma ação cadastrada para este tenant.
            </div>
         )}
      </div>
    </div>
  );
}

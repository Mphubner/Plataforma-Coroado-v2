import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, AlignLeft, User, CalendarCheck, Clock, Flag, Columns, ListFilter, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { createTask, updateTaskDetails, createTaskUpdate } from "@/src/lib/services/planningService";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUSES = ['Pendente', 'Em Andamento', 'Concluído'];

export function AdminPlanningKanban({ userData }: { userData?: any }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  const [groupBy, setGroupBy] = useState<'status' | 'assigneeId' | 'tag'>('status');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskUpdates, setTaskUpdates] = useState<any[]>([]);
  const [newUpdateText, setNewUpdateText] = useState('');

  // New task forms
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDept, setNewTaskDept] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("Pendente");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");

  useEffect(() => {
    if (userData?.tenantId) {
      setTenantId(userData.tenantId);
    }
  }, [userData?.tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    
    const fetchMembers = async () => {
      const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchMembers();

    const q = query(collection(db, 'tasks'), where('tenantId', '==', tenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => unsubscribe();
  }, [tenantId]);

  useEffect(() => {
    if (!selectedTask?.id) return;
    const q = query(collection(db, 'task_updates'), where('taskId', '==', selectedTask.id), orderBy('createdAt', 'desc'));
    const un = onSnapshot(q, snap => {
      setTaskUpdates(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => un();
  }, [selectedTask?.id]);

  const handleUpdateTask = async () => {
     if (!selectedTask || !auth.currentUser) return;
     try {
       await updateTaskDetails(selectedTask.id, {
          title: selectedTask.title || '',
          description: selectedTask.description || '',
          tag: selectedTask.tag || 'Geral',
          assigneeId: selectedTask.assigneeId || 'Nao atribuido',
          dueDate: selectedTask.dueDate || '',
          startDate: selectedTask.startDate || '',
          status: selectedTask.status || 'Pendente'
        });
       setSelectedTask(null);
     } catch(e) {
       console.error("Error saving task", e);
     }
  }

  const handleAddUpdate = async () => {
    if (!selectedTask || !newUpdateText.trim()) return;
    await createTaskUpdate({
      taskId: selectedTask.id,
      tenantId: tenantId!,
      content: newUpdateText,
      authorId: auth.currentUser?.uid || '',
      authorName: userData?.displayName || 'Usuário',
      type: 'comment'
    });
    setNewUpdateText('');
  }

  const handleAddTask = async () => {
    if (!auth.currentUser || !tenantId || !newTaskTitle) return;
    try {
      await createTask({
        title: newTaskTitle,
        description: newTaskDescription,
        tag: newTaskDept || 'Geral',
        assigneeId: newTaskAssignee || 'Não atribuído',
        status: newTaskStatus || 'Pendente',
        tenantId: tenantId,
        startDate: newTaskStartDate || '',
        dueDate: newTaskDueDate || '',
      });
      setShowModal(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDept("");
      setNewTaskAssignee("");
      setNewTaskStatus("Pendente");
      setNewTaskDueDate("");
      setNewTaskStartDate("");
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const isOverdue = (dateStr: string, status: string) => {
    if (!dateStr || status === 'Concluído' || status === 'done') return false;
    try {
      const d = parseISO(dateStr);
      return isPast(d) && !isToday(d);
    } catch { return false; }
  };

  // Grouping logic
  const groupedTasks: Record<string, any[]> = {};
  
  if (groupBy === 'status') {
    STATUSES.forEach(s => groupedTasks[s] = []);
    tasks.forEach(t => {
      const s = t.status && STATUSES.includes(t.status) ? t.status : (t.status === 'done' ? 'Concluído' : (t.status === 'todo' ? 'Pendente' : 'Pendente'));
      groupedTasks[s].push(t);
    });
  } else {
    tasks.forEach(t => {
      let val = t[groupBy] || 'Não Classificado';
      if (val === 'todo') val = 'Pendente';
      if (val === 'done') val = 'Concluído';
      
      if (!groupedTasks[val]) groupedTasks[val] = [];
      groupedTasks[val].push(t);
    });
  }

  return (
    <div className="space-y-6">
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedTask(null)}
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-zinc-950 border-l border-white/10 shadow-2xl h-full flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-900/50">
                 <div className="w-full mr-4 space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold flex items-center gap-1"><Tag className="w-3 h-3"/> {selectedTask.tag || 'Geral'}</p>
                    <Input 
                      className="text-2xl font-black bg-transparent border-none p-0 focus-visible:ring-0 h-auto rounded-none"
                      value={selectedTask.title}
                      onChange={e => setSelectedTask({...selectedTask, title: e.target.value})}
                    />
                 </div>
                 <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => setSelectedTask(null)}><X className="w-5 h-5"/></Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 <div className="grid grid-cols-2 gap-6 bg-zinc-900/30 p-4 rounded-xl border border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Status</label>
                      <select 
                        value={selectedTask.status === 'todo' ? 'Pendente' : (selectedTask.status === 'done' ? 'Concluído' : selectedTask.status)}
                        onChange={e => setSelectedTask({...selectedTask, status: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                         {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3"/> Responsável</label>
                      <select 
                        value={selectedTask.assigneeId}
                        onChange={e => setSelectedTask({...selectedTask, assigneeId: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                         <option value={selectedTask.assigneeId}>{selectedTask.assigneeId}</option>
                         {members.map(m => (
                            <option key={m.id} value={m.displayName || m.email}>{m.displayName || m.email}</option>
                         ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Data Inicial</label>
                      <Input type="date" value={selectedTask.startDate || ''} onChange={e => setSelectedTask({...selectedTask, startDate: e.target.value})} className="bg-zinc-900 border-white/10 text-sm h-9"/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Data Final</label>
                      <Input type="date" value={selectedTask.dueDate || ''} onChange={e => setSelectedTask({...selectedTask, dueDate: e.target.value})} className="bg-zinc-900 border-white/10 text-sm h-9"/>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-sm font-bold text-white/80 flex items-center gap-2"><AlignLeft className="w-4 h-4"/> Detalhamento</label>
                    <textarea 
                      className="w-full min-h-[120px] bg-zinc-900 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-white/20"
                      value={selectedTask.description || ''}
                      onChange={e => setSelectedTask({...selectedTask, description: e.target.value})}
                      placeholder="Adicione detalhes sobre como essa ação será executada..."
                    />
                 </div>

                 <div className="space-y-4">
                    <label className="text-sm font-bold text-white/80 flex items-center gap-2"><Clock className="w-4 h-4"/> Acompanhamentos</label>
                    <div className="space-y-3">
                       <div className="flex gap-2">
                         <Input value={newUpdateText} onChange={e => setNewUpdateText(e.target.value)} placeholder="Adicionar comentário ou update..." className="bg-zinc-900 border-white/10"/>
                         <Button onClick={handleAddUpdate} className="bg-white/10 hover:bg-white/20 text-white">Enviar</Button>
                       </div>
                       <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                         {taskUpdates.length === 0 && <p className="text-xs text-white/30 text-center py-4">Nenhum update registrado.</p>}
                         {taskUpdates.map(u => (
                           <div key={u.id} className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 space-y-1">
                             <div className="flex justify-between items-center text-[10px] text-white/40 font-bold uppercase tracking-wider">
                               <span>{u.authorName}</span>
                               <span>{u.createdAt ? new Date(u.createdAt.toMillis()).toLocaleString('pt-BR') : 'Agora'}</span>
                             </div>
                             <p className="text-sm text-white/90">{u.content}</p>
                           </div>
                         ))}
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-zinc-950 border-t border-white/10 flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setSelectedTask(null)}>Cancelar</Button>
                  <Button className="bg-primary text-black font-bold px-8" onClick={handleUpdateTask}>Salvar Tarefa</Button>
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
                <h3 className="text-xl font-black">Nova Ação</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="w-5 h-5"/></Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">O que precisa ser feito?</label>
                  <Input placeholder="Título da Ação" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="bg-zinc-900 border-white/10" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Estratégia (Como fazer)</label>
                  <textarea 
                    className="w-full h-20 bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-white/20"
                    placeholder="Detalhe operacional da ação..." 
                    value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Área Ministerial / Tag</label>
                  <Input placeholder="Ex: Comunicação, Eventos..." value={newTaskDept} onChange={e => setNewTaskDept(e.target.value)} className="bg-zinc-900 border-white/10" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Responsável</label>
                  <select value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white h-10">
                     <option value="">Selecione um membro</option>
                     {members.map(m => <option key={m.id} value={m.displayName || m.email}>{m.displayName || m.email}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Status</label>
                  <select value={newTaskStatus} onChange={e => setNewTaskStatus(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white h-10">
                     {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Data Início</label>
                    <Input type="date" value={newTaskStartDate} onChange={e => setNewTaskStartDate(e.target.value)} className="bg-zinc-900 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Data Fim</label>
                    <Input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} className="bg-zinc-900 border-white/10" />
                  </div>
                </div>

                <Button className="w-full bg-primary text-black font-bold h-12 mt-4" onClick={handleAddTask}>Criar Ação</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/30 p-4 rounded-xl border border-white/5">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">Planejamento</h2>
          <p className="text-sm text-white/50">Acompanhe e gerencie as ações estratégicas.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex bg-zinc-950 rounded-lg p-1 border border-white/10">
             <Button variant="ghost" size="sm" className={`text-xs px-3 ${groupBy === 'status' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`} onClick={() => setGroupBy('status')}>
               <Columns className="w-3 h-3 mr-2"/> Status
             </Button>
             <Button variant="ghost" size="sm" className={`text-xs px-3 ${groupBy === 'assigneeId' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`} onClick={() => setGroupBy('assigneeId')}>
               <User className="w-3 h-3 mr-2"/> Responsável
             </Button>
             <Button variant="ghost" size="sm" className={`text-xs px-3 ${groupBy === 'tag' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`} onClick={() => setGroupBy('tag')}>
               <Tag className="w-3 h-3 mr-2"/> Área
             </Button>
          </div>
          <Button className="bg-primary text-black font-bold" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Ação
          </Button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 snap-x custom-scrollbar min-h-[calc(100vh-250px)] items-start">
         {Object.keys(groupedTasks).map(groupName => (
           <div key={groupName} className="min-w-[320px] max-w-[320px] flex flex-col gap-3 snap-start h-full max-h-[calc(100vh-250px)]">
             <div className="flex items-center justify-between mb-2 px-1 shrink-0">
               <h3 className="font-bold text-white flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${groupName === 'Concluído' ? 'bg-green-500' : (groupName === 'Em Andamento' ? 'bg-blue-500' : 'bg-white/30')}`}/>
                 {groupName}
               </h3>
               <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-mono">{groupedTasks[groupName].length}</span>
             </div>
             
             <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 pb-4">
               {groupedTasks[groupName].map(task => {
                 const overdue = isOverdue(task.dueDate, task.status);
                 return (
                   <Card key={task.id} className="bg-zinc-900 border-white/10 hover:border-primary/50 hover:bg-zinc-900/80 cursor-pointer transition-all shadow-md group shrink-0" onClick={() => setSelectedTask(task)}>
                     <CardContent className="p-4 space-y-3">
                       <div className="flex justify-between items-start gap-2">
                         <span className="text-[10px] font-bold px-2 py-0.5 bg-white/5 text-white/60 rounded-md truncate max-w-[150px]">{task.tag || 'Geral'}</span>
                         {overdue && <span className="text-[9px] font-bold px-2 py-0.5 bg-red-500/20 text-red-400 rounded flex items-center gap-1"><Flag className="w-2 h-2"/> Atrasado</span>}
                       </div>
                       <h4 className="font-bold text-sm leading-tight text-white/90 group-hover:text-primary transition-colors">{task.title}</h4>
                       
                       <div className="flex justify-between items-center pt-2 border-t border-white/5">
                         <div className="flex items-center gap-1.5 text-xs text-white/50">
                           <User className="w-3 h-3" />
                           <span className="truncate max-w-[100px]">{task.assigneeId || 'Não atribuído'}</span>
                         </div>
                         {(task.startDate || task.dueDate) && (
                           <div className={`text-[10px] flex items-center gap-1 font-mono ${overdue ? 'text-red-400 font-bold' : 'text-white/40'}`}>
                             <CalendarCheck className="w-3 h-3"/>
                             {task.dueDate ? format(parseISO(task.dueDate), 'dd/MM') : (task.startDate ? format(parseISO(task.startDate), 'dd/MM') : '')}
                           </div>
                         )}
                       </div>
                     </CardContent>
                   </Card>
                 )
               })}
               {groupedTasks[groupName].length === 0 && (
                 <div className="h-24 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-xs text-white/20">
                   Nenhuma ação
                 </div>
               )}
             </div>
           </div>
         ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Clock, PlayCircle, X, MessageSquare, AlignLeft, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

type Task = {
  id: string;
  title: string;
  description?: string;
  tag: string;
  assigneeId: string;
  status: string;
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  createdAt?: number;
};

const COLUMN_CONFIGS = [
  { id: "todo", title: "A Fazer (Backlog)", icon: <Clock className="w-4 h-4 text-white/50" /> },
  { id: "in-progress", title: "Em Andamento", icon: <PlayCircle className="w-4 h-4 text-blue-400" /> },
  { id: "done", title: "Concluído", icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
];

export function AdminPlanningKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  // New task forms
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTag, setNewTaskTag] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchTenant = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userDoc.exists()) {
          setTenantId(userDoc.data().tenantId);
        }
      } catch (error) {
        console.error("Error fetching user tenant:", error);
      }
    };
    fetchTenant();
  }, []);

  useEffect(() => {
    if (!tenantId || !auth.currentUser) return;
    
    const q = query(collection(db, 'tasks'), where('tenantId', '==', tenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTasks: Task[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loadedTasks.push({
          id: doc.id,
          title: data.title,
          description: data.description || '',
          tag: data.tag || 'Geral',
          assigneeId: data.assigneeId || 'Não atribuído',
          status: data.status || 'todo',
          dueDate: data.dueDate,
          startDate: data.startDate,
          completedAt: data.completedAt,
          createdAt: data.createdAt
        });
      });
      setTasks(loadedTasks);
    });
    
    return () => unsubscribe();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !selectedTask?.id) {
       setTaskComments([]);
       return;
    }
    const q = query(collection(db, 'task_updates'), where('tenantId', '==', tenantId), where('taskId', '==', selectedTask.id));
    const un = onSnapshot(q, (snap) => {
      setTaskComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => un();
  }, [tenantId, selectedTask?.id]);

  const moveTask = async (taskId: string, targetColId: string) => {
    if (!auth.currentUser) return;
    try {
      const updateData: any = {
        status: targetColId,
        updatedAt: serverTimestamp()
      };
      if (targetColId === 'done') {
         updateData.completedAt = new Date().toISOString().split('T')[0];
      }
      await updateDoc(doc(db, 'tasks', taskId), updateData);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleUpdateTask = async () => {
     if (!selectedTask || !auth.currentUser) return;
     try {
       await updateDoc(doc(db, 'tasks', selectedTask.id), {
         title: selectedTask.title,
         description: selectedTask.description,
         tag: selectedTask.tag,
         assigneeId: selectedTask.assigneeId,
         dueDate: selectedTask.dueDate || '',
         updatedAt: serverTimestamp()
       });
       setSelectedTask(null);
     } catch(e) {
       console.error("Error saving task", e);
     }
  }

  const handleAddTask = async () => {
    if (!auth.currentUser || !tenantId || !newTaskTitle) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTaskTitle,
        description: newTaskDescription,
        tag: newTaskTag || 'Geral',
        assigneeId: newTaskAssignee || 'Não atribuído',
        status: 'todo',
        tenantId: tenantId,
        createdBy: auth.currentUser.uid,
        dueDate: newTaskDueDate || '',
        startDate: new Date().toISOString().split('T')[0],
        completedAt: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowModal(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskTag("");
      setNewTaskAssignee("");
      setNewTaskDueDate("");
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const submitComment = async () => {
     if (!newComment.trim() || !selectedTask?.id || !tenantId || !auth.currentUser) return;
     try {
        await addDoc(collection(db, 'task_updates'), {
           taskId: selectedTask.id,
           content: newComment,
           authorName: auth.currentUser.displayName || auth.currentUser.email || 'Usuário',
           date: new Date().toISOString(),
           tenantId: tenantId,
           createdAt: serverTimestamp()
        });
        setNewComment("");
     } catch(e) {
        console.error("Error posting comment", e);
     }
  };

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
                      value={selectedTask.title}
                      onChange={e => setSelectedTask({...selectedTask, title: e.target.value})}
                    />
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => setSelectedTask(null)}><X className="w-5 h-5"/></Button>
              </div>

              <div className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-white/40 flex items-center gap-2"><User className="w-3 h-3"/> Responsável</label>
                      <Input 
                        value={selectedTask.assigneeId}
                        onChange={e => setSelectedTask({...selectedTask, assigneeId: e.target.value})}
                        className="bg-zinc-900 border-white/10 text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-white/40">Tag</label>
                      <Input 
                        value={selectedTask.tag}
                        onChange={e => setSelectedTask({...selectedTask, tag: e.target.value})}
                        className="bg-zinc-900 border-white/10 text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-white/40">Data de Entrega</label>
                      <Input 
                        type="date"
                        value={selectedTask.dueDate || ''}
                        onChange={e => setSelectedTask({...selectedTask, dueDate: e.target.value})}
                        className="bg-zinc-900 border-white/10 text-sm w-full"
                      />
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                       <label className="text-xs font-bold text-white/40">Data de Criação</label>
                       <div className="text-sm px-3 py-2 bg-zinc-900 border border-white/10 rounded-md">
                          {selectedTask.createdAt ? new Date((selectedTask.createdAt as any).toDate?.() || selectedTask.createdAt).toLocaleDateString() : '-'}
                       </div>
                    </div>
                    {selectedTask.completedAt && (
                      <div className="flex-1 space-y-2">
                         <label className="text-xs font-bold text-green-400/80">Concluído em</label>
                         <div className="text-sm px-3 py-2 bg-green-900/20 border border-green-500/20 text-green-400 rounded-md">
                            {new Date(selectedTask.completedAt).toLocaleDateString()}
                         </div>
                      </div>
                    )}
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 flex items-center gap-2"><AlignLeft className="w-3 h-3"/> Descrição Completa</label>
                    <textarea 
                      className="w-full h-32 bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      value={selectedTask.description || ''}
                      onChange={e => setSelectedTask({...selectedTask, description: e.target.value})}
                      placeholder="Detalhe a tarefa aqui..."
                    />
                 </div>

                 <div className="border-t border-white/10 pt-4 space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4"/> Acompanhamentos</h4>
                    <div className="flex gap-2">
                      <Input placeholder="Escrever uma atualização..." value={newComment} onChange={e => setNewComment(e.target.value)} className="bg-zinc-900 border-white/10" />
                      <Button onClick={submitComment} variant="outline">Postar</Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                       {taskComments.slice().sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map(c => (
                         <div key={c.id} className="text-xs bg-white/5 p-3 rounded space-y-1">
                            <div className="flex justify-between items-center opacity-50">
                               <span className="font-bold">{c.authorName}</span>
                               <span>{c.createdAt?.toMillis ? new Date(c.createdAt.toMillis()).toLocaleString() : ''}</span>
                            </div>
                            <p className="text-white">{c.content}</p>
                         </div>
                       ))}
                       {taskComments.length === 0 && <p className="text-xs text-white/40">Nenhum acompanhamento registrado.</p>}
                    </div>
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
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 p-6 rounded-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Nova Tarefa Estratégica</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="w-5 h-5"/></Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">O que precisa ser feito?</label>
                  <Input 
                    placeholder="Ex: Definir orçamento da conferência..." 
                    value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} 
                    className="bg-zinc-900 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Descrição (Opcional)</label>
                  <textarea 
                    className="w-full h-20 bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="Ex: Definir prioridades, levantar custos..." 
                    value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Tag / Categoria</label>
                    <Input 
                      placeholder="Ex: Financeiro, TI, Células" 
                      value={newTaskTag} onChange={e => setNewTaskTag(e.target.value)} 
                      className="bg-zinc-900 border-white/10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Data de Entrega</label>
                    <Input 
                      type="date"
                      value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} 
                      className="bg-zinc-900 border-white/10" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Responsável</label>
                  <Input 
                     placeholder="Ex: Buscar membro..." 
                     value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)} 
                     className="bg-zinc-900 border-white/10" 
                  />
                </div>
                <Button className="w-full bg-primary text-black font-bold h-12 mt-2" onClick={handleAddTask}>
                  Adicionar ao Kanban
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">Planejamento Estratégico</h2>
          <p className="text-sm text-white/60">Gestão ágil das atividades da liderança global.</p>
        </div>
        <Button className="bg-primary text-black" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 pb-4 lg:min-h-[500px]">
        {COLUMN_CONFIGS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="w-full lg:flex-1 lg:min-w-[300px] flex flex-col gap-3">
              <div className="flex items-center justify-between uppercase tracking-wider text-xs font-bold font-mono text-white/60 mb-2 border-b border-white/10 pb-2">
                <span className="flex items-center gap-2">
                  {col.icon} {col.title} ({colTasks.length})
                </span>
              </div>
              
              <div className="flex-1 bg-white/5 rounded-2xl p-3 space-y-3 border border-white/5">
                {colTasks.map(task => (
                  <Card key={task.id} className="bg-zinc-900 border-white/10 hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setSelectedTask(task)}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight text-white/90 group-hover:text-primary transition-colors">{task.title}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10">
                          {task.tag}
                        </Badge>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <div className="text-[10px] text-white/40">{task.assigneeId}</div>
                          
                          <div className="flex bg-black rounded-lg border border-white/10 p-0.5">
                            {col.id !== 'todo' && (
                              <button onClick={() => moveTask(task.id, 'todo')} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-md text-white/50" title="Voltar para A Fazer">«</button>
                            )}
                            {col.id === 'todo' && (
                              <button onClick={() => moveTask(task.id, 'in-progress')} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-md text-blue-400" title="Mover para Em Andamento">»</button>
                            )}
                            {col.id === 'in-progress' && (
                              <button onClick={() => moveTask(task.id, 'done')} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-md text-green-400" title="Mover para Concluído">»</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {colTasks.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-xs text-white/30">
                    Nenhuma tarefa aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Facebook, Instagram, Youtube, Mail, ChevronRight, Calendar, X, AlertCircle, Edit3, Trash2, Plus, Clock, CheckCircle, ListTodo, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth, db } from '@/lib/firebase';
import { postJson } from '@/src/lib/api/http';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PastoralCareView } from './PastoralCareView';
import {
  createPastoralAppointment,
  createPastoralTask,
  updatePastoralAppointmentStatus,
  updateTaskStatus,
} from '@/src/lib/services/pastoralService';

export function PastorsView({ isAdmin, userData, isLoggedIn, onLoginClick }: { isAdmin?: boolean; userData?: any; isLoggedIn?: boolean; onLoginClick?: () => void }) {
  const [pastorsList, setPastorsList] = useState<any[]>([]);
  const [pastorsError, setPastorsError] = useState('');
  const [selectedPastor, setSelectedPastor] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [pastoralTasks, setPastoralTasks] = useState<any[]>([]);
  const [showPastorForm, setShowPastorForm] = useState(false);
  const [editingPastor, setEditingPastor] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAppointment, setLastAppointment] = useState<any>(null);

  const isLeader = isAdmin || userData?.profileType === 'pastor' || userData?.roles?.some((r: string) => ['admin', 'networkPastor', 'auxPastor', 'seniorPastor'].includes(r));

  const availableDates = Array.from({ length: 7 }, (_, i) => {
     const d = new Date();
     d.setDate(d.getDate() + i + 1);
     return d;
  }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  const baseAvailableTimes = (selectedPastor?.availableTimes && selectedPastor.availableTimes.length > 0)
    ? selectedPastor.availableTimes
    : ['14:00', '15:00', '16:00', '17:00', '18:00'];

  // Filter out times that are already booked internally on the selected date
  const bookedTimes = appointments
    .filter(app => app.pastorId === selectedPastor?.id && app.date === selectedDate && app.status !== 'cancelled')
    .map(app => app.time);

  const availableTimes = baseAvailableTimes.filter((time: string) => !bookedTimes.includes(time));

  const generateGoogleCalendarUrl = (app: any) => {
    if (!app) return '#';
    // Very simple generator for the local timezone without external libraries
    const dateStr = app.date.replace(/-/g, '');
    const timeStr = app.time.replace(':', '') + '00';
    const text = encodeURIComponent(`Aconselhamento: ${app.pastor}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dateStr}T${timeStr}/${dateStr}T${timeStr}&details=Aconselhamento+Pastoral`;
  };

  const handleSavePastor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.tenantId) {
      alert('Seu perfil ainda nao esta vinculado a uma unidade.');
      return;
    }
    try {
      const pData = {
        name: editingPastor.name,
        role: editingPastor.role,
        image: editingPastor.image,
        social: editingPastor.social || { facebook: '', instagram: '', youtube: '' },
        availableTimes: typeof editingPastor.availableTimes === 'string' 
           ? editingPastor.availableTimes.split(',').map((t: string) => t.trim()) 
           : (editingPastor.availableTimes || []),
        tenantId: userData.tenantId
      };

      if (editingPastor.id) {
        await updateDoc(doc(db, 'pastors', editingPastor.id), { ...pData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'pastors'), { ...pData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setShowPastorForm(false);
      setEditingPastor(null);
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar pastor');
    }
  };

  const handleDeletePastor = async (id: string) => {
    if (confirm('Excluir pastor?')) {
      await deleteDoc(doc(db, 'pastors', id));
    }
  };

  const updateAppointmentStatus = async (app: any, status: string) => {
    await updatePastoralAppointmentStatus(app.id, status as any);
  };

  const handleBook = async () => {
    if (!isLoggedIn) {
       if (onLoginClick) onLoginClick();
       return;
    }
    if (!selectedDate || !selectedTime) return alert("Selecione data e hora.");
    if (!userData?.tenantId) return alert("Seu perfil ainda nao esta vinculado a uma unidade.");
    setIsSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const payload = {
        pastorId: selectedPastor?.id || 'plantonista',
        pastorName: selectedPastor?.name || 'Pastor Plantonista',
        userId: userData?.id || '',
        userName: userData?.name || 'Membro',
        tenantId: userData.tenantId,
        date: selectedDate,
        time: selectedTime,
      };
      const response = await postJson<{ success: boolean; appointment: any; googleCalendarUrl: string }>('/api/pastoral/appointments', payload, { token });

      if (response.success) {
        setLastAppointment({ 
          id: response.appointment.id, 
          date: selectedDate, 
          time: selectedTime, 
          pastor: response.appointment.pastorName,
          googleCalendarUrl: response.googleCalendarUrl
        });
        setShowSuccess(true);
        setSelectedPastor(null);
        setSelectedDate('');
        setSelectedTime('');
      } else {
        alert("Erro ao criar agendamento.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao agendar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePastoralTask = async () => {
    if (!auth.currentUser || !userData?.tenantId) {
      alert('Entre com sua conta para criar tarefas pastorais.');
      return;
    }

    const title = window.prompt('Titulo da tarefa pastoral');
    if (!title?.trim()) return;

    await createPastoralTask({
      title: title.trim(),
      description: 'Tarefa criada pelo painel pastoral.',
      assigneeId: userData?.id || auth.currentUser.uid,
      tenantId: userData.tenantId,
      createdBy: auth.currentUser.uid,
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  const updatePastoralTaskStatus = async (task: any, status: string) => {
    await updateTaskStatus(task.id, status);
  };

  useEffect(() => {
    let unsubPastors = () => {};
    let unsubApps = () => {};
    let unsubTasks = () => {};

    const currentTenantId = userData?.tenantId || 'tenant-1';
    
    // Always fetch pastors, even if not logged in
    const qPastors = query(collection(db, 'pastors'), where('tenantId', '==', currentTenantId));
    unsubPastors = onSnapshot(qPastors, (snap) => {
      setPastorsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPastorsError('');
    }, (error) => {
      console.error(error);
      setPastorsList([]);
      setPastorsError('Não foi possível carregar o corpo pastoral.');
    });

    if (userData?.tenantId && auth.currentUser) {
      const qApps = query(collection(db, 'pastoral_appointments'), where('tenantId', '==', userData.tenantId));
      unsubApps = onSnapshot(qApps, (snap) => {
        setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qTasks = query(collection(db, 'tasks'), where('tenantId', '==', userData.tenantId));
      unsubTasks = onSnapshot(qTasks, (snap) => {
        setPastoralTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => { unsubPastors(); unsubApps(); unsubTasks(); };
  }, [userData?.tenantId, userData?.id, isAdmin, userData?.profileType, isLeader]);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 min-h-[400px] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 1.5 }}
            src="https://images.unsplash.com/photo-1438283173091-5dbf5c5a3206?q=80&w=1200&auto=format&fit=crop" 
            alt="Igreja Coroado" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-20 p-8 md:p-20 max-w-3xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
              Liderança
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] font-serif italic text-white">
              Nossos Pastores
            </h1>
            <p className="text-xl text-white/60 leading-relaxed max-w-xl font-medium">
              Conheça os líderes que Deus levantou para guiar, cuidar e pastorear a família Coroado. Homens dedicados ao ensino da Palavra e ao amor pelas pessoas.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Unified Dashboard or Public Grid */}
      <section className="space-y-6">
        {isLeader ? (
          <Tabs defaultValue="list" className="w-full space-y-8" onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <TabsList className="bg-zinc-900 border border-white/10 p-1 rounded-xl h-auto flex-wrap">
                <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
                  <Search className="w-4 h-4 mr-2" />
                  Portal Público
                </TabsTrigger>
                <TabsTrigger value="agenda" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
                  <Calendar className="w-4 h-4 mr-2" />
                  Meu Calendário
                </TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
                  <ListTodo className="w-4 h-4 mr-2" />
                  Minhas Tarefas
                </TabsTrigger>
                <TabsTrigger value="care" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
                  <Users className="w-4 h-4 mr-2" />
                  Cuidado Pastoral
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="bg-yellow-500/10 text-yellow-500 border-none hover:bg-yellow-500/20" onClick={() => window.open('https://keep.google.com/', '_blank')}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Anotações (Keep)
                </Button>
                {isAdmin && activeTab === 'list' && (
                   <Button variant="outline" className="border-white/10" onClick={() => {
                      setEditingPastor({ name: '', role: '', image: '', social: { facebook: '', instagram: '', youtube: '' }, availableTimes: '14:00, 15:00, 16:00' });
                      setShowPastorForm(true);
                   }}>
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Pastor
                   </Button>
                )}
              </div>
            </div>

            <TabsContent value="list" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pastorsList.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 text-center p-12 bg-zinc-900 border border-white/10 border-dashed rounded-[2.5rem]">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nenhum pastor cadastrado</h3>
              <p className="text-white/60">{pastorsError || 'Cadastre os pastores reais para liberar agenda, tarefas e cuidado pastoral.'}</p>
            </div>
          ) : pastorsList.map((pastor, index) => (
            <motion.div
              key={pastor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="glass-card rounded-[2.5rem] overflow-hidden group relative aspect-[4/5]">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                <img 
                  src={pastor.image} 
                  alt={pastor.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  referrerPolicy="no-referrer"
                />
                
                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-10 z-20 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black font-serif italic text-white group-hover:text-primary transition-colors">{pastor.name}</h2>
                    <p className="text-primary font-bold uppercase tracking-widest text-xs">{pastor.role}</p>
                  </div>
                  
                  {/* Social Links */}
                  <div className="flex items-center gap-3 pt-2">
                    {pastor.social?.facebook && pastor.social.facebook !== '#' && (
                      <motion.a 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href={pastor.social.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                      >
                        <Facebook className="w-5 h-5" />
                      </motion.a>
                    )}
                    {pastor.social?.instagram && pastor.social.instagram !== '#' && (
                      <motion.a 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href={pastor.social.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                      >
                        <Instagram className="w-5 h-5" />
                      </motion.a>
                    )}
                    {pastor.social?.youtube && pastor.social.youtube !== '#' && (
                      <motion.a 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href={pastor.social.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                      >
                        <Youtube className="w-5 h-5" />
                      </motion.a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      onClick={() => setSelectedPastor(pastor)}
                      size="sm" 
                      className="bg-primary text-black hover:bg-primary/90 font-bold w-full"
                    >
                      Agendar
                    </Button>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="bg-black/40 border-white/10 hover:bg-white/10 shrink-0" onClick={() => {
                           setEditingPastor({ ...pastor, availableTimes: pastor.availableTimes?.join(', ') || '' });
                           setShowPastorForm(true);
                        }}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white shrink-0" onClick={() => handleDeletePastor(pastor.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
              </div>
            </TabsContent>

            <TabsContent value="agenda" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-zinc-900 p-4 border border-white/10 rounded-2xl mb-6">
                  <div>
                    <h3 className="font-bold text-lg">Agenda pastoral</h3>
                    <p className="text-white/60 text-sm">Acompanhe solicitações aqui e adicione compromissos ao Google Agenda quando necessário.</p>
                  </div>
                  <Button onClick={() => window.open('https://calendar.google.com/', '_blank')} variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white">
                    <Calendar className="w-4 h-4 mr-2" /> Abrir Agenda
                  </Button>
                </div>
                {appointments.length === 0 ? (
                  <div className="text-center p-12 bg-zinc-900 border border-white/10 rounded-[2.5rem] text-white/40">
                     Nenhum agendamento encontrado para sua agenda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {appointments.map(app => (
                       <Card key={app.id} className="bg-zinc-900 border-white/10">
                          <CardHeader>
                            <Badge className="w-fit mb-2">{app.status}</Badge>
                            <CardTitle className="text-lg">{app.userName}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                               <Calendar className="w-4 h-4" /> {app.date}
                            </div>
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                               <Clock className="w-4 h-4" /> {app.time}
                            </div>
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                               Pastor: {app.pastorName}
                            </div>
                            <div className="flex gap-2 pt-4">
                              <Button size="sm" variant="outline" className="flex-1 bg-green-500/10 border-green-500/20 text-green-400" onClick={() => updateAppointmentStatus(app, 'approved')}>Aprovar</Button>
                              <Button size="sm" variant="outline" className="flex-1 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => updateAppointmentStatus(app, 'declined')}>Rejeitar</Button>
                            </div>
                          </CardContent>
                       </Card>
                     ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <div>
                    <h3 className="text-2xl font-black font-serif italic text-white">Tarefas Pastorais</h3>
                    <p className="text-white/60 text-sm">Gerencie acompanhamentos, ligações e retornos dentro da própria plataforma.</p>
                  </div>
                  <Button onClick={handleCreatePastoralTask} className="bg-white text-black hover:bg-white/90 font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
                  </Button>
                </div>
                {pastoralTasks.length === 0 ? (
                  <div className="text-center p-12 bg-black/40 border border-white/5 border-dashed rounded-3xl">
                    <ListTodo className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 mb-4">Nenhuma tarefa pastoral cadastrada.</p>
                    <Button onClick={handleCreatePastoralTask} variant="outline" className="border-white/10">Criar Primeira Tarefa</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastoralTasks.map(task => (
                      <div key={task.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-primary/30 text-primary">{task.status === 'done' ? 'Concluida' : 'Pendente'}</Badge>
                            <span className="text-xs text-white/40">{task.startDate || 'Sem data'}</span>
                          </div>
                          <h4 className="font-bold text-white">{task.title}</h4>
                          <p className="text-xs text-white/50">{task.description || 'Sem descricao adicional.'}</p>
                        </div>
                        <div className="flex gap-2">
                          {task.status !== 'done' ? (
                            <Button size="sm" onClick={() => updatePastoralTaskStatus(task, 'done')} className="bg-green-500 text-black hover:bg-green-400 font-bold">
                              <CheckCircle className="w-4 h-4 mr-2" /> Concluir
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => updatePastoralTaskStatus(task, 'todo')} className="border-white/10">
                              Reabrir
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="care" className="mt-0">
              <PastoralCareView isLoggedIn={true} userData={userData} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastorsList.length === 0 ? (
              <div className="md:col-span-2 lg:col-span-3 text-center p-12 bg-zinc-900 border border-white/10 border-dashed rounded-[2.5rem]">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhum pastor cadastrado</h3>
                <p className="text-white/60">{pastorsError || 'A liderança pastoral sera exibida aqui quando os cadastros reais forem inseridos.'}</p>
              </div>
            ) : pastorsList.map(pastor => (
              <div key={pastor.id} className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-4">
                  <img src={pastor.image} alt={pastor.name} className="w-16 h-16 rounded-full border-2 border-primary/20 object-cover" />
                  <div>
                    <h3 className="font-bold text-lg">{pastor.name}</h3>
                    <Badge variant="outline" className="border-white/10 text-white/60 text-xs mt-1">{pastor.role}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pastor Form Modal */}
      <AnimatePresence>
        {showPastorForm && editingPastor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-2xl font-bold mb-6">{editingPastor.id ? 'Editar Pastor' : 'Novo Pastor'}</h3>
              <form onSubmit={handleSavePastor} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Nome</label>
                  <Input required value={editingPastor.name} onChange={e => setEditingPastor({ ...editingPastor, name: e.target.value })} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Cargo/Função</label>
                  <Input required value={editingPastor.role} onChange={e => setEditingPastor({ ...editingPastor, role: e.target.value })} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">URL da Foto</label>
                  <Input required value={editingPastor.image} onChange={e => setEditingPastor({ ...editingPastor, image: e.target.value })} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Horários Disponíveis (separados por vírgula)</label>
                  <Input required value={editingPastor.availableTimes} onChange={e => setEditingPastor({ ...editingPastor, availableTimes: e.target.value })} className="bg-black border-white/10" placeholder="14:00, 15:00, 16:00" />
                </div>
                
                <h4 className="text-sm font-bold text-white mt-6 mb-2">Redes Sociais (URLs)</h4>
                <div className="space-y-2">
                  <Input value={editingPastor.social?.instagram || ''} onChange={e => setEditingPastor({ ...editingPastor, social: { ...editingPastor.social, instagram: e.target.value } })} className="bg-black border-white/10" placeholder="Instagram URL" />
                  <Input value={editingPastor.social?.youtube || ''} onChange={e => setEditingPastor({ ...editingPastor, social: { ...editingPastor.social, youtube: e.target.value } })} className="bg-black border-white/10" placeholder="YouTube URL" />
                  <Input value={editingPastor.social?.facebook || ''} onChange={e => setEditingPastor({ ...editingPastor, social: { ...editingPastor.social, facebook: e.target.value } })} className="bg-black border-white/10" placeholder="Facebook URL" />
                </div>
                
                <div className="pt-6 flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => { setShowPastorForm(false); setEditingPastor(null); }} className="flex-1 text-white/40 hover:text-white">Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-primary text-black font-bold">Salvar Pastor</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Need to import Badge at the top, let's add it.

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Facebook, Instagram, Youtube, Calendar, AlertCircle, Edit3, Trash2, Plus, Clock, CheckCircle, ListTodo, Users, Search } from 'lucide-react';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { auth } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { trpc } from '../../lib/trpc-client';
import { postJson } from '../../lib/api/http';
import { PastoralCareView } from '../../components/PastoralCareView';
import { pagePreset } from '../../lib/motion/presets';

export function PastoresNativeClient() {
  const router = useRouter();
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
  
  const [userData, setUserData] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPastors = async () => {
    try {
      const data = await trpc.pastors.getPastors.query();
      setPastorsList(data || []);
      setPastorsError('');
    } catch (e) {
      console.error(e);
      setPastorsList([]);
      setPastorsError('Nao foi possivel carregar os pastores agora.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await trpc.pastors.getAppointments.query();
      setAppointments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await trpc.pastors.getTasks.query();
      setPastoralTasks(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const token = await user.getIdTokenResult();
        const profileType = String(token.claims.profileType || 'member');
        const roles = Array.isArray(token.claims.roles) ? token.claims.roles.map(String) : [];
        setUserData({
          id: user.uid,
          tenantId: token.claims.tenantId,
          roles,
          profileType
        });
        
        fetchPastors();
        if (roles.includes('admin') || roles.includes('pastor') || profileType === 'pastor' || roles.includes('networkPastor') || roles.includes('auxPastor') || roles.includes('seniorPastor')) {
           fetchAppointments();
           fetchTasks();
        }
      } else {
        setIsLoggedIn(false);
        setUserData(null);
        fetchPastors();
      }
    });
    return () => unsub();
  }, []);

  const isAdmin = userData?.roles?.includes('admin');
  const isLeader = isAdmin || userData?.profileType === 'pastor' || userData?.roles?.some((r: string) => ['networkPastor', 'auxPastor', 'seniorPastor'].includes(r));

  const availableDates = Array.from({ length: 7 }, (_, i) => {
     const d = new Date();
     d.setDate(d.getDate() + i + 1);
     return d;
  }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  const availableTimes = (selectedPastor?.availableTimes && selectedPastor.availableTimes.length > 0)
    ? selectedPastor.availableTimes
    : ['14:00', '15:00', '16:00', '17:00', '18:00'];

  const handleSavePastor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pData = {
        name: editingPastor.name,
        role: editingPastor.role,
        image: editingPastor.image,
        social: editingPastor.social || { facebook: '', instagram: '', youtube: '' },
        availableTimes: typeof editingPastor.availableTimes === 'string' 
           ? editingPastor.availableTimes.split(',').map((t: string) => t.trim()) 
           : (editingPastor.availableTimes || []),
      };

      await trpc.pastors.savePastor.mutate({
        id: editingPastor.id,
        ...pData
      });
      setShowPastorForm(false);
      setEditingPastor(null);
      fetchPastors();
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar pastor');
    }
  };

  const handleDeletePastor = async (id: string) => {
    if (confirm('Excluir pastor?')) {
      try {
        await trpc.pastors.deletePastor.mutate({ id });
        fetchPastors();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const updateAppointmentStatus = async (app: any, status: string) => {
    try {
      await trpc.pastors.updateAppointmentStatus.mutate({ id: app.id, status });
      fetchAppointments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBook = async () => {
    if (!isLoggedIn) {
       window.location.href = '/login';
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
        userName: auth.currentUser?.displayName || 'Membro',
        tenantId: userData.tenantId,
        date: selectedDate,
        time: selectedTime,
      };
      const response = await postJson<{ success: boolean; appointment: any; googleCalendarUrl: string }>('/api/pastoral/appointments', payload, { token });

      if (response.success) {
        setShowSuccess(true);
        setSelectedPastor(null);
        setSelectedDate('');
        setSelectedTime('');
        setTimeout(() => setShowSuccess(false), 3000);
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

  const updatePastoralTaskStatus = async (task: any, status: string) => {
    try {
      await trpc.pastors.updateTaskStatus.mutate({ id: task.id, status });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div {...pagePreset} className="space-y-20 pb-20 container mx-auto px-4 mt-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 min-h-[400px] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1438283173091-5dbf5c5a3206?q=80&w=1200&auto=format&fit=crop" 
            alt="Igreja Coroado" 
            className="w-full h-full object-cover grayscale opacity-40"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-20 p-8 md:p-20 max-w-3xl space-y-6">
          <div className="space-y-6">
            <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
              Liderança
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] font-serif italic text-white">
              Nossos Pastores
            </h1>
            <p className="text-xl text-white/60 leading-relaxed max-w-xl font-medium">
              Conheça os líderes que Deus levantou para guiar, cuidar e pastorear a família Coroado.
            </p>
          </div>
        </div>
      </section>

      {/* Unified Dashboard or Public Grid */}
      <section className="space-y-6">
        {isLeader ? (
          <Tabs value={activeTab} className="w-full space-y-8" onValueChange={setActiveTab}>
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
                   <Button variant="outline" className="border-white/10 text-white" onClick={() => {
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
              ) : pastorsList.map((pastor) => (
                <div key={pastor.id} className="bg-zinc-900 rounded-[2.5rem] overflow-hidden group relative aspect-[4/5] border border-white/10">
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
                        <a href={pastor.social.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all">
                          <Facebook className="w-5 h-5" />
                        </a>
                      )}
                      {pastor.social?.instagram && pastor.social.instagram !== '#' && (
                        <a href={pastor.social.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all">
                          <Instagram className="w-5 h-5" />
                        </a>
                      )}
                      {pastor.social?.youtube && pastor.social.youtube !== '#' && (
                        <a href={pastor.social.youtube} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all">
                          <Youtube className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button onClick={() => {
                        if (!userData) {
                          router.push('/login?redirect=/pastores');
                        } else {
                          setSelectedPastor(pastor);
                        }
                      }} size="sm" className="bg-primary text-black hover:bg-primary/90 font-bold w-full">
                        Agendar
                      </Button>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button size="icon" variant="outline" className="bg-black/40 border-white/10 text-white hover:bg-white/10 shrink-0" onClick={() => {
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
              ))}
              </div>
            </TabsContent>

            <TabsContent value="agenda" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-zinc-900 p-4 border border-white/10 rounded-2xl mb-6">
                  <div>
                    <h3 className="font-bold text-lg">Agenda pastoral</h3>
                    <p className="text-white/60 text-sm">Acompanhe solicitações aqui.</p>
                  </div>
                  <Button onClick={() => window.open('https://calendar.google.com/', '_blank')} variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white">
                    <Calendar className="w-4 h-4 mr-2" /> Abrir Agenda
                  </Button>
                </div>
                {appointments.length === 0 ? (
                  <div className="text-center p-12 bg-zinc-900 border border-white/10 rounded-[2.5rem] text-white/40">
                     Nenhum agendamento encontrado.
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
                            <div className="flex gap-2 pt-4">
                              {app.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" className="flex-1 bg-green-500/10 border-green-500/20 text-green-400" onClick={() => updateAppointmentStatus(app, 'approved')}>Aprovar</Button>
                                  <Button size="sm" variant="outline" className="flex-1 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => updateAppointmentStatus(app, 'declined')}>Rejeitar</Button>
                                </>
                              )}
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
                    <p className="text-white/60 text-sm">Gerencie acompanhamentos.</p>
                  </div>
                </div>
                {pastoralTasks.length === 0 ? (
                  <div className="text-center p-12 bg-black/40 border border-white/5 border-dashed rounded-3xl">
                    <ListTodo className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 mb-4">Nenhuma tarefa pastoral cadastrada.</p>
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
                            <Button size="sm" variant="outline" onClick={() => updatePastoralTaskStatus(task, 'todo')} className="border-white/10 text-white">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pastorsList.length === 0 ? (
              <div className="md:col-span-2 lg:col-span-3 text-center p-12 bg-zinc-900 border border-white/10 border-dashed rounded-[2.5rem]">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhum pastor cadastrado</h3>
                <p className="text-white/60">{pastorsError || 'A liderança pastoral sera exibida aqui quando os cadastros reais forem inseridos.'}</p>
              </div>
            ) : pastorsList.map((pastor) => (
              <div key={pastor.id} className="bg-zinc-900 rounded-[2.5rem] overflow-hidden group relative aspect-[4/5] border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                <img 
                  src={pastor.image} 
                  alt={pastor.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute bottom-0 left-0 right-0 p-10 z-20 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black font-serif italic text-white group-hover:text-primary transition-colors">{pastor.name}</h2>
                    <p className="text-primary font-bold uppercase tracking-widest text-xs">{pastor.role}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-2">
                    {pastor.social?.facebook && pastor.social.facebook !== '#' && (
                      <a href={pastor.social.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all">
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {pastor.social?.instagram && pastor.social.instagram !== '#' && (
                      <a href={pastor.social.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all">
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {pastor.social?.youtube && pastor.social.youtube !== '#' && (
                      <a href={pastor.social.youtube} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all">
                        <Youtube className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button onClick={() => {
                      if (!userData) {
                        router.push('/login?redirect=/pastores');
                      } else {
                        setSelectedPastor(pastor);
                      }
                    }} size="sm" className="bg-primary text-black hover:bg-primary/90 font-bold w-full">
                      Agendar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Agendamento Modal */}
      <AnimatePresence>
        {selectedPastor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden"
            >
              {showSuccess ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black font-serif italic text-white">Solicitação Enviada!</h3>
                  <p className="text-white/60 text-sm">O Pr. {selectedPastor.name} foi notificado.</p>
                </div>
              ) : (
                <>
                  <div className="p-8 border-b border-white/10">
                    <h3 className="text-2xl font-black font-serif italic text-white mb-2">Agendar Aconselhamento</h3>
                    <p className="text-white/60 text-sm flex items-center gap-2">
                      Com <span className="text-primary font-bold">{selectedPastor.name}</span>
                    </p>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Selecione a Data</label>
                      <div className="grid grid-cols-4 gap-2">
                        {availableDates.map(date => {
                          const dateStr = date.toISOString().split('T')[0];
                          const isSelected = selectedDate === dateStr;
                          return (
                            <button
                              key={dateStr}
                              onClick={() => setSelectedDate(dateStr)}
                              className={`p-3 rounded-xl border text-center transition-all ${
                                isSelected ? 'bg-primary border-primary text-black' : 'border-white/10 text-white/60 hover:border-white/30'
                              }`}
                            >
                              <div className="text-[10px] uppercase font-bold mb-1">
                                {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                              </div>
                              <div className="font-bold text-lg leading-none">
                                {date.getDate()}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {selectedDate && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Selecione o Horário</label>
                        <div className="grid grid-cols-3 gap-2">
                          {availableTimes.map((time: string) => {
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`p-3 rounded-xl border text-center transition-all ${
                                  isSelected ? 'bg-white border-white text-black font-bold' : 'border-white/10 text-white/60 hover:border-white/30'
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div className="p-6 bg-black/40 border-t border-white/10 flex gap-4">
                    <Button variant="ghost" className="flex-1 rounded-full text-white/40 hover:text-white" onClick={() => setSelectedPastor(null)}>
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1 bg-primary text-black font-bold rounded-full"
                      disabled={!selectedDate || !selectedTime || isSubmitting}
                      onClick={handleBook}
                    >
                      {isSubmitting ? 'Aguarde...' : 'Confirmar'}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <Input required value={editingPastor.name} onChange={e => setEditingPastor({ ...editingPastor, name: e.target.value })} className="bg-black border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Cargo/Função</label>
                  <Input required value={editingPastor.role} onChange={e => setEditingPastor({ ...editingPastor, role: e.target.value })} className="bg-black border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Foto do Pastor</label>
                  <ImageUpload 
                    value={editingPastor.image} 
                    onChange={url => setEditingPastor({ ...editingPastor, image: url })} 
                    folder="images/pastores"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Horários (separados por vírgula)</label>
                  <Input required value={editingPastor.availableTimes} onChange={e => setEditingPastor({ ...editingPastor, availableTimes: e.target.value })} className="bg-black border-white/10 text-white" placeholder="14:00, 15:00, 16:00" />
                </div>
                
                <h4 className="text-sm font-bold text-white mt-6 mb-2">Redes Sociais</h4>
                <div className="space-y-2">
                  <Input value={editingPastor.social?.instagram || ''} onChange={e => setEditingPastor({ ...editingPastor, social: { ...editingPastor.social, instagram: e.target.value } })} className="bg-black border-white/10 text-white" placeholder="Instagram URL" />
                  <Input value={editingPastor.social?.youtube || ''} onChange={e => setEditingPastor({ ...editingPastor, social: { ...editingPastor.social, youtube: e.target.value } })} className="bg-black border-white/10 text-white" placeholder="YouTube URL" />
                  <Input value={editingPastor.social?.facebook || ''} onChange={e => setEditingPastor({ ...editingPastor, social: { ...editingPastor.social, facebook: e.target.value } })} className="bg-black border-white/10 text-white" placeholder="Facebook URL" />
                </div>
                
                <div className="pt-6 flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => { setShowPastorForm(false); setEditingPastor(null); }} className="flex-1 text-white/40 hover:text-white rounded-full">Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-primary text-black font-bold rounded-full">Salvar Pastor</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

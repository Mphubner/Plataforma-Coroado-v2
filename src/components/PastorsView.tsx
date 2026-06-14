import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Facebook, Instagram, Youtube, Mail, ChevronRight, Calendar, X, AlertCircle, Edit3, Trash2, Plus, Clock, CheckCircle, ListTodo, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PastoralCareView } from './PastoralCareView';

const PASTORS = [
  {
    id: 'rafael',
    name: 'Rafael Vaillant',
    role: 'Pastor Presidente',
    image: 'https://i.imgur.com/guYg9mA.png',
    bookingUrl: 'https://calendly.com/coroado/rafael',
    social: {
      facebook: 'https://www.facebook.com/rafael.vaillant',
      instagram: 'https://www.instagram.com/rafaelvaillant.coroado/',
      youtube: 'https://www.youtube.com/@IgrejaCoroado'
    }
  },
  {
    id: 'fabricio',
    name: 'Fabricio Campos',
    role: 'Pastor de Rede',
    image: 'https://imgur.com/N4sRBgl.png',
    bookingUrl: 'https://calendly.com/coroado/fabricio',
    social: {
      facebook: '#',
      instagram: '#',
      youtube: 'https://www.youtube.com/@IgrejaCoroado'
    }
  },
  {
    id: 'alan',
    name: 'Alan Vaz',
    role: 'Pastor de Rede',
    image: 'https://i.imgur.com/dpggKK7.png',
    bookingUrl: 'https://calendly.com/coroado/alan',
    social: {
      facebook: '#',
      instagram: '#',
      youtube: 'https://www.youtube.com/@IgrejaCoroado'
    }
  }
];

export function PastorsView({ isAdmin, userData, isLoggedIn, onLoginClick }: { isAdmin?: boolean; userData?: any; isLoggedIn?: boolean; onLoginClick?: () => void }) {
  const [pastorsList, setPastorsList] = useState<any[]>(PASTORS);
  const [selectedPastor, setSelectedPastor] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [appointments, setAppointments] = useState<any[]>([]);
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

  const availableTimes = (selectedPastor?.availableTimes && selectedPastor.availableTimes.length > 0)
    ? selectedPastor.availableTimes
    : ['14:00', '15:00', '16:00', '17:00', '18:00'];

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
    try {
      const pData = {
        name: editingPastor.name,
        role: editingPastor.role,
        image: editingPastor.image,
        social: editingPastor.social || { facebook: '', instagram: '', youtube: '' },
        availableTimes: typeof editingPastor.availableTimes === 'string' 
           ? editingPastor.availableTimes.split(',').map((t: string) => t.trim()) 
           : (editingPastor.availableTimes || []),
        tenantId: userData?.tenantId || 'tenant-1'
      };

      if (editingPastor.id && editingPastor.id !== 'rafael' && editingPastor.id !== 'fabricio' && editingPastor.id !== 'alan') {
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
    if (id === 'rafael' || id === 'fabricio' || id === 'alan') return alert('Pastores padrão mockados não podem ser excluídos, exclua apenas os do banco de dados.');
    if (confirm('Excluir pastor?')) {
      await deleteDoc(doc(db, 'pastors', id));
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'pastoral_appointments', id), { status });
  };

  const handleBook = async () => {
    if (!isLoggedIn) {
       if (onLoginClick) onLoginClick();
       return;
    }
    if (!selectedDate || !selectedTime) return alert("Selecione data e hora.");
    setIsSubmitting(true);
    try {
      const appRef = await addDoc(collection(db, 'pastoral_appointments'), {
        pastorId: selectedPastor?.id || 'plantonista',
        pastorName: selectedPastor?.name || 'Pastor Plantonista',
        userId: userData?.id || '',
        userName: userData?.name || 'Membro',
        tenantId: userData?.tenantId || 'default',
        date: selectedDate,
        time: selectedTime,
        status: 'scheduled',
        createdAt: serverTimestamp()
      });
      setLastAppointment({ id: appRef.id, date: selectedDate, time: selectedTime, pastor: selectedPastor?.name || 'Pastor Plantonista' });
      setShowSuccess(true);
      setSelectedPastor(null);
      setSelectedDate('');
      setSelectedTime('');
    } catch (e) {
      console.error(e);
      alert("Erro ao agendar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let unsubPastors = () => {};
    let unsubApps = () => {};

    if (userData?.tenantId) {
      const q = query(collection(db, 'pastors'), where('tenantId', '==', userData.tenantId));
      unsubPastors = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setPastorsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setPastorsList(PASTORS);
        }
      });

      if (isAdmin || userData?.profileType === 'pastor') {
        const qA = query(collection(db, 'pastoral_appointments'), where('tenantId', '==', userData.tenantId));
        unsubApps = onSnapshot(qA, (snap) => {
          let apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (!isAdmin) {
             apps = apps.filter((a: any) => a.pastorId === userData.id || a.pastorName === userData.name);
          }
          setAppointments(apps);
        });
      }
    } else {
      setPastorsList(PASTORS);
    }

    return () => { unsubPastors(); unsubApps(); };
  }, [userData?.tenantId, userData?.id, isAdmin, userData?.profileType]);

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
              
              {isAdmin && activeTab === 'list' && (
                 <Button variant="outline" className="border-white/10" onClick={() => {
                    setEditingPastor({ name: '', role: '', image: '', social: { facebook: '', instagram: '', youtube: '' }, availableTimes: '14:00, 15:00, 16:00' });
                    setShowPastorForm(true);
                 }}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Pastor
                 </Button>
              )}
            </div>

            <TabsContent value="list" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pastorsList.map((pastor, index) => (
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
                    {pastor.social.facebook !== '#' && (
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
                    {pastor.social.instagram !== '#' && (
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
                    {pastor.social.youtube !== '#' && (
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
                    <h3 className="font-bold text-lg">Sincronização com Google Calendar</h3>
                    <p className="text-white/60 text-sm">Seus agendamentos marcados aparecerão aqui e no seu app do Google Agenda.</p>
                  </div>
                  <Button variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white">
                    <Calendar className="w-4 h-4 mr-2" /> Conectar Google
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
                              <Button size="sm" variant="outline" className="flex-1 bg-green-500/10 border-green-500/20 text-green-400" onClick={() => updateAppointmentStatus(app.id, 'approved')}>Aprovar</Button>
                              <Button size="sm" variant="outline" className="flex-1 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => updateAppointmentStatus(app.id, 'declined')}>Rejeitar</Button>
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
                    <h3 className="text-2xl font-black font-serif italic text-white">Google Tasks</h3>
                    <p className="text-white/60 text-sm">Gerencie suas tarefas pastorais diretamente da plataforma.</p>
                  </div>
                  <Button className="bg-white text-black hover:bg-white/90 font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
                  </Button>
                </div>
                <div className="text-center p-12 bg-black/40 border border-white/5 border-dashed rounded-3xl">
                  <ListTodo className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 mb-4">Você precisa conectar sua conta do Google Workspace para ver suas tarefas aqui.</p>
                  <Button variant="outline" className="border-white/10">Conectar Google Tasks</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="care" className="mt-0">
              <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8">
                <PastoralCareView userData={userData} isLoggedIn={isLoggedIn} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Public Portal Only */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pastorsList.map((pastor, index) => (
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
                      {pastor.social.facebook !== '#' && (
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
                      {pastor.social.instagram !== '#' && (
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
                      {pastor.social.youtube !== '#' && (
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
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="glass-card rounded-[2.5rem] p-12 md:p-20 text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-black font-serif italic text-white">Precisa de Aconselhamento?</h2>
          <p className="text-white/50 text-xl max-w-2xl mx-auto font-medium">
            Nossa equipe pastoral está pronta para ouvir, orar com você e oferecer direcionamento bíblico para os desafios da vida.
          </p>
        </div>
        <Button 
          onClick={() => setSelectedPastor({ isChoosing: true })}
          className="bg-primary text-black hover:bg-primary/90 font-black px-10 h-16 text-lg rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          Agendar com Pastor <ChevronRight className="ml-2 w-6 h-6" />
        </Button>
      </section>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedPastor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-zinc-900 border border-white/10 rounded-[2.5rem] max-w-lg w-full overflow-hidden relative"
            >
              <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={() => setSelectedPastor(null)}
                 className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black rounded-full z-10"
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="p-8 space-y-6">
                {selectedPastor.isChoosing ? (
                  <div>
                    <h3 className="text-2xl font-black font-serif italic leading-tight mb-2">Escolha um Pastor</h3>
                    <p className="text-white/60 mb-4">Com quem você gostaria de agendar seu aconselhamento?</p>
                    
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                       {pastorsList.map(p => (
                         <div 
                            key={p.id} 
                            onClick={() => setSelectedPastor(p)}
                            className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 hover:border-primary/50 cursor-pointer transition-all hover:bg-white/5 group"
                         >
                            <img src={p.image} alt={p.name} className="w-14 h-14 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                            <div>
                               <p className="font-bold text-white group-hover:text-primary transition-colors text-lg">{p.name}</p>
                               <p className="text-xs text-primary uppercase tracking-widest">{p.role}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-primary ml-auto transition-colors" />
                         </div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <Badge className="bg-primary/20 text-primary border-none mb-3">{selectedPastor.role || 'Aconselhamento'}</Badge>
                      <h3 className="text-2xl font-black font-serif italic leading-tight mb-2">Agendar com {selectedPastor.name}</h3>
                      <p className="text-white/60">Selecione um horário disponível para conversar com o pastor. Caso não esteja logado, você será direcionado para o acesso da plataforma.</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 block">Dia Disponível</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                           {availableDates.map(d => {
                              const dateStr = d.toISOString().split('T')[0];
                              return (
                                <button
                                   key={dateStr}
                                   onClick={() => setSelectedDate(dateStr)}
                                   className={`shrink-0 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${selectedDate === dateStr ? 'bg-primary text-black border-primary' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/30'}`}
                                >
                                   {d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')}
                                </button>
                              )
                           })}
                        </div>
                      </div>

                      {selectedDate && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 block mt-2">Horário</label>
                          <div className="flex flex-wrap gap-2">
                            {availableTimes.map(t => (
                              <button
                                 key={t}
                                 onClick={() => setSelectedTime(t)}
                                 className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${selectedTime === t ? 'bg-primary text-black border-primary' : 'bg-black/40 text-white/60 border-white/10 hover:border-white/30'}`}
                              >
                                 {t}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {!isLoggedIn && (
                      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3 rounded-xl flex items-start gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>Você precisará fazer login ou se cadastrar para confirmar este agendamento.</p>
                      </div>
                    )}

                    <Button 
                      onClick={handleBook} 
                      disabled={!selectedDate || !selectedTime || isSubmitting}
                      className="w-full h-14 bg-primary text-black font-bold uppercase tracking-wider"
                    >
                      {isSubmitting ? 'Reservando...' : (!isLoggedIn ? 'Continuar para Login' : 'Confirmar Agendamento')}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal with Calendar Sync */}
      <AnimatePresence>
        {showSuccess && lastAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-zinc-900 border border-white/10 rounded-[2.5rem] max-w-sm w-full overflow-hidden relative p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                 <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black font-serif italic text-white">Agendado!</h3>
              <p className="text-white/60 text-sm">
                 Seu aconselhamento com <strong className="text-white">{lastAppointment.pastor}</strong> foi reservado para o dia <strong>{new Date(lastAppointment.date).toLocaleDateString('pt-BR')}</strong> às <strong>{lastAppointment.time}</strong>.
              </p>
              <div className="space-y-3 pt-4">
                 <Button 
                   onClick={() => window.open(generateGoogleCalendarUrl(lastAppointment), '_blank')}
                   className="w-full bg-primary text-black font-bold h-12"
                 >
                   Adicionar ao Google Calendar
                 </Button>
                 <Button variant="ghost" onClick={() => setShowSuccess(false)} className="w-full text-white/40 hover:text-white">
                   Fechar
                 </Button>
              </div>
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

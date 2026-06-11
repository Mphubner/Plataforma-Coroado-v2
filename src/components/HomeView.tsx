import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Clock, MapPin, Calendar, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, limit, updateDoc, doc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';
import { CalendarCheck, Music } from 'lucide-react';
import { getHomeSections, routeById, type RouteId } from '@/src/lib/permissions';

export function HomeView({ onTabChange, userData }: { onTabChange: (tab: string) => void, userData?: any }) {
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null);
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [dbMinistries, setDbMinistries] = useState<any[]>([]);
  const [myScales, setMyScales] = useState<any[]>([]);
  const [sermonNotes, setSermonNotes] = useState(() => localStorage.getItem('coroado_sermon_notes') || '');
  const homeSections = getHomeSections(userData).filter((routeId): routeId is RouteId => Boolean(routeById[routeId]));

  useEffect(() => {
     // Fetch generic events
     const qEvents = query(collection(db, 'events'), limit(3));
     const unEv = onSnapshot(qEvents, (snap) => {
        setDbEvents(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a:any, b:any) => a.date?.localeCompare(b.date)));
     }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'events');
     });
     
     // Fetch ministries
     const qMin = query(collection(db, 'ministries'), limit(8));
     const unMin = onSnapshot(qMin, (snap) => {
        setDbMinistries(snap.docs.map(d => ({id: d.id, ...d.data()})));
     }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'ministries');
     });

     // Fetch scales if logged in
     let unScales: any = null;
     if (userData?.id) {
       const qScales = query(collection(db, 'scales'));
       unScales = onSnapshot(qScales, (snap) => {
          const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
          // Filter scales where this user is assigned
          const userScales = all.filter(s => s.assignments?.some((a:any) => a.memberId === userData.id));
          // Sort by date upcoming
          userScales.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMyScales(userScales);
       });
     }

     return () => { unEv(); unMin(); if (unScales) unScales(); }
  }, [userData]);

  const handleStatusChange = async (scaleId: string, status: string) => {
    const scale = myScales.find(s => s.id === scaleId);
    if (!scale || !userData?.id) return;
    try {
      const oldAssignments = scale.assignments || [];
      const newAssignments = oldAssignments.map((a: any) => 
        a.memberId === userData.id ? { ...a, status } : a
      );
      await updateDoc(doc(db, 'scales', scaleId), { assignments: newAssignments });
    } catch (e) {
      console.error(e);
      alert("Erro ao responder escala.");
    }
  };

  const ministries = dbMinistries.length > 0 ? dbMinistries.map(m => ({
    name: m.name, desc: m.description || "", img: m.image || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop", tab: "ministries"
  })) : [
    { name: "Ministérios", desc: "Aguardando carregamento de ministérios...", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop", tab: "ministries" }
  ];

  const events = dbEvents.length > 0 ? dbEvents.map(e => ({
     title: e.title, date: e.date, loc: e.location || 'Presencial', type: e.category || 'Evento', desc: e.description || ''
  })) : [
     { title: "Nenhum evento próximo", date: "-", loc: "-", type: "-", desc: "Aguarde novidades em breve." }
  ];

  return (
    <div className="space-y-20 pb-20">
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card p-8 md:p-12 rounded-[2.5rem] space-y-8"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 rounded-full hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>
              <div className="space-y-4">
                <Badge className="bg-primary/10 text-primary border-none font-bold px-4 py-1.5 rounded-full">{selectedEvent.type}</Badge>
                <h3 className="text-4xl font-black font-serif italic text-white leading-tight">{selectedEvent.title}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-white/60 font-medium">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>{selectedEvent.date}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60 font-medium">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>{selectedEvent.loc}</span>
                  </div>
                </div>
                <p className="text-lg text-white/60 leading-relaxed pt-4 border-t border-white/5">
                  {selectedEvent.desc}
                </p>
              </div>
              <Button onClick={() => onTabChange("events")} className="w-full h-14 bg-primary text-black font-black rounded-full text-lg shadow-lg shadow-primary/20">
                Ver Ingressos / Inscrição
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 p-8 md:p-20 min-h-[600px] flex items-center">
        <div className="relative z-10 max-w-3xl space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
              Bem-vindo à Igreja Coroado
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] font-serif"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            UM LUGAR PARA <br />
            <span className="text-primary italic font-light">PERTENCER</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-white/60 leading-relaxed max-w-xl font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Nós somos uma igreja em células, apaixonada por Jesus e comprometida em transformar vidas através do amor e do serviço.
          </motion.p>
          
          <motion.div 
            className="flex flex-wrap gap-4 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button 
              size="lg" 
              onClick={() => onTabChange("cell")}
              className="bg-primary text-black hover:bg-primary/90 rounded-full px-10 h-14 text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              Encontrar uma Célula
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => document.getElementById('novo-aqui-modal')?.classList.remove('hidden')}
              className="border-primary/50 text-primary hover:bg-primary/10 rounded-full px-10 h-14 text-lg font-bold backdrop-blur-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Heart className="w-5 h-5" /> Novo Aqui?
            </Button>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-full md:w-2/3 h-full opacity-40 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent z-10" />
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 1.5 }}
            src="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=1200&auto=format&fit=crop" 
            alt="Background" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight font-serif italic text-white">Seu painel</h2>
            <p className="text-white/50">Atalhos liberados para o seu perfil atual.</p>
          </div>
          <Badge variant="outline" className="border-white/10 text-white/60">{homeSections.length} areas</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {homeSections.map(routeId => {
            const route = routeById[routeId];
            return (
              <button
                key={route.id}
                onClick={() => onTabChange(route.id)}
                className="group rounded-2xl border border-white/10 bg-zinc-900/70 p-5 text-left hover:border-primary/60 hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-primary/80 font-black">{route.navGroup}</p>
                    <h3 className="mt-2 text-xl font-black text-white">{route.label}</h3>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {true && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              <h2 className="text-3xl font-black tracking-tight font-serif italic text-white">Culto Ao Vivo</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 overflow-hidden rounded-[2rem] bg-zinc-900 border border-red-500/20 aspect-video relative">
                <iframe 
                  className="w-full h-full absolute inset-0"
                  src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&controls=1" 
                  title="Culto Ao Vivo" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
              <div className="bg-zinc-900 rounded-[2rem] border border-white/10 p-6 flex flex-col h-full">
                <h3 className="text-xl font-bold mb-4 font-serif italic">Minhas Notas</h3>
                <p className="text-sm text-white/50 mb-4">Anotações são salvas localmente enquanto você assiste.</p>
                <textarea 
                  value={sermonNotes}
                  onChange={(event) => setSermonNotes(event.target.value)}
                  className="flex-1 w-full bg-black/50 border border-white/5 rounded-xl p-4 text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans text-sm"
                  placeholder="Escreva aqui as anotações da pregação..."
                ></textarea>
                <Button
                  className="mt-4 w-full bg-zinc-800 hover:bg-zinc-700 text-white border-none rounded-xl h-12"
                  onClick={() => {
                    localStorage.setItem('coroado_sermon_notes', sermonNotes);
                    alert('Anotacoes salvas neste dispositivo.');
                  }}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Minhas Escalas */}
      <AnimatePresence>
        {myScales.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <CalendarCheck className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-black tracking-tight font-serif italic text-white">Minhas Escalas</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myScales.map(scale => {
                 const myAssign = scale.assignments?.find((a:any) => a.memberId === userData?.id);
                 return (
                   <div key={scale.id} className="relative overflow-hidden rounded-[2rem] bg-zinc-900 border border-primary/20 p-6 flex flex-col justify-between group hover:border-primary/50 transition-colors">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
                     <div className="space-y-4">
                       <div>
                         <h3 className="text-xl font-bold mb-1">{scale.eventName}</h3>
                         <p className="text-sm text-white/50">{new Date(scale.date).toLocaleDateString('pt-BR')} às {scale.time}</p>
                       </div>
                       
                       <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                         <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Minha Função</p>
                         <p className="font-medium text-primary">{myAssign?.role || 'Servidor'}</p>
                       </div>
                       
                       {scale.setlist && scale.setlist.length > 0 && (
                         <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                           <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Repertório</p>
                           <ul className="space-y-1">
                             {scale.setlist.slice(0, 3).map((s: string, idx: number) => (
                               <li key={idx} className="flex items-center gap-2 text-sm text-white/70">
                                 <Music className="w-3 h-3 text-primary" />
                                 <span className="truncate">{s}</span>
                               </li>
                             ))}
                             {scale.setlist.length > 3 && <li className="text-xs text-white/40 italic">+{scale.setlist.length - 3} músicas</li>}
                           </ul>
                         </div>
                       )}
                     </div>

                     <div className="pt-6 mt-6 border-t border-white/10">
                       {myAssign?.status === 'pending' ? (
                         <div className="flex gap-3">
                           <Button onClick={() => handleStatusChange(scale.id, 'accepted')} className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black font-bold">Aceitar</Button>
                           <Button onClick={() => handleStatusChange(scale.id, 'declined')} variant="outline" className="flex-1 border-white/10 hover:bg-red-500/20 hover:text-red-400 font-bold">Recusar</Button>
                         </div>
                       ) : (
                         <div className="flex justify-center items-center py-2 bg-black/40 rounded-xl">
                            <span className={`text-sm font-bold uppercase tracking-widest ${myAssign?.status === 'accepted' ? 'text-green-400' : 'text-red-400'}`}>
                              {myAssign?.status === 'accepted' ? 'Presença Confirmada' : 'Recusado'}
                            </span>
                         </div>
                       )}
                     </div>
                   </div>
                 );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Ministries Carousel */}
      <section className="space-y-10">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight font-serif italic">Nossos Ministérios</h2>
          <p className="text-white/50 text-lg">Descubra como você pode servir e crescer em nossa comunidade através dos nossos 14 ministérios ativos.</p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {ministries.map((min, i) => (
              <CarouselItem key={i} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="group relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 cursor-pointer"
                  onClick={() => onTabChange(min.tab)}
                >
                  <img 
                    src={min.img} 
                    alt={min.name} 
                    className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110 grayscale group-hover:grayscale-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2">
                    <h3 className="text-2xl font-black font-serif italic text-primary">{min.name}</h3>
                    <p className="text-sm text-white/70 leading-relaxed font-medium">{min.desc}</p>
                    <Button 
                      variant="link" 
                      onClick={() => onTabChange(min.tab)}
                      className="text-white p-0 h-auto font-bold text-xs uppercase tracking-widest group-hover:text-primary transition-colors"
                    >
                      Saiba Mais <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-4 mt-8">
            <CarouselPrevious className="static translate-y-0 bg-white/5 border-white/10 hover:bg-primary hover:text-black" />
            <CarouselNext className="static translate-y-0 bg-white/5 border-white/10 hover:bg-primary hover:text-black" />
          </div>
        </Carousel>
      </section>

      {/* Upcoming Events */}
      <section className="space-y-10">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight font-serif italic">Agenda</h2>
            <p className="text-white/50">Não perca nada do que está acontecendo na Coroado.</p>
          </div>
          <Button onClick={() => onTabChange("events")} variant="outline" className="rounded-full border-white/10 hover:bg-white/5 font-bold">Ver Calendário Completo</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {events.map((event, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedEvent(event)}
              className="glass-card p-8 rounded-[2rem] space-y-6 cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 rounded-full">{event.type}</Badge>
                <Calendar className="h-5 w-5 text-white/20 group-hover:text-primary transition-colors" />
              </div>
              <div className="space-y-4">
                <h3 className="font-black text-2xl font-serif italic leading-tight group-hover:text-primary transition-colors">{event.title}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-white/50 font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/50 font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{event.loc}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* NOVO AQUI MODAL */}
      <div id="novo-aqui-modal" className="fixed inset-0 z-[100] hidden">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={(e) => {
          if (e.target === e.currentTarget) {
            document.getElementById('novo-aqui-modal')?.classList.add('hidden');
          }
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg glass-card p-8 rounded-[2.5rem] flex flex-col items-center text-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => document.getElementById('novo-aqui-modal')?.classList.add('hidden')}
            className="absolute top-6 right-6 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
            <Heart className="w-8 h-8" />
          </div>
          
          <h3 className="text-3xl font-black font-serif italic mb-2">Bem-vindo à Família!</h3>
          <p className="text-white/60 mb-8 max-w-sm">
            Que alegria ter você com a gente. Preencha rapidinho para te conhecermos melhor e conectarmos você a uma célula perto de casa!
          </p>

          <div className="w-full space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase">Seu Nome</label>
              <Input placeholder="Como gosta de ser chamado?" className="bg-black/50 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase">WhatsApp</label>
              <Input placeholder="(00) 00000-0000" className="bg-black/50 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase">Onde você mora? (Bairro)</label>
              <Input placeholder="Ex: Muquiçaba..." className="bg-black/50 border-white/10" />
            </div>
            
            <Button 
              className="w-full h-12 bg-primary text-black font-bold uppercase tracking-wider mt-4"
              onClick={() => {
                alert("Obrigado! Nossos líderes entrarão em contato com você em breve!");
                document.getElementById('novo-aqui-modal')?.classList.add('hidden');
              }}
            >
              Enviar Saudação
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

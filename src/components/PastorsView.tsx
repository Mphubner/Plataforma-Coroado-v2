import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Facebook, Instagram, Youtube, Mail, ChevronRight, Calendar, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

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

  const availableDates = Array.from({ length: 7 }, (_, i) => {
     const d = new Date();
     d.setDate(d.getDate() + i + 1);
     return d;
  }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  const availableTimes = ['14:00', '15:00', '16:00', '17:00', '18:00'];

  const handleBook = async () => {
    if (!isLoggedIn) {
       if (onLoginClick) onLoginClick();
       return;
    }
    if (!selectedDate || !selectedTime) return alert("Selecione data e hora.");
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'pastoral_appointments'), {
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
      alert("Aconselhamento agendado com sucesso!");
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

  React.useEffect(() => {
    const q = userData?.tenantId
      ? query(collection(db, 'pastors'), where('tenantId', '==', userData.tenantId))
      : query(collection(db, 'pastors'));

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPastorsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setPastorsList(PASTORS); // Fallback para lista mock enquanto não há pastores no DB
      }
    });
    return () => unsub();
  }, [userData?.tenantId]);

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

      {/* Pastors Grid */}
      <section className="space-y-6">
        {isAdmin && (
          <div className="flex justify-end">
             <Button variant="outline" className="border-white/10" onClick={() => alert("Gerenciamento de Pastores será integrado ao painel Gestão")}>
                + Adicionar Pastor
             </Button>
          </div>
        )}
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
                  <Button 
                    onClick={() => setSelectedPastor(pastor)}
                    size="sm" 
                    className="bg-primary text-black hover:bg-primary/90 font-bold ml-auto"
                  >
                    Agendar
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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
          onClick={() => setSelectedPastor({ id: 'plantonista', name: 'Pastor Plantonista', role: 'Aconselhamento Geral' })}
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Need to import Badge at the top, let's add it.

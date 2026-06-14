import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Users, HandHeart, ChevronRight, Instagram, Plus, Calendar as CalendarIcon, Settings, HeartPulse, HeartHandshake } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/permissions';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// --- SUBCOMPONENTS FOR TABS ---

function PublicPortal({ onLoginClick, isLoggedIn, userData }: { onLoginClick?: () => void; isLoggedIn?: boolean; userData?: any }) {
  const [publicProfs, setPublicProfs] = useState<SocialProfessional[]>([]);
  const [selectedProf, setSelectedProf] = useState<SocialProfessional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  React.useEffect(() => {
    const q = query(collection(db, 'social_professionals'), where('isPublic', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      setPublicProfs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialProfessional)));
    });
    return () => unsub();
  }, []);

  const handleBooking = async () => {
    if (!isLoggedIn) { onLoginClick?.(); return; }
    if (!selectedDate || !selectedTime || !selectedProf) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'social_appointments'), {
        userName: userData?.name || 'Usuário',
        userId: userData?.uid || 'anonymous',
        professionalId: selectedProf.id,
        professionalName: selectedProf.name,
        specialty: selectedProf.specialty,
        date: selectedDate,
        time: selectedTime,
        status: 'pending',
        price: selectedProf.price || null,
        paymentStatus: selectedProf.price ? 'pending' : 'paid',
        createdAt: serverTimestamp(),
        tenantId: 'default'
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedProf(null);
      }, 3000);
    } catch (e) {
      console.error(e);
      alert('Erro ao agendar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="space-y-20 pb-20 mt-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 min-h-[500px] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 1.5 }}
            src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000&auto=format&fit=crop" 
            alt="Coroado Social" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-20 p-8 md:p-20 max-w-3xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
              ONG Coroado Social
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] font-serif italic text-white">
              Amor em <br />
              <span className="text-primary">Ação</span>
            </h1>
            <p className="text-xl text-white/60 leading-relaxed max-w-xl font-medium">
              O Coroado Social é o braço de assistência da nossa igreja. Acreditamos que o evangelho transforma não apenas o espírito, mas também a realidade social da nossa comunidade.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button 
                onClick={() => {
                  if (isLoggedIn) {
                    window.open('https://wa.me/5527999999999?text=Olá! Gostaria de ser um servo no Coroado Social.', '_blank')
                  } else {
                    onLoginClick?.();
                  }
                }}
                className="bg-primary text-black hover:bg-primary/90 font-black px-10 h-14 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Heart className="mr-2 w-5 h-5" /> Seja um Servo
              </Button>
              <a 
                href="https://www.instagram.com/social.coroado/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-white/10 hover:bg-white/5 rounded-full px-10 h-14 font-bold backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                )}
              >
                <Instagram className="mr-2 w-5 h-5" /> @social.coroado
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Users, val: "+500", label: "Famílias Atendidas" },
          { icon: HandHeart, val: "+10t", label: "Alimentos Doados" },
          { icon: Heart, val: "120", label: "Servos Ativos" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="glass-card p-10 rounded-[2.5rem] flex flex-col items-center text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <stat.icon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-5xl font-black font-serif italic text-white">{stat.val}</h3>
              <p className="text-white/40 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Profissionais / Agendamentos */}
      <section className="space-y-10">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight font-serif italic">Nossos Profissionais</h2>
            <p className="text-white/50">Agende um atendimento social ou clínico com nossa rede de apoio.</p>
          </div>
        </div>
        
        {publicProfs.length === 0 ? (
          <div className="border border-white/5 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-white/50">Nenhum profissional disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publicProfs.map((prof, index) => (
              <motion.div
                key={prof.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
              >
                <div className="glass-card rounded-[2.5rem] overflow-hidden group relative aspect-[4/5]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                  <img 
                    src={prof.photoUrl || 'https://via.placeholder.com/400'} 
                    alt={prof.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-10 z-20 space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black font-serif italic text-white group-hover:text-primary transition-colors">{prof.name}</h2>
                      <p className="text-primary font-bold uppercase tracking-widest text-xs">{prof.specialty}</p>
                    </div>
                    {prof.price ? (
                       <Badge className="bg-white/10 text-white border-white/20">Clínico - R$ {prof.price.toFixed(2)}</Badge>
                    ) : (
                       <Badge className="bg-primary/20 text-primary border-primary/20">Social - Gratuito</Badge>
                    )}
                    <div className="pt-2">
                      <Button 
                        onClick={() => setSelectedProf(prof)}
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

      {/* Projects */}
      <section className="space-y-10">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight font-serif italic">Nossos Projetos</h2>
            <p className="text-white/50">Conheça as frentes de atuação do Coroado Social.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[
            { 
              title: "Cestas Básicas", 
              desc: "Distribuição mensal de alimentos para famílias em situação de vulnerabilidade social cadastradas em nosso programa.",
              img: "https://images.unsplash.com/photo-1593113565214-8cb20299600b?q=80&w=800&auto=format&fit=crop"
            },
            { 
              title: "Apoio Escolar", 
              desc: "Reforço escolar e distribuição de material didático para crianças e adolescentes da comunidade.",
              img: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop"
            }
          ].map((proj, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="glass-card rounded-[2.5rem] overflow-hidden group"
            >
              <div className="h-64 overflow-hidden relative">
                <img 
                  src={proj.img} 
                  alt={proj.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
              </div>
              <div className="p-10 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black font-serif italic text-white group-hover:text-primary transition-colors">{proj.title}</h3>
                  <p className="text-white/60 leading-relaxed font-medium">{proj.desc}</p>
                </div>
                <Button variant="link" className="text-white p-0 h-auto font-black text-xs uppercase tracking-widest group-hover:text-primary transition-colors">
                  Saber mais <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedProf && (
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
                    <HeartHandshake className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black font-serif italic text-white">Agendamento Solicitado!</h3>
                  <p className="text-white/60 text-sm max-w-[250px]">
                    {selectedProf.price ? 'Sua solicitação foi recebida. Um administrador entrará em contato para o pagamento.' : 'O profissional foi notificado e você receberá as instruções em breve.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-8 border-b border-white/10">
                    <h3 className="text-2xl font-black font-serif italic text-white mb-2">Agendar Atendimento</h3>
                    <p className="text-white/60 text-sm flex items-center gap-2">
                      Com <span className="text-primary font-bold">{selectedProf.name}</span> ({selectedProf.specialty})
                    </p>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Selecione a Data</label>
                      <div className="grid grid-cols-4 gap-2">
                        {availableDates.map(date => {
                          const isSelected = selectedDate === date;
                          return (
                            <button
                              key={date}
                              onClick={() => setSelectedDate(date)}
                              className={`p-3 rounded-xl border text-center transition-all ${
                                isSelected ? 'bg-primary border-primary text-black' : 'border-white/10 text-white/60 hover:border-white/30'
                              }`}
                            >
                              <div className="text-[10px] uppercase font-bold mb-1">
                                {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                              </div>
                              <div className="font-bold text-lg leading-none">
                                {new Date(date + 'T12:00:00').getDate()}
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
                          {(selectedProf.availableTimes || ['09:00', '10:00', '14:00', '15:00']).map(time => {
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
                    <Button variant="ghost" className="flex-1 rounded-full text-white/40 hover:text-white" onClick={() => setSelectedProf(null)}>
                      Cancelar
                    </Button>
                    <Button 
                      className={`flex-1 rounded-full font-bold ${selectedProf.price ? 'bg-green-500 hover:bg-green-600 text-black' : 'bg-primary hover:bg-primary/90 text-black'}`}
                      disabled={!selectedDate || !selectedTime || isSubmitting}
                      onClick={handleBooking}
                    >
                      {isSubmitting ? 'Aguarde...' : selectedProf.price ? `Agendar e Pagar R$ ${selectedProf.price.toFixed(2)}` : 'Confirmar (Gratuito)'}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface SocialProfessional {
  id?: string;
  name: string;
  specialty: string;
  email: string;
  photoUrl: string;
  isPublic: boolean;
  price?: number | null;
  availableTimes?: string[];
  tenantId?: string;
}

function ProfessionalsTab() {
  const [professionals, setProfessionals] = useState<SocialProfessional[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProf, setEditingProf] = useState<Partial<SocialProfessional> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfessionals = async () => {
    setIsLoading(true);
    try {
      const q = collection(db, 'social_professionals');
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SocialProfessional[];
      setProfessionals(data);
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProfessionals();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProf?.name || !editingProf?.specialty) return;

    try {
      if (editingProf.id) {
        await updateDoc(doc(db, 'social_professionals', editingProf.id), editingProf);
      } else {
        await addDoc(collection(db, 'social_professionals'), {
          ...editingProf,
          createdAt: serverTimestamp(),
          tenantId: 'default'
        });
      }
      setShowModal(false);
      setEditingProf(null);
      fetchProfessionals();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar profissional. Verifique as permissões do Firebase.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este profissional?")) return;
    try {
      await deleteDoc(doc(db, 'social_professionals', id));
      fetchProfessionals();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  return (
    <div className="space-y-8 mt-8">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight font-serif italic">Profissionais Cadastrados</h2>
          <p className="text-white/50">Gerencie a rede de profissionais de assistência social e saúde.</p>
        </div>
        <Button onClick={() => { setEditingProf({ isPublic: true, name: '', specialty: '', email: '', photoUrl: '' }); setShowModal(true); }} className="bg-primary text-black hover:bg-primary/90 font-bold px-6 h-12 rounded-full">
          <Plus className="mr-2 h-5 w-5" /> Novo Profissional
        </Button>
      </div>

      {isLoading ? (
        <p className="text-white/50">Carregando...</p>
      ) : professionals.length === 0 ? (
        <div className="border border-white/5 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center text-center space-y-4">
          <HeartPulse className="w-12 h-12 text-white/20" />
          <p className="text-white/50">Nenhum profissional cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map(prof => (
            <div key={prof.id} className="bg-zinc-900 border border-white/10 rounded-[2rem] p-6 space-y-4 relative group">
              <div className="flex items-center gap-4">
                <img src={prof.photoUrl || 'https://via.placeholder.com/150'} alt={prof.name} className="w-16 h-16 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{prof.name}</h3>
                  <p className="text-primary text-sm uppercase tracking-widest font-bold">{prof.specialty}</p>
                </div>
              </div>
              <div className="text-sm text-white/60 space-y-1">
                <p>{prof.email}</p>
                <p>Status: {prof.isPublic ? <span className="text-green-400">Público</span> : <span className="text-yellow-400">Oculto</span>}</p>
              </div>
              <div className="flex gap-2 pt-4 border-t border-white/10">
                <Button variant="outline" size="sm" onClick={() => { setEditingProf(prof); setShowModal(true); }} className="flex-1 border-white/10 text-white hover:bg-white/10">Editar</Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(prof.id!)} className="border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white">Excluir</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && editingProf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-2xl font-black font-serif italic mb-6">{editingProf.id ? 'Editar Profissional' : 'Novo Profissional'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Nome Completo</label>
                  <Input required value={editingProf.name} onChange={e => setEditingProf({ ...editingProf, name: e.target.value })} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Especialidade / Cargo (ex: Psicólogo, Advogado)</label>
                  <Input required value={editingProf.specialty} onChange={e => setEditingProf({ ...editingProf, specialty: e.target.value })} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Email (para integração de agenda)</label>
                  <Input type="email" required value={editingProf.email} onChange={e => setEditingProf({ ...editingProf, email: e.target.value })} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">URL Fotografia</label>
                  <Input value={editingProf.photoUrl} onChange={e => setEditingProf({ ...editingProf, photoUrl: e.target.value })} className="bg-black border-white/10" placeholder="https://..." />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <label className="text-xs font-bold text-white/60">Preço do Atendimento (R$)</label>
                    <Input type="number" min="0" step="0.01" value={editingProf.price || ''} onChange={e => setEditingProf({ ...editingProf, price: e.target.value ? parseFloat(e.target.value) : null })} className="bg-black border-white/10" placeholder="Ex: 50.00 (Deixe em branco p/ gratuito)" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-xs font-bold text-white/60">Horários (separados por vírgula)</label>
                    <Input value={editingProf.availableTimes?.join(', ') || ''} onChange={e => setEditingProf({ ...editingProf, availableTimes: e.target.value.split(',').map(t => t.trim()) })} className="bg-black border-white/10" placeholder="14:00, 15:00" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 pb-4">
                  <input type="checkbox" id="isPublic" checked={editingProf.isPublic} onChange={e => setEditingProf({ ...editingProf, isPublic: e.target.checked })} className="w-4 h-4 rounded border-white/10 bg-black accent-primary" />
                  <label htmlFor="isPublic" className="text-sm font-bold text-white">Mostrar publicamente na página (Portal Público)</label>
                </div>
                
                <div className="pt-2 flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setEditingProf(null); }} className="flex-1 text-white/40 hover:text-white rounded-full">Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-primary text-black font-bold rounded-full">{editingProf.id ? 'Salvar' : 'Cadastrar'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppointmentsTab() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(query(collection(db, 'social_appointments')), (snap) => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const total = appointments.length;
  const socialCount = appointments.filter(a => !a.price).length;
  const clinicalCount = appointments.filter(a => a.price > 0).length;

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'social_appointments', id), { status });
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar status.');
    }
  };

  return (
    <div className="space-y-8 mt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-white/10 rounded-[1.5rem]">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-white/50 font-bold uppercase tracking-widest text-[10px]">Total Atendimentos</p>
                <p className="text-4xl font-black font-serif italic text-white">{total}</p>
              </div>
              <HeartPulse className="h-6 w-6 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10 rounded-[1.5rem]">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-white/50 font-bold uppercase tracking-widest text-[10px]">Atendimentos Sociais</p>
                <p className="text-4xl font-black font-serif italic text-white">{socialCount}</p>
              </div>
              <HandHeart className="h-6 w-6 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10 rounded-[1.5rem]">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-white/50 font-bold uppercase tracking-widest text-[10px]">Agendamentos Clínicos</p>
                <p className="text-4xl font-black font-serif italic text-white">{clinicalCount}</p>
              </div>
              <Users className="h-6 w-6 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-[2rem] overflow-hidden">
        <div className="grid grid-cols-6 text-[10px] font-bold text-white/40 uppercase tracking-widest p-6 border-b border-white/5">
          <div>Data/Hora</div>
          <div>Beneficiário</div>
          <div>Profissional</div>
          <div>Tipo / Preço</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
        </div>
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-white/50 text-sm">Carregando...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-white/50 text-sm">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {appointments.map(app => (
              <div key={app.id} className="grid grid-cols-6 items-center p-6 text-sm hover:bg-white/5 transition-colors">
                <div className="font-bold text-white">{app.date} <span className="text-white/40 font-normal">{app.time}</span></div>
                <div>{app.userName}</div>
                <div>
                  <p className="font-bold">{app.professionalName}</p>
                  <p className="text-[10px] text-white/40">{app.specialty}</p>
                </div>
                <div>
                  {app.price ? (
                    <Badge className="bg-white/10 text-white border-white/20 text-[10px]">Clínico (R$ {app.price})</Badge>
                  ) : (
                    <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px]">Social (Grátis)</Badge>
                  )}
                </div>
                <div>
                  <Badge variant="outline" className={`text-[10px] ${
                    app.status === 'pending' ? 'border-yellow-500/50 text-yellow-500' :
                    app.status === 'approved' ? 'border-green-500/50 text-green-500' :
                    app.status === 'completed' ? 'border-blue-500/50 text-blue-500' :
                    'border-red-500/50 text-red-500'
                  }`}>
                    {app.status}
                  </Badge>
                </div>
                <div className="flex justify-end gap-2">
                  {app.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] border-green-500/20 text-green-500 hover:bg-green-500/10" onClick={() => handleUpdateStatus(app.id, 'approved')}>Aprovar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => handleUpdateStatus(app.id, 'declined')}>Recusar</Button>
                    </>
                  )}
                  {app.status === 'approved' && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] border-blue-500/20 text-blue-500 hover:bg-blue-500/10" onClick={() => handleUpdateStatus(app.id, 'completed')}>Concluir</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN VIEW ---

export function SocialView({ 
  onLoginClick, 
  isLoggedIn = false, 
  isAdmin = false,
  userData = null 
}: { 
  onLoginClick?: () => void; 
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  userData?: UserProfile | null;
}) {
  const [activeTab, setActiveTab] = useState("portal");

  if (!isAdmin) {
    return <PublicPortal onLoginClick={onLoginClick} isLoggedIn={isLoggedIn} />;
  }

  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900/50 border border-white/10 p-1.5 rounded-full h-auto flex flex-wrap gap-2 inline-flex w-full overflow-x-auto justify-start hide-scrollbar">
          <TabsTrigger 
            value="portal"
            className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all whitespace-nowrap"
          >
            Portal Público
          </TabsTrigger>
          <TabsTrigger 
            value="config"
            className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all whitespace-nowrap"
            disabled
          >
            Config
          </TabsTrigger>
          <TabsTrigger 
            value="professionals"
            className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all whitespace-nowrap"
          >
            Profissionais
          </TabsTrigger>
          <TabsTrigger 
            value="projects"
            className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all whitespace-nowrap"
            disabled
          >
            Projetos
          </TabsTrigger>
          <TabsTrigger 
            value="appointments"
            className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black text-white/60 hover:text-white transition-all whitespace-nowrap"
          >
            Atendimentos
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="portal" className="mt-0 outline-none">
              <PublicPortal onLoginClick={onLoginClick} isLoggedIn={isLoggedIn} />
            </TabsContent>
            
            <TabsContent value="professionals" className="mt-0 outline-none">
              <ProfessionalsTab />
            </TabsContent>

            <TabsContent value="appointments" className="mt-0 outline-none">
              <AppointmentsTab />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

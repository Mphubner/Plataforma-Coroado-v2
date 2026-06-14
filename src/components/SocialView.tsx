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

function PublicPortal({ onLoginClick, isLoggedIn }: { onLoginClick?: () => void; isLoggedIn?: boolean }) {
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
  return (
    <div className="space-y-8 mt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-white/10 rounded-[1.5rem]">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-white/50 font-bold uppercase tracking-widest text-[10px]">Total Atendimentos</p>
                <p className="text-4xl font-black font-serif italic text-white">0</p>
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
                <p className="text-4xl font-black font-serif italic text-white">0</p>
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
                <p className="text-4xl font-black font-serif italic text-white">0</p>
              </div>
              <Users className="h-6 w-6 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-[2rem] overflow-hidden">
        <div className="grid grid-cols-5 text-[10px] font-bold text-white/40 uppercase tracking-widest p-6 border-b border-white/5">
          <div>Data/Hora</div>
          <div>Beneficiário</div>
          <div>Serviço</div>
          <div>Profissional</div>
          <div>Status</div>
        </div>
        <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
          <p className="text-white/50 text-sm">Nenhum registro encontrado.</p>
        </div>
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

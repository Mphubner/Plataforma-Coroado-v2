import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Calendar, MapPin, Search, Plus, Filter, Target, Award, ArrowUpRight, Copy, Share2, MoreVertical, Crosshair, CheckSquare, MessageSquare, Shield, Clock, Phone, QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, getDocs, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { can } from '@/src/lib/permissions';
import { CellManagementDashboard } from './CellManagementDashboard';

export function CellProvider({ children }: { children: React.ReactNode }) {
  // We keep this to not break App.tsx, but make it invisible/noop.
  // The actual state will be managed locally in CellsView or Redux/Zustand if needed.
  return <>{children}</>;
}

export function CellView({ isLoggedIn, isLeader, onTabChange, userData }: { isLoggedIn: boolean; isLeader: boolean; onTabChange: (tab: string) => void; userData?: any }) {
  // If no cell, show public view. Else show dashboard.
  const [userCell, setUserCell] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !userData?.cellId) {
      setUserCell(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'cells', userData.cellId), (docSnap) => {
      if (docSnap.exists()) {
        setUserCell({ id: docSnap.id, ...docSnap.data() });
      } else {
        setUserCell(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [isLoggedIn, userData?.cellId]);

  if (loading) return <div className="flex justify-center py-20"><span className="animate-pulse">Carregando...</span></div>;

  if (!isLoggedIn || !userCell) {
    return <CellPublicView onTabChange={onTabChange} userData={userData} />;
  }

  return <CellManagementDashboard isLeader={isLeader || can(userData, 'manage:cell')} cell={userCell} userData={userData} />;
}

function CellPublicView({ onTabChange, userData }: { onTabChange: (tab: string) => void; userData: any }) {
  const [cells, setCells] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("Todas as Regiões");
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCell, setNewCell] = useState({ name: "", neighborhood: "", day: "", time: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = userData?.tenantId 
      ? query(collection(db, 'cells'), where('tenantId', '==', userData.tenantId))
      : query(collection(db, 'cells')); // Se não logado, busca todas da igreja
      
    const unsub = onSnapshot(q, (snap) => setCells(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, [userData?.tenantId]);

  const isAdmin = userData?.roles?.includes('admin') || userData?.roles?.includes('supervisor');

  const pendingCells = cells.filter(cell => cell.status === 'pending_approval');

  const filteredCells = cells.filter(cell => 
    cell.status !== 'pending_approval' &&
    (cell.name?.toLowerCase().includes(search.toLowerCase()) ||
    cell.neighborhood?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return alert("Você precisa estar logado para solicitar uma célula.");
    setIsSubmitting(true);
    try {
      const { createCell } = await import('@/src/lib/services/cellsService');
      await createCell({
        ...newCell,
        leaderId: userData.id,
        tenantId: userData.tenantId
      });
      alert("Célula solicitada com sucesso! Aguarde a aprovação de um administrador.");
      setShowCreateModal(false);
      setNewCell({ name: "", neighborhood: "", day: "", time: "", phone: "" });
    } catch (err: any) {
      console.error(err);
      alert("Erro ao solicitar célula: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <section className="bg-zinc-900 border border-white/10 p-8 md:p-12 rounded-[2rem]">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black mb-4">Pequenos Grupos</h1>
            <p className="text-white/60 text-lg max-w-2xl">
              Acreditamos que o pastoreio e o discipulado verdadeiro acontecem de perto. Encontre a célula mais próxima de você!
            </p>
          </div>
          {userData?.roles?.includes('cellLeader') && (
            <Button onClick={() => setShowCreateModal(true)} className="bg-primary text-black font-bold whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" /> Solicitar Nova Célula
            </Button>
          )}
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <Input 
                placeholder="Buscar por bairro, nome..." 
                className="pl-12 h-14 bg-black/50 border-white/10 text-base rounded-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              className="h-14 bg-black/50 border border-white/10 rounded-full px-6 text-white outline-none focus:border-primary/50 w-full sm:w-auto appearance-none"
            >
              <option value="Todas as Regiões">Todas as Regiões</option>
              <option value="Centro">Centro</option>
              <option value="Norte">Norte</option>
              <option value="Sul">Sul</option>
            </select>
          </div>
          <div className="flex bg-black/50 p-1 border border-white/10 rounded-full w-full sm:w-auto overflow-hidden shrink-0">
            <Button 
              variant="ghost" 
              className={`flex-1 sm:flex-none rounded-full h-12 px-6 transition-all ${viewMode === 'map' ? 'bg-primary text-black font-bold' : 'text-white/60 hover:text-white'}`}
              onClick={() => setViewMode('map')}
            >
              <MapPin className="w-4 h-4 mr-2" /> Mapa Interativo
            </Button>
            <Button 
              variant="ghost" 
              className={`flex-1 sm:flex-none rounded-full h-12 px-6 transition-all ${viewMode === 'list' ? 'bg-primary text-black font-bold' : 'text-white/60 hover:text-white'}`}
              onClick={() => setViewMode('list')}
            >
              <Users className="w-4 h-4 mr-2" /> Ver em Lista
            </Button>
          </div>
        </div>
      </section>

      {isAdmin && pendingCells.length > 0 && (
        <section className="bg-yellow-500/10 border border-yellow-500/30 p-6 md:p-8 rounded-[2rem]">
          <h2 className="text-2xl font-bold text-yellow-500 mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6" /> Aprovações Pendentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingCells.map(cell => (
              <div key={cell.id} className="p-5 bg-zinc-900 border border-yellow-500/30 rounded-2xl">
                <h4 className="font-serif italic text-xl">{cell.name}</h4>
                <div className="mt-3 space-y-2 text-sm text-white/60">
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {cell.neighborhood}</p>
                  <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {cell.day} às {cell.time}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    onClick={async () => {
                      try {
                        const { approveCell } = await import('@/src/lib/services/cellsService');
                        await approveCell(cell.id);
                      } catch (e) {
                        console.error(e);
                        alert("Erro ao aprovar: " + (e as Error).message);
                      }
                    }}
                  >
                    Aprovar
                  </Button>
                  <Button 
                    className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    onClick={async () => {
                      try {
                        const { rejectCell } = await import('@/src/lib/services/cellsService');
                        await rejectCell(cell.id);
                      } catch (e) {
                        console.error(e);
                        alert("Erro ao rejeitar: " + (e as Error).message);
                      }
                    }}
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {viewMode === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest pl-2">Células Próximas ({filteredCells.length})</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredCells.map(cell => (
                <div key={cell.id} className="p-5 bg-zinc-900 border border-white/10 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => window.open(`https://wa.me/${cell.phone || ''}?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre a célula ' + cell.name)}`, '_blank')}>
                  <h4 className="font-serif italic text-xl group-hover:text-primary transition-colors">{cell.name}</h4>
                  <div className="mt-3 space-y-2 text-sm text-white/60">
                    <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-primary" /> {cell.neighborhood}</p>
                    <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary" /> {cell.day} às {cell.time}</p>
                  </div>
                </div>
              ))}
              {filteredCells.length === 0 && (
                <div className="text-center p-6 text-white/40 italic">Nenhuma célula encontrada.</div>
              )}
            </div>
          </div>
          <div className="lg:col-span-3 h-[500px] lg:h-[600px] bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10 relative">
             <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d119642.13111452174!2d-40.58405063073994!3d-20.67287955567406!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb856417743d839%3A0x6a21ec8d8cebf207!2sGuarapari%2C%20ES!5e0!3m2!1spt-BR!2sbr!4v1718000000000!5m2!1spt-BR!2sbr" width="100%" height="100%" style={{border:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCells.map(cell => {
           const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cell.neighborhood + " " + (cell.city || "Guarapari"))}`;
           return (
            <Card key={cell.id} className="bg-zinc-900 border-white/10 overflow-hidden group hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="flex justify-between items-start">
                  <span className="font-serif italic text-2xl group-hover:text-primary transition-colors">{cell.name}</span>
                  <Badge variant="outline" className="border-white/20">{cell.day}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <MapPin className="w-4 h-4 text-primary" /> {cell.neighborhood}
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/20 hover:text-primary h-8" onClick={() => window.open(mapLink, '_blank')}>
                    <MapPin className="w-3 h-3 mr-1" /> Ver Rota
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <Clock className="w-4 h-4 text-primary" /> {cell.time}
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <Button 
                    className="bg-primary text-black font-bold w-full"
                    onClick={() => {
                      const message = encodeURIComponent(`Olá! Quero conhecer mais sobre a ${cell.name} localizada em ${cell.neighborhood}.`);
                      window.open(`https://wa.me/${cell.phone || ''}?text=${message}`);
                    }}
                  >
                    Entrar em Contato
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredCells.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/40 border border-dashed border-white/10 rounded-2xl">
            Nenhuma célula encontrada para esta pesquisa.
          </div>
        )}
      </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Solicitar Nova Célula</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateCell} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white/60 block mb-1">Nome da Célula *</label>
                  <Input required value={newCell.name} onChange={e => setNewCell({...newCell, name: e.target.value})} className="bg-black border-white/10" placeholder="Ex: Célula Esperança" />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/60 block mb-1">Bairro *</label>
                  <Input required value={newCell.neighborhood} onChange={e => setNewCell({...newCell, neighborhood: e.target.value})} className="bg-black border-white/10" placeholder="Ex: Centro" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-white/60 block mb-1">Dia da Semana *</label>
                    <select required value={newCell.day} onChange={e => setNewCell({...newCell, day: e.target.value})} className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white h-10">
                      <option value="">Selecione</option>
                      <option value="Segunda-feira">Segunda-feira</option>
                      <option value="Terça-feira">Terça-feira</option>
                      <option value="Quarta-feira">Quarta-feira</option>
                      <option value="Quinta-feira">Quinta-feira</option>
                      <option value="Sexta-feira">Sexta-feira</option>
                      <option value="Sábado">Sábado</option>
                      <option value="Domingo">Domingo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/60 block mb-1">Horário *</label>
                    <Input required type="time" value={newCell.time} onChange={e => setNewCell({...newCell, time: e.target.value})} className="bg-black border-white/10" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-white/60 block mb-1">Telefone / WhatsApp *</label>
                  <Input required value={newCell.phone} onChange={e => setNewCell({...newCell, phone: e.target.value})} className="bg-black border-white/10" placeholder="(00) 00000-0000" />
                </div>
                <div className="pt-4 flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-primary text-black">
                    {isSubmitting ? "Enviando..." : "Solicitar Aprovação"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



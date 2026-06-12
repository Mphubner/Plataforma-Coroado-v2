import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Calendar, MapPin, Search, Plus, Filter, Target, Award, ArrowUpRight, Copy, Share2, MoreVertical, Crosshair, CheckSquare, MessageSquare, Shield, Clock, Phone, QrCode } from 'lucide-react';
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

  useEffect(() => {
    const q = userData?.tenantId 
      ? query(collection(db, 'cells'), where('tenantId', '==', userData.tenantId))
      : query(collection(db, 'cells')); // Se não logado, busca todas da igreja
      
    const unsub = onSnapshot(q, (snap) => setCells(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, [userData?.tenantId]);

  const filteredCells = cells.filter(cell => 
    cell.name?.toLowerCase().includes(search.toLowerCase()) ||
    cell.neighborhood?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      <section className="bg-zinc-900 border border-white/10 p-8 md:p-12 rounded-[2rem]">
        <h1 className="text-4xl font-black mb-4">Pequenos Grupos</h1>
        <p className="text-white/60 text-lg mb-8 max-w-2xl">
          Acreditamos que o pastoreio e o discipulado verdadeiro acontecem de perto. Encontre a célula mais próxima de você!
        </p>
        
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
    </div>
  );
}



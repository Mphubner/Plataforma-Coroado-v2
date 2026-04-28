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

  return <CellManagementView isLeader={isLeader || userData?.roles?.includes('Pastor da Sede') || userData?.roles?.includes('admin')} cell={userCell} userData={userData} />;
}

function CellPublicView({ onTabChange, userData }: { onTabChange: (tab: string) => void; userData: any }) {
  const [cells, setCells] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!userData?.tenantId) return;
    const q = query(collection(db, 'cells'), where('tenantId', '==', userData.tenantId));
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
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <Input 
            placeholder="Buscar por bairro ou nome..." 
            className="pl-10 h-14 bg-black/50 border-white/10 text-lg rounded-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCells.map(cell => (
          <Card key={cell.id} className="bg-zinc-900 border-white/10 overflow-hidden group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <CardTitle className="flex justify-between items-start">
                <span className="font-serif italic text-2xl group-hover:text-primary transition-colors">{cell.name}</span>
                <Badge variant="outline" className="border-white/20">{cell.day}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-white/60">
                <MapPin className="w-4 h-4 text-primary" /> {cell.neighborhood}
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <Clock className="w-4 h-4 text-primary" /> {cell.time}
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-end">
                <Button 
                  className="bg-primary text-black font-bold w-full"
                  onClick={() => {
                    const message = encodeURIComponent(`Olá! Quero conhecer mais sobre a ${cell.name}.`);
                    window.open(`https://wa.me/${cell.phone || ''}?text=${message}`);
                  }}
                >
                  Entrar em Contato
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredCells.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/40 border border-dashed border-white/10 rounded-2xl">
            Nenhuma célula encontrada para esta pesquisa.
          </div>
        )}
      </div>
    </div>
  );
}

function CellManagementView({ isLeader, cell, userData }: { isLeader: boolean; cell: any; userData: any }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [members, setMembers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!cell?.id || !userData?.tenantId) return;
    const qM = query(collection(db, 'users'), where('tenantId', '==', userData.tenantId), where('cellId', '==', cell.id));
    const unsubM = onSnapshot(qM, (snap) => setMembers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    const qR = query(collection(db, 'cell_reports'), where('tenantId', '==', userData.tenantId), where('cellId', '==', cell.id));
    const unsubR = onSnapshot(qR, (snap) => setReports(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubM(); unsubR(); };
  }, [cell?.id, userData?.tenantId]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-serif italic">{cell.name}</h1>
          <p className="text-white/60 flex items-center gap-2 mt-2">
            <MapPin className="w-4 h-4" /> {cell.neighborhood} • <Clock className="w-4 h-4 ml-2" /> {cell.day} às {cell.time}
          </p>
        </div>
        <div className="flex gap-2">
          {isLeader && (
            <Button className="bg-primary text-black font-bold">
              <CheckSquare className="mr-2 h-4 w-4" /> Novo Relatório
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-zinc-900 border border-white/10 p-1 rounded-full flex w-fit">
          <TabsTrigger value="dashboard" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Resumo</TabsTrigger>
          <TabsTrigger value="members" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Membros ({members.length})</TabsTrigger>
          {isLeader && <TabsTrigger value="reports" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Relatórios</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-8 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-zinc-900 border-white/10">
              <CardContent className="p-6">
                <p className="text-[10px] uppercase font-bold text-white/40 mb-2">Membros Ativos</p>
                <p className="text-4xl font-black text-primary">{members.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardContent className="p-6">
                <p className="text-[10px] uppercase font-bold text-white/40 mb-2">Aulas Concluídas na Escola IDE</p>
                <p className="text-4xl font-black text-white">45</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardContent className="p-6">
                <p className="text-[10px] uppercase font-bold text-white/40 mb-2">Última Reunião</p>
                <p className="text-xl font-bold mt-2">
                  {reports.length > 0 ? new Date(Math.max(...reports.map(r => new Date(r.date).getTime()))).toLocaleDateString() : "Nenhum registro"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader><CardTitle>Nossa Família</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10 border border-white/10">
                        <AvatarFallback>{m.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold">{m.name}</p>
                        <p className="text-xs text-white/60">{m.roles?.join(', ')}</p>
                      </div>
                    </div>
                    <div>
                        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/20 hover:text-primary">Ver Perfil</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isLeader && (
          <TabsContent value="reports" className="mt-6">
             <Card className="bg-zinc-900 border-white/10">
               <CardHeader><CardTitle>Histórico de Relatórios</CardTitle></CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   {reports.length === 0 ? (
                     <div className="text-center p-6 text-white/40 italic text-sm">Nenhum relatório lançado ainda.</div>
                   ) : (
                     reports.map(r => (
                       <div key={r.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                         <div>
                           <p className="font-bold">{new Date(r.date).toLocaleDateString()}</p>
                           <p className="text-sm text-white/60">Presentes: {r.present} | Visitantes: {r.visitors}</p>
                         </div>
                         <Button variant="outline" size="sm" className="border-white/10">Abrir</Button>
                       </div>
                     ))
                   )}
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

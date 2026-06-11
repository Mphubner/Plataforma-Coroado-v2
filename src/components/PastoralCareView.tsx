import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, BrainCircuit, EyeOff, Search, Heart, MapPin, HandHeart, MessageCircle, AlertTriangle, Filter, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Types
export type VisitorLead = {
  id: string;
  name: string;
  phone: string;
  neighborhood: string;
  dateVisited: string;
  source: string;
  status: 'new' | 'contacted' | 'assigned' | 'converted';
  assignedCellId?: string;
  notes?: string;
  tenantId?: string;
};

export type PrayerRequest = {
  id: string;
  authorName: string;
  date: string;
  reason: string;
  details: string;
  isPrivate: boolean;
  status: 'open' | 'praying' | 'answered';
  tenantId?: string;
};

export type RiskAlert = {
  id: string;
  memberId: string;
  memberName: string;
  weeksAbsent: number;
  lastCellDate: string;
  riskLevel: 'medium' | 'high' | 'critical';
  tenantId?: string;
};

// Mocks
const MOCK_LEADS: VisitorLead[] = [
  { id: 'v1', name: 'Ricardo Almeida', phone: '27 99999-1111', neighborhood: 'Centro', dateVisited: '2023-11-05', source: 'Instagram', status: 'new' },
  { id: 'v2', name: 'Laura Mendonça', phone: '27 99999-2222', neighborhood: 'Muquiçaba', dateVisited: '2023-11-05', source: 'Amigo (Indicação)', status: 'contacted', notes: 'Ligamos ontem, ela amou o culto.' },
  { id: 'v3', name: 'Thiago Costa', phone: '27 99999-3333', neighborhood: 'Praia do Morro', dateVisited: '2023-10-29', source: 'Site', status: 'assigned', assignedCellId: '2' },
];

const MOCK_PRAYERS: PrayerRequest[] = [
  { id: 'p1', authorName: 'Carlos Silva', date: '2023-11-06', reason: 'Cirurgia do pai', details: 'Meu pai fará cateterismo amanha as 8h.', isPrivate: false, status: 'praying' },
  { id: 'p2', authorName: 'Anônimo (Membro 12)', date: '2023-11-05', reason: 'Crise conjugal', details: 'Peço oração pelo meu casamento. Muita briga.', isPrivate: true, status: 'open' },
  { id: 'p3', authorName: 'Juliana Paes', date: '2023-11-02', reason: 'Emprego', details: 'Fiz a entrevista final, orem por porta aberta!', isPrivate: false, status: 'answered' },
];

const MOCK_ALERTS: RiskAlert[] = [
  { id: 'a1', memberId: 'm7', memberName: 'Roberto Dias', weeksAbsent: 4, lastCellDate: '2023-10-05', riskLevel: 'high' },
  { id: 'a2', memberId: 'm8', memberName: 'Sônia Freitas', weeksAbsent: 3, lastCellDate: '2023-10-12', riskLevel: 'medium' },
  { id: 'a3', memberId: 'm9', memberName: 'Luiz Fernando', weeksAbsent: 6, lastCellDate: '2023-09-21', riskLevel: 'critical' },
];

export function PastoralCareView({ isLoggedIn = true, userData }: { isLoggedIn?: boolean; userData?: any }) {
  const [activeTab, setActiveTab] = useState<'visitors' | 'prayers' | 'alerts'>('visitors');
  const [leads, setLeads] = useState<VisitorLead[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);

  const [selectedLead, setSelectedLead] = useState<VisitorLead | null>(null);
  const tenantId = userData?.tenantId;

  useEffect(() => {
    if (!tenantId) return;

    const unsubLeads = onSnapshot(query(collection(db, 'visitor_leads'), where('tenantId', '==', tenantId)), (snap) => {
      if (snap.empty && import.meta.env.DEV) setLeads(MOCK_LEADS);
      else if (snap.empty) setLeads([]);
      else setLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitorLead)));
    });

    const unsubPrayers = onSnapshot(query(collection(db, 'prayer_requests'), where('tenantId', '==', tenantId)), (snap) => {
      if (snap.empty && import.meta.env.DEV) setPrayers(MOCK_PRAYERS);
      else if (snap.empty) setPrayers([]);
      else setPrayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrayerRequest)));
    });

    const unsubAlerts = onSnapshot(query(collection(db, 'risk_alerts'), where('tenantId', '==', tenantId)), (snap) => {
      if (snap.empty && import.meta.env.DEV) setAlerts(MOCK_ALERTS);
      else if (snap.empty) setAlerts([]);
      else setAlerts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiskAlert)));
    });

    return () => {
      unsubLeads();
      unsubPrayers();
      unsubAlerts();
    };
  }, [tenantId]);

  const handleUpdateLeadStatus = async (id: string, newStatus: VisitorLead['status']) => {
    try {
      const docRef = doc(db, 'visitor_leads', id);
      await updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() });
      setSelectedLead(null);
    } catch (e) {
      console.error(e);
      alert("Nao foi possivel atualizar o visitante.");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold tracking-tight">Gestão Pastoral</h1>
            <Badge className="bg-red-500/20 text-red-500 border-none px-3 py-1 uppercase tracking-widest text-[10px]">Acesso Restrito</Badge>
          </div>
          <p className="text-white/60">Acompanhamento e consolidação de visitantes, pedidos de oração e membros em risco.</p>
        </div>
      </div>

      <div className="flex gap-2 bg-zinc-900 border border-white/10 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
        <button 
          onClick={() => setActiveTab("visitors")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "visitors" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <HandHeart className="w-4 h-4" />
            Jornada do Visitante
            {leads.filter(l => l.status === 'new').length > 0 && (
              <span className="bg-primary text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {leads.filter(l => l.status === 'new').length}
              </span>
            )}
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("prayers")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "prayers" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Mural de Oração
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "alerts" ? "bg-red-500/20 text-red-400" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertas de Ausência
             {alerts.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {alerts.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length}
              </span>
            )}
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'visitors' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['new', 'contacted', 'assigned', 'converted'].map((statusLine) => (
                  <div key={statusLine} className="bg-zinc-900 border border-white/10 rounded-2xl p-4 min-h-[400px] flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-white/60">
                        {statusLine === 'new' && '📍 Novos Leads'}
                        {statusLine === 'contacted' && '💬 Contatados'}
                        {statusLine === 'assigned' && '🏠 Na Célula'}
                        {statusLine === 'converted' && '✅ Membros'}
                      </h3>
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{leads.filter(l => l.status === statusLine).length}</span>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      {leads.filter(l => l.status === statusLine).map(lead => (
                        <Card 
                          key={lead.id} 
                          className="bg-black border-white/5 cursor-pointer hover:border-white/20 transition-colors"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <p className="font-bold leading-none mb-1">{lead.name}</p>
                              <p className="text-[10px] text-white/40">{lead.dateVisited} • {lead.source}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/60">
                              <MapPin className="w-3 h-3 text-primary" /> {lead.neighborhood}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {leads.filter(l => l.status === statusLine).length === 0 && (
                        <p className="text-xs text-center text-white/20 py-8 italic">Vazio no momento</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'prayers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prayers.map(prayer => (
                <div key={prayer.id} className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-white/20 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                        {prayer.isPrivate ? <EyeOff className="w-4 h-4 text-red-400" /> : prayer.authorName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${prayer.isPrivate ? 'text-red-400' : 'text-white'}`}>{prayer.authorName}</p>
                        <p className="text-[10px] text-white/40">{prayer.date}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`
                      ${prayer.status === 'open' ? 'border-primary/50 text-primary' : ''}
                      ${prayer.status === 'praying' ? 'border-blue-500/50 text-blue-400' : ''}
                      ${prayer.status === 'answered' ? 'border-green-500/50 text-green-400' : ''}
                    `}>
                      {prayer.status === 'open' && 'Novo'}
                      {prayer.status === 'praying' && 'Em Oração'}
                      {prayer.status === 'answered' && 'Respondido'}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{prayer.reason}</h4>
                    <p className="text-sm text-white/60 leading-relaxed italic border-l-2 border-white/10 pl-3">"{prayer.details}"</p>
                  </div>
                  {prayer.isPrivate && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-md flex gap-2">
                      <Shield className="w-4 h-4 shrink-0" />
                      Este pedido foi marcado como sigiloso. Restrito apenas à equipe pastoral.
                    </div>
                  )}
                  {prayer.status !== 'answered' && (
                    <Button 
                        variant="outline" 
                        className="w-full border-white/10 hover:bg-white/5 transition-all text-xs h-8"
                        onClick={async () => {
                            if (prayer.status === 'open') {
                                try {
                                    await updateDoc(doc(db, 'prayer_requests', prayer.id), { status: 'praying', updatedAt: serverTimestamp() });
                                } catch (e) {
                                    console.error(e);
                                    alert("Erro");
                                }
                            } else if (prayer.status === 'praying') {
                                try {
                                    await updateDoc(doc(db, 'prayer_requests', prayer.id), { status: 'answered', updatedAt: serverTimestamp() });
                                } catch (e) {
                                    console.error(e);
                                    alert("Erro");
                                }
                            }
                        }}
                    >
                       {prayer.status === 'open' ? 'Marcar como "Estou Orando"' : 'Marcar como "Respondido"'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-red-500/10 p-4 border border-red-500/20 rounded-xl max-w-3xl">
                <BrainCircuit className="w-6 h-6 text-red-500 shrink-0" />
                <p className="text-sm text-red-200">
                  Sistema de Alerta: Membros sem check-in na célula ou atividades ministeriais há mais de 3 semanas caem nesta lista de Risco de Evasão. Priorize o contato imediato.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alerts.map(alert => (
                  <Card key={alert.id} className={`bg-zinc-900 border-l-4 ${
                    alert.riskLevel === 'critical' ? 'border-l-red-600 border-white/10' :
                    alert.riskLevel === 'high' ? 'border-l-orange-500 border-white/10' :
                    'border-l-yellow-500 border-white/10'
                  }`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{alert.memberName}</CardTitle>
                        <Badge variant="outline" className={`${
                          alert.riskLevel === 'critical' ? 'text-red-500 border-red-500/50' :
                          alert.riskLevel === 'high' ? 'text-orange-500 border-orange-500/50' :
                          'text-yellow-500 border-yellow-500/50'
                        }`}>
                          Falta de {alert.weeksAbsent} Semanas
                        </Badge>
                      </div>
                      <CardDescription>Última presença: {alert.lastCellDate}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white" size="sm">
                          <MessageCircle className="w-4 h-4 mr-2" /> Contatar pelo WhatsApp
                        </Button>
                        <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white" size="sm">
                          Transferir para Líder de Célula
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Visitor Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedLead.name}</h3>
                    <p className="text-white/60">Lead / Visitante</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedLead(null)} className="h-8 w-8 text-white/50 hover:text-white">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="space-y-4 text-sm bg-black/40 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/40">Contato</span>
                    <span className="font-medium">{selectedLead.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/40">Bairro</span>
                    <span className="font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-primary"/> {selectedLead.neighborhood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Origem</span>
                    <span className="font-medium">{selectedLead.source}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Ações de Consolidação</p>
                  
                  {selectedLead.status === 'new' && (
                    <Button onClick={() => handleUpdateLeadStatus(selectedLead.id, 'contacted')} className="w-full bg-primary text-black font-bold">
                      Marcar como Contatado / Ligou
                    </Button>
                  )}
                  {selectedLead.status === 'contacted' && (
                    <Button onClick={() => handleUpdateLeadStatus(selectedLead.id, 'assigned')} className="w-full bg-yellow-500 text-black font-bold">
                      Vincular a uma Célula Próxima
                    </Button>
                  )}
                  {selectedLead.status === 'assigned' && (
                    <Button onClick={() => handleUpdateLeadStatus(selectedLead.id, 'converted')} className="w-full bg-green-500 text-black font-bold">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Batizou / Tornou-se Membro
                    </Button>
                  )}
                  
                  <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                    Adicionar Nota no Histórico
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

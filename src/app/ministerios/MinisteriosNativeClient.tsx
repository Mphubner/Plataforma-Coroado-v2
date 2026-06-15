'use client';

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Users, Calendar, CheckCircle2, AlertCircle, Plus, Search, ChevronRight, Music, Heart, Camera, Coffee, Shield, Clock, XCircle, BookOpen, Home, CalendarCheck, GraduationCap, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { trpc } from "../../lib/trpc-client";
import { can } from "../../lib/permissions";
import { pagePreset } from "../../lib/motion/presets";

// Types
export type BriefingStatus = 'todo' | 'in-progress' | 'done' | 'pending' | 'accepted' | 'declined' | 'completed';

export type Briefing = {
  id: string;
  ministryId: string;
  requesterMinistry: string;
  title: string;
  description: string;
  deadline: string;
  status: BriefingStatus;
  assigneeId?: string;
  tenantId?: string;
};

export type CalendarEvent = {
  id: string;
  ministryId: string;
  title: string;
  date: string;
  type: 'post' | 'event' | 'meeting';
  tenantId?: string;
};

export type MemberMetrics = {
  cellAttendance: number;
  ideProgress: number;
  scalePresence: number;
};

export type MinistryMember = {
  id: string; 
  name: string;
  role: string;
  joinDate: string;
  metrics?: MemberMetrics;
  avatar?: string;
};

export type ScaleStatus = 'pending' | 'accepted' | 'declined';

export type ScaleAssignment = {
  memberId: string;
  role: string;
  status: ScaleStatus;
};

export type Scale = {
  id: string;
  ministryId: string;
  eventName: string;
  date: string;
  time: string;
  assignments: ScaleAssignment[];
  notes?: string;
  setlist?: string[];
  tenantId?: string;
};

export type RequiredTrack = {
  id: string;
  name: string;
  description: string;
};

export type Ministry = {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  leaderName: string;
  icon: string;
  requiredTracks?: RequiredTrack[];
  members?: MinistryMember[];
  tenantId?: string;
};

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'music': return <Music className="w-6 h-6" />;
    case 'camera': return <Camera className="w-6 h-6" />;
    case 'coffee': return <Coffee className="w-6 h-6" />;
    case 'heart': return <Heart className="w-6 h-6" />;
    case 'shield': return <Shield className="w-6 h-6" />;
    default: return <Users className="w-6 h-6" />;
  }
};

const getHealthColor = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
};

const getHealthBg = (score: number) => {
  if (score >= 80) return "bg-green-400";
  if (score >= 60) return "bg-yellow-400";
  return "bg-red-400";
};

export function MinisteriosNativeClient() {
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [selectedMinistry, setSelectedMinistry] = React.useState<Ministry | null>(null);
  const [ministryMembers, setMinistryMembers] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [scales, setScales] = React.useState<Scale[]>([]);
  const [briefings, setBriefings] = React.useState<Briefing[]>([]);
  
  const [showBriefingForm, setShowBriefingForm] = React.useState(false);
  const [showScaleForm, setShowScaleForm] = React.useState(false);
  const [newScale, setNewScale] = React.useState<Partial<Scale>>({
    eventName: '',
    date: '',
    time: '',
    setlist: [],
    assignments: []
  });
  const [showNewMinistryForm, setShowNewMinistryForm] = React.useState(false);
  const [newMinistry, setNewMinistry] = React.useState<Partial<Ministry>>({
    name: '',
    description: '',
    leaderName: '',
    icon: 'users',
  });
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSignedOut, setIsSignedOut] = React.useState(false);
  const [userData, setUserData] = React.useState<any>(null);

  const loadMinistries = React.useCallback(async () => {
    try {
      const data = await trpc.ministries.list.query();
      setMinistries(data as Ministry[]);
    } catch (e) {
      console.error('Failed to load ministries:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMinistryDetails = React.useCallback(async (ministryId: string) => {
    try {
      const data = await trpc.ministries.getDetails.query({ ministryId });
      setScales(data.scales as Scale[]);
      setBriefings(data.briefings as Briefing[]);
      setMinistryMembers(data.members);
    } catch (e) {
      console.error('Failed to load details:', e);
    }
  }, []);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsSignedOut(false);
        const token = await user.getIdTokenResult();
        setUserData({
          id: user.uid,
          tenantId: token.claims.tenantId,
          roles: token.claims.roles || []
        });
        loadMinistries();
      } else {
        setIsSignedOut(true);
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, [loadMinistries]);

  React.useEffect(() => {
    if (selectedMinistry) {
      loadMinistryDetails(selectedMinistry.id);
    }
  }, [selectedMinistry, loadMinistryDetails]);

  const handleCreateMinistry = async () => {
    if (!newMinistry.name) return;
    try {
      await trpc.ministries.create.mutate({
        name: newMinistry.name,
        description: newMinistry.description || "",
        leaderName: newMinistry.leaderName || "",
        icon: newMinistry.icon || "users"
      });
      setShowNewMinistryForm(false);
      setNewMinistry({ name: '', description: '', leaderName: '', icon: 'users' });
      loadMinistries();
    } catch (e) {
      console.error(e);
      alert("Erro ao criar ministério: " + (e as Error).message);
    }
  };

  const handleStatusChange = async (scaleId: string, memberId: string, newStatus: ScaleStatus) => {
    try {
      const scale = scales.find(s => s.id === scaleId);
      if (!scale) return;
      const updatedAssignments = scale.assignments.map(a => 
        a.memberId === memberId ? { ...a, status: newStatus } : a
      );
      await trpc.ministries.updateScaleAssignments.mutate({
        scaleId,
        assignments: updatedAssignments
      });
      loadMinistryDetails(selectedMinistry!.id);
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar status: " + (e as Error).message);
    }
  };

  const isLeader = React.useMemo(() => {
    if (!selectedMinistry || !userData?.id) return false;
    return selectedMinistry.leaderId === userData.id || can(userData, 'manage:ministry');
  }, [selectedMinistry, userData]);

  const isMinistryMember = React.useMemo(() => {
    return isLeader || ministryMembers.some(m => m.id === userData?.id);
  }, [isLeader, ministryMembers, userData?.id]);

  const filteredMinistries = ministries.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.leaderName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatusBadge = (status: ScaleStatus) => {
    switch (status) {
      case 'accepted':
        return <span className="px-2 py-1 rounded-full text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Confirmado</span>;
      case 'declined':
        return <span className="px-2 py-1 rounded-full text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><XCircle className="w-3 h-3" /> Recusado</span>;
      case 'pending':
      default:
        return <span className="px-2 py-1 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</span>;
    }
  };

  const renderBriefingCard = (briefing: Briefing) => {
    const assignee = ministryMembers.find(m => m.id === briefing.assigneeId);
    return (
      <Card key={briefing.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] border border-white/10 text-white/60 px-2 py-1 rounded-full">De: {briefing.requesterMinistry}</span>
            <span className="text-[10px] text-white/40 flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(briefing.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>
          <div>
            <h4 className="font-bold text-sm leading-tight">{briefing.title}</h4>
            <p className="text-xs text-white/60 mt-1 line-clamp-2">{briefing.description}</p>
          </div>
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              {assignee ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold">
                    {assignee.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-white/60">{assignee.name.split(' ')[0]}</span>
                </div>
              ) : (
                <span className="text-[10px] text-white/40 italic">Não atribuído</span>
              )}
              {briefing.status === 'accepted' || briefing.status === 'todo' || briefing.status === 'in-progress' ? (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-white/40 hover:text-white" onClick={async () => {
                  try {
                    await trpc.ministries.updateBriefingStatus.mutate({ briefingId: briefing.id, status: 'completed' });
                    loadMinistryDetails(selectedMinistry!.id);
                  } catch (e) { console.error(e); }
                }}>Concluir ✓</Button>
              ) : null}
            </div>

            {briefing.status === 'pending' && isLeader && (
              <div className="flex gap-2 w-full mt-2">
                <Button size="sm" className="flex-1 h-7 text-[10px] bg-green-500/20 text-green-400 hover:bg-green-500/30" onClick={async () => {
                  try {
                    await trpc.ministries.updateBriefingStatus.mutate({ briefingId: briefing.id, status: 'accepted' });
                    loadMinistryDetails(selectedMinistry!.id);
                  } catch (e) { console.error(e); }
                }}>Aceitar</Button>
                <Button size="sm" className="flex-1 h-7 text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30" onClick={async () => {
                  const reason = prompt("Qual o motivo da recusa?");
                  if (reason) {
                    try {
                      await trpc.ministries.updateBriefingStatus.mutate({ briefingId: briefing.id, status: 'declined', reason });
                      loadMinistryDetails(selectedMinistry!.id);
                    } catch (e) { console.error(e); }
                  }
                }}>Declinar</Button>
              </div>
            )}
            {briefing.status === 'declined' && (
              <p className="text-[10px] text-red-400 bg-red-400/10 p-1 rounded">Motivo: Recusado pelo líder.</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isSignedOut) {
    return <div className="p-8 text-center text-white/60">Faça login para visualizar ministérios.</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-8 pb-20 animate-pulse p-8 max-w-6xl mx-auto">
        <div className="h-10 bg-white/10 w-48 rounded mb-2"></div>
        <div className="h-6 bg-white/10 w-96 rounded"></div>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="h-48 bg-white/10 rounded-xl"></div>
          <div className="h-48 bg-white/10 rounded-xl"></div>
          <div className="h-48 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (selectedMinistry) {
    return (
      <motion.div {...pagePreset} className="container mx-auto px-4 py-24 max-w-6xl space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => { setSelectedMinistry(null); setActiveTab("overview"); }}>
            ← Ver Todos os Ministérios
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              {getIcon(selectedMinistry.icon)}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{selectedMinistry.name}</h1>
              <p className="text-white/60">Líder: {selectedMinistry.leaderName}</p>
            </div>
          </div>
        </div>

        <div className="w-full space-y-6">
          <div className="flex gap-2 bg-zinc-900 border border-white/10 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
            <button onClick={() => setActiveTab("overview")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "overview" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>Visão Geral</button>
            {isMinistryMember && <button onClick={() => setActiveTab("member_dashboard")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "member_dashboard" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>Dashboard do Servo</button>}
            {isLeader && <button onClick={() => setActiveTab("scales")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "scales" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>Gestão do Líder</button>}
            <button onClick={() => setActiveTab("briefings")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "briefings" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>Briefings (Doc 15)</button>
          </div>

          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-zinc-900 border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Equipe ({ministryMembers.length})</CardTitle>
                      <CardDescription>Membros ativos neste ministério</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ministryMembers.map(member => {
                        const metrics = member.metrics || { cellAttendance: 0, ideProgress: 0, scalePresence: 0 };
                        const healthScore = Math.round((metrics.cellAttendance + metrics.ideProgress + metrics.scalePresence) / 3) || 0;
                        return (
                          <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                                {member.name?.substring(0, 2).toUpperCase() || "U"}
                              </div>
                              <div>
                                <p className="font-bold">{member.name}</p>
                                <p className="text-xs text-white/60">{member.role || "Servo"}</p>
                              </div>
                            </div>
                            {isLeader && (
                              <div className="flex flex-col items-end gap-2 w-48">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white/60">Saúde:</span>
                                  <span className={`text-sm font-bold ${getHealthColor(healthScore)}`}>{healthScore}%</span>
                                </div>
                                <div className={`w-full h-2 rounded-full ${getHealthBg(healthScore)}`} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card className="bg-zinc-900 border-white/10">
                  <CardHeader>
                    <CardTitle>Escalas Recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scales.map(scale => (
                      <div key={scale.id} className="p-3 rounded-lg bg-white/5 mb-3 border border-white/10">
                        <p className="font-bold text-sm">{scale.eventName}</p>
                        <p className="text-xs text-white/60">{new Date(scale.date).toLocaleDateString()} {scale.time}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "briefings" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4 text-yellow-400"/> Pendentes</h3>
                {briefings.filter(b => b.status === 'pending').map(renderBriefingCard)}
              </div>
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-blue-400"/> Em Andamento</h3>
                {briefings.filter(b => ['accepted', 'todo', 'in-progress'].includes(b.status)).map(renderBriefingCard)}
              </div>
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-400"/> Concluídos</h3>
                {briefings.filter(b => ['done', 'completed'].includes(b.status)).map(renderBriefingCard)}
              </div>
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-sm"><XCircle className="w-4 h-4 text-red-400"/> Recusados</h3>
                {briefings.filter(b => b.status === 'declined').map(renderBriefingCard)}
              </div>
            </div>
          )}

          {activeTab === "scales" && (
            <div className="space-y-6">
              {scales.map(scale => (
                  <Card key={scale.id} className="bg-zinc-900 border-white/10 flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{scale.eventName}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3" /> {new Date(scale.date).toLocaleDateString('pt-BR')} 
                            <Clock className="w-3 h-3 ml-2" /> {scale.time}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="grid gap-2">
                        {scale.assignments.map((assign, idx) => {
                          const member = ministryMembers.find(m => m.id === assign.memberId);
                          return (
                            <div key={idx} className="flex justify-between items-center bg-black/20 p-2 border border-white/5 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                  {member ? member.name.substring(0,2).toUpperCase() : "?"}
                                </div>
                                <div>
                                  <p className="text-xs font-bold leading-tight">{member ? member.name : "VAGA ABERTA"}</p>
                                  <p className="text-[10px] text-white/40">{assign.role}</p>
                                </div>
                              </div>
                              {renderStatusBadge(assign.status)}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pagePreset} className="container mx-auto px-4 py-24 max-w-6xl space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Ministérios</h1>
          <p className="text-white/60 mt-2">Gestão de times, escalas e saúde dos servos.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input 
              placeholder="Buscar ministério..." 
              className="pl-9 bg-zinc-900 border-white/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="bg-primary text-black font-bold whitespace-nowrap" onClick={() => setShowNewMinistryForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Ministério
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showNewMinistryForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold">Novo Ministério</h3>
                <p className="text-sm text-white/60">Cadastre um novo ministério na igreja.</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Nome do Ministério</label>
                    <Input 
                      placeholder="Ex: Louvor" 
                      className="bg-black border-white/10"
                      value={newMinistry.name}
                      onChange={(e) => setNewMinistry({...newMinistry, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Descrição</label>
                    <textarea 
                      placeholder="Resumo do propósito..." 
                      className="w-full bg-black border border-white/10 rounded-md p-3 text-sm min-h-[80px]"
                      value={newMinistry.description}
                      onChange={(e) => setNewMinistry({...newMinistry, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Nome do Líder</label>
                      <Input 
                        placeholder="Ex: João" 
                        className="bg-black border-white/10"
                        value={newMinistry.leaderName}
                        onChange={(e) => setNewMinistry({...newMinistry, leaderName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Ícone</label>
                      <select
                        className="w-full bg-black border border-white/10 rounded-md p-3 text-sm h-10 text-white"
                        value={newMinistry.icon}
                        onChange={(e) => setNewMinistry({...newMinistry, icon: e.target.value})}
                      >
                        <option value="music">Música</option>
                        <option value="camera">Câmera</option>
                        <option value="coffee">Café</option>
                        <option value="heart">Coração</option>
                        <option value="shield">Escudo</option>
                        <option value="users">Usuários</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-white/10 text-white hover:bg-white/20" onClick={() => setShowNewMinistryForm(false)}>Cancelar</Button>
                  <Button className="flex-1 bg-primary text-black font-bold" onClick={handleCreateMinistry}>Criar Ministério</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMinistries.map(ministry => (
          <motion.div
            key={ministry.id}
            whileHover={{ y: -5 }}
            className="cursor-pointer"
            onClick={() => setSelectedMinistry(ministry)}
          >
            <Card className="bg-zinc-900 border-white/10 h-full hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                    {getIcon(ministry.icon)}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{ministry.name}</h3>
                <p className="text-sm text-white/60 mb-4 line-clamp-2">{ministry.description}</p>
                
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                      {ministry.leaderName?.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-white/60">{ministry.leaderName}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

import * as React from "react"
import { motion } from "motion/react"
import { Users, Calendar, CheckCircle2, AlertCircle, Plus, Search, ChevronRight, Music, Heart, Camera, Coffee, Shield, Clock, XCircle, BookOpen, Home, CalendarCheck, GraduationCap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDoc, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { can } from "@/src/lib/permissions";

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
  id: string; // user id
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

// Mocks removed

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

export function MinistriesView({ isLoggedIn = true, userData, onLoginClick }: { isLoggedIn?: boolean; userData?: any; onLoginClick?: () => void }) {
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [selectedMinistry, setSelectedMinistry] = React.useState<Ministry | null>(null);
  const [ministryMembers, setMinistryMembers] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [scales, setScales] = React.useState<Scale[]>([]);
  const [briefings, setBriefings] = React.useState<Briefing[]>([]);
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  
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
    members: [],
    requiredTracks: []
  });
  const [newBriefing, setNewBriefing] = React.useState<Partial<Briefing>>({
    title: '',
    description: '',
    requesterMinistry: '',
    deadline: '',
    status: 'pending'
  });

  const handleCreateMinistry = async () => {
    if (!newMinistry.name) return;
    try {
      await addDoc(collection(db, 'ministries'), {
        ...newMinistry,
        leaderId: userData?.id || '',
        tenantId: userData?.tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowNewMinistryForm(false);
      setNewMinistry({ name: '', description: '', leaderName: '', icon: 'users', members: [], requiredTracks: [] });
    } catch (e) {
      console.error(e);
      alert("Erro ao criar ministério: " + (e as Error).message);
    }
  };

  const tenantId = userData?.tenantId;
  const currentUserId = userData?.id;
  const isLeader = React.useMemo(() => {
    if (!selectedMinistry || !currentUserId) return false;
    return selectedMinistry.leaderId === currentUserId || can(userData, 'manage:ministry');
  }, [selectedMinistry, currentUserId, userData]);

  const isMinistryMember = React.useMemo(() => {
    return isLeader || ministryMembers.some(m => m.id === currentUserId);
  }, [isLeader, ministryMembers, currentUserId]);

  React.useEffect(() => {
    const q = tenantId 
      ? query(collection(db, 'ministries'), where('tenantId', '==', tenantId))
      : query(collection(db, 'ministries'));
      
    const unsub = onSnapshot(q, (snap) => {
      const mins = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ministry));
      setMinistries(mins);
    });
    return () => unsub();
  }, [tenantId]);

  React.useEffect(() => {
    if (!selectedMinistry?.id || !tenantId) return;

    const unsubScales = onSnapshot(query(collection(db, 'scales'), where('tenantId', '==', tenantId), where('ministryId', '==', selectedMinistry.id)), (snap) => {
      setScales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scale)));
    });

    const unsubBriefings = onSnapshot(query(collection(db, 'briefings'), where('tenantId', '==', tenantId), where('ministryId', '==', selectedMinistry.id)), (snap) => {
      setBriefings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Briefing)));
    });

    const unsubEvents = onSnapshot(query(collection(db, 'ministry_events'), where('tenantId', '==', tenantId), where('ministryId', '==', selectedMinistry.id)), (snap) => {
      setCalendarEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent)));
    });

    const unsubMembers = onSnapshot(query(collection(db, 'users'), where('tenantId', '==', tenantId), where('ministryId', '==', selectedMinistry.id)), (snap) => {
      setMinistryMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubScales();
      unsubBriefings();
      unsubEvents();
      unsubMembers();
    };
  }, [selectedMinistry?.id, tenantId]);

  const filteredMinistries = ministries.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.leaderName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-6xl space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-5xl font-black font-serif italic tracking-tight">Nossos Ministérios</h1>
          <p className="text-white/60 text-lg">Descubra como você pode servir, se conectar e fazer a diferença na nossa comunidade local.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMinistries.map(ministry => (
            <motion.div
              key={ministry.id}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Card className="bg-zinc-900 border-white/10 h-full overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-0 border-none">
                  <div className="p-8 space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getIcon(ministry.icon)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black font-serif italic mb-3 text-white group-hover:text-primary transition-colors">{ministry.name}</h3>
                      <p className="text-white/60 leading-relaxed min-h-[4rem]">{ministry.description}</p>
                    </div>
                    <Button variant="outline" className="w-full border-white/20 hover:bg-primary hover:text-black hover:border-primary font-bold uppercase tracking-wider text-xs h-12" onClick={() => onLoginClick?.()}>
                      Como Fazer Parte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  const handleStatusChange = async (scaleId: string, memberId: string, newStatus: ScaleStatus) => {
    try {
      const scaleRef = doc(db, 'scales', scaleId);
      const scale = scales.find(s => s.id === scaleId);
      if (!scale) return;
      const updatedAssignments = scale.assignments.map(a => 
        a.memberId === memberId ? { ...a, status: newStatus } : a
      );
      await updateDoc(scaleRef, {
        assignments: updatedAssignments,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar status: " + (e as Error).message);
    }
  };

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
                    await updateDoc(doc(db, 'briefings', briefing.id), { status: 'completed' });
                  } catch (e) { console.error(e); }
                }}>Concluir ✓</Button>
              ) : null}
            </div>

            {briefing.status === 'pending' && isLeader && (
              <div className="flex gap-2 w-full mt-2">
                <Button size="sm" className="flex-1 h-7 text-[10px] bg-green-500/20 text-green-400 hover:bg-green-500/30" onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'briefings', briefing.id), { status: 'accepted' });
                  } catch (e) { console.error(e); }
                }}>Aceitar</Button>
                <Button size="sm" className="flex-1 h-7 text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30" onClick={async () => {
                  const reason = prompt("Qual o motivo da recusa?");
                  if (reason) {
                    try {
                      await updateDoc(doc(db, 'briefings', briefing.id), { status: 'declined', declineReason: reason });
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

  if (selectedMinistry) {
    const ministryScales = scales.filter(s => s.ministryId === selectedMinistry.id);
    const ministryBriefings = briefings.filter(b => b.ministryId === selectedMinistry.id);
    const ministryCalendar = calendarEvents.filter(c => c.ministryId === selectedMinistry.id);
    return (
      <div className="container mx-auto px-4 py-24 max-w-6xl space-y-8">
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
            <button onClick={() => setActiveTab("training")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "training" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>Treinamento (IDE)</button>
            <button onClick={() => setActiveTab("calendar")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "calendar" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>Calendário</button>
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
                    {isLeader && (
                      <Button size="sm" className="bg-primary text-black">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Servo
                      </Button>
                    )}
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
                            <p className="text-xs text-white/60">{member.role || "Servo"} • Desde {member.joinDate ? new Date(member.joinDate).toLocaleDateString('pt-BR') : "2026"}</p>
                          </div>
                        </div>
                        {isLeader && (
                          <div className="flex flex-col items-end gap-2 w-48">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">Saúde Geral:</span>
                              <span className={`text-sm font-bold ${getHealthColor(healthScore)}`}>{healthScore}%</span>
                            </div>
                            <div className={`w-full h-2 rounded-full ${getHealthBg(healthScore)}`} />
                            <div className="flex items-center justify-between w-full text-[10px] text-white/40 mt-1">
                              <span title="Frequência na Célula" className="flex items-center gap-1"><Home className="w-3 h-3"/> {metrics.cellAttendance}%</span>
                              <span title="Progresso na IDE" className="flex items-center gap-1"><GraduationCap className="w-3 h-3"/> {metrics.ideProgress}%</span>
                              <span title="Presença nas Escalas" className="flex items-center gap-1"><CalendarCheck className="w-3 h-3"/> {metrics.scalePresence}%</span>
                            </div>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Próximas Escalas</CardTitle>
                  <CardDescription>Gerencie as escalas de cultos e eventos</CardDescription>
                </div>
                <Button size="sm" variant="outline" className="border-white/10" onClick={() => setShowScaleForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Escala
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ministryScales.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-white/10 rounded-xl text-white/40">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma escala programada.</p>
                    </div>
                  ) : (
                    ministryScales.map(scale => (
                      <div key={scale.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-lg">{scale.eventName}</h4>
                            <p className="text-sm text-white/60 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(scale.date).toLocaleDateString('pt-BR')} às {scale.time}
                            </p>
                          </div>
                        </div>

                        {scale.setlist && scale.setlist.length > 0 && (
                          <div className="bg-black/20 p-3 rounded-lg">
                            <p className="text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">Repertório</p>
                            <ul className="text-sm space-y-1">
                              {scale.setlist.map((song, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <Music className="w-3 h-3 text-primary" />
                                  {song}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="space-y-2">
                          <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Equipe Escalada</p>
                          {scale.assignments.map((assignment, idx) => {
                            const member = ministryMembers.find(m => m.id === assignment.memberId);
                            const isCurrentUser = member?.id === currentUserId;

                            return (
                              <div key={`${assignment.memberId}-${idx}`} className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                                    {member ? member.name.substring(0, 2).toUpperCase() : "?"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{member ? member.name : "Vaga Aberta"} {isCurrentUser && "(Você)"}</p>
                                    <p className="text-xs text-white/60">{assignment.role}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isCurrentUser && assignment.status === 'pending' ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-green-500/30 hover:bg-green-500/20 text-green-400" onClick={() => handleStatusChange(scale.id, member!.id, 'accepted')}>
                                        Aceitar
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-500/30 hover:bg-red-500/20 text-red-400" onClick={() => handleStatusChange(scale.id, member!.id, 'declined')}>
                                        Recusar
                                      </Button>
                                    </div>
                                  ) : (
                                    renderStatusBadge(assignment.status)
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Trilhas na IDE
                </CardTitle>
                <CardDescription>Treinamentos obrigatórios para este ministério</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedMinistry.requiredTracks && selectedMinistry.requiredTracks.length > 0 ? (
                    selectedMinistry.requiredTracks.map(track => (
                      <div key={track.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <h4 className="text-sm font-bold">{track.name}</h4>
                        <p className="text-xs text-white/60 mt-1">{track.description}</p>
                        <Button size="sm" variant="link" className="text-primary px-0 h-auto mt-2 text-xs">
                          Ver na Escola IDE →
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/40 text-center py-4">Nenhuma trilha obrigatória vinculada.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {activeTab === "member_dashboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Meu Dashboard no Ministério</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <Card className="bg-zinc-900 border-white/10">
                 <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60 uppercase">Minhas Escalas no Mês</CardTitle></CardHeader>
                 <CardContent><div className="text-3xl font-black text-white">{ministryScales.filter(s => s.assignments.some(a => a.memberId === currentUserId && new Date(s.date).getMonth() === new Date().getMonth())).length}</div></CardContent>
               </Card>
               <Card className="bg-zinc-900 border-white/10">
                 <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60 uppercase">Faltas Injustificadas</CardTitle></CardHeader>
                 <CardContent><div className="text-3xl font-black text-red-400">0</div></CardContent>
               </Card>
               <Card className="bg-zinc-900 border-white/10">
                 <CardHeader className="pb-2"><CardTitle className="text-sm text-white/60 uppercase">Taxa de Presença</CardTitle></CardHeader>
                 <CardContent><div className="text-3xl font-black text-green-400">100%</div></CardContent>
               </Card>
            </div>
            
            <h3 className="text-xl font-bold mt-8">Painel de Vagas Livres (Eu Quero)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {ministryScales.filter(s => s.assignments.some(a => a.status === 'pending' && !a.memberId)).length === 0 ? (
                  <p className="text-white/40 col-span-full">Nenhuma escala com vagas abertas no momento.</p>
               ) : (
                 ministryScales.map(scale => {
                   const openAssignments = scale.assignments.filter(a => a.status === 'pending' && !a.memberId);
                   if (openAssignments.length === 0) return null;
                   return (
                     <Card key={scale.id} className="bg-zinc-900 border-white/10 flex flex-col hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                           <CardTitle className="text-lg">{scale.eventName}</CardTitle>
                           <CardDescription className="flex items-center gap-2 mt-1">
                             <Calendar className="w-3 h-3" /> {new Date(scale.date).toLocaleDateString('pt-BR')} às {scale.time}
                           </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs font-bold text-white/60 mb-2 uppercase">Vagas Disponíveis:</p>
                          <div className="space-y-2">
                            {openAssignments.map((a, idx) => (
                               <div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                                  <span className="text-sm font-medium text-white/80">{a.role}</span>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/20" onClick={() => {
                                      const newAssignments = [...scale.assignments];
                                      const targetIdx = newAssignments.findIndex(x => x === a);
                                      if(targetIdx > -1) {
                                         newAssignments[targetIdx] = { ...a, memberId: currentUserId!, status: 'accepted' };
                                         updateDoc(doc(db, 'scales', scale.id), { assignments: newAssignments });
                                      }
                                  }}>Eu Quero</Button>
                               </div>
                            ))}
                          </div>
                        </CardContent>
                     </Card>
                   )
                 })
               )}
            </div>
            
            <h3 className="text-xl font-bold mt-8">Minhas Próximas Escalas (Confirmadas/Pendentes)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {ministryScales.filter(s => s.assignments.some(a => a.memberId === currentUserId)).length === 0 ? (
                  <p className="text-white/40 col-span-full">Você não possui escalas programadas.</p>
               ) : (
                 ministryScales.filter(s => s.assignments.some(a => a.memberId === currentUserId)).map(scale => (
                  <Card key={scale.id} className="bg-zinc-900 border-primary/20 flex flex-col">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{scale.eventName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" /> {new Date(scale.date).toLocaleDateString('pt-BR')} às {scale.time}
                        </CardDescription>
                     </CardHeader>
                     <CardContent>
                        {scale.assignments.filter(a => a.memberId === currentUserId).map((a, idx) => (
                           <div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded-lg mt-2">
                              <span className="text-sm font-bold text-primary">{a.role}</span>
                              {a.status === 'pending' ? (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-green-500/30 text-green-400" onClick={() => handleStatusChange(scale.id, currentUserId!, 'accepted')}>Aceitar</Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-500/30 text-red-400" onClick={() => handleStatusChange(scale.id, currentUserId!, 'declined')}>Recusar</Button>
                                </div>
                              ) : renderStatusBadge(a.status)}
                           </div>
                        ))}
                     </CardContent>
                  </Card>
               )))}
            </div>
          </div>
        )}

        {activeTab === "briefings" && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Briefings (Doc 15)</h2>
                <p className="text-white/60">Gerencie as demandas solicitadas a este ministério.</p>
              </div>
              <Button className="bg-primary text-black" onClick={() => setShowBriefingForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Briefing
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white/80 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4 text-yellow-400"/> Novas Solicitações</h3>
                  <span className="px-2 py-1 rounded-full text-xs border border-white/10">{ministryBriefings.filter(b => b.status === 'pending').length}</span>
                </div>
                {ministryBriefings.filter(b => b.status === 'pending').map(renderBriefingCard)}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white/80 flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-blue-400"/> Aprovados / Em Andamento</h3>
                  <span className="px-2 py-1 rounded-full text-xs border border-white/10">{ministryBriefings.filter(b => ['accepted', 'todo', 'in-progress'].includes(b.status)).length}</span>
                </div>
                {ministryBriefings.filter(b => ['accepted', 'todo', 'in-progress'].includes(b.status)).map(renderBriefingCard)}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white/80 flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-400"/> Concluídos</h3>
                  <span className="px-2 py-1 rounded-full text-xs border border-white/10">{ministryBriefings.filter(b => ['done', 'completed'].includes(b.status)).length}</span>
                </div>
                {ministryBriefings.filter(b => ['done', 'completed'].includes(b.status)).map(renderBriefingCard)}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white/80 flex items-center gap-2 text-sm"><XCircle className="w-4 h-4 text-red-400"/> Recusados</h3>
                  <span className="px-2 py-1 rounded-full text-xs border border-white/10">{ministryBriefings.filter(b => b.status === 'declined').length}</span>
                </div>
                {ministryBriefings.filter(b => b.status === 'declined').map(renderBriefingCard)}
              </div>
            </div>
          </div>
        )}

        {activeTab === "scales" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Gestão Acadêmica e Escalas</h2>
                <p className="text-white/60">Controle de quem serve e quando serve.</p>
              </div>
              <Button onClick={() => setShowScaleForm(true)} className="bg-primary text-black">
                <Plus className="w-4 h-4 mr-2" />
                Nova Escala
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ministryScales.length === 0 ? (
                <div className="col-span-full p-8 text-center text-white/40 border border-white/10 rounded-xl bg-zinc-900 border-dashed">
                  Nenhuma escala programada encontrada.
                </div>
              ) : (
                ministryScales.map(scale => (
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      {scale.setlist && scale.setlist.length > 0 && (
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
                          <p className="text-xs font-bold text-white/60 flex items-center gap-1"><Music className="w-3 h-3" /> Setlist</p>
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {scale.setlist.map((song, idx) => (
                              <li key={idx} className="text-white/80 truncate">{song}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-white/60 flex items-center gap-1"><Users className="w-3 h-3" /> Servos Escalados ({scale.assignments.length})</p>
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
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Calendário Editorial & Eventos</h2>
                <p className="text-white/60">Cronograma de postagens, ensaios e atividades.</p>
              </div>
              <Button className="bg-primary text-black">
                <Plus className="w-4 h-4 mr-2" />
                Agendar
              </Button>
            </div>

            <Card className="bg-zinc-900 border-white/10">
              <CardContent className="p-0">
                <div className="divide-y divide-white/10">
                  {ministryCalendar.length === 0 ? (
                    <div className="p-8 text-center text-white/40">Nenhum evento agendado.</div>
                  ) : (
                    ministryCalendar.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
                      <div key={event.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/10">
                            <span className="text-xs text-white/60 uppercase">{new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                            <span className="font-bold">{new Date(event.date).getDate()}</span>
                          </div>
                          <div>
                            <h4 className="font-bold">{event.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-1 rounded-full text-[10px] border border-white/10">
                                {event.type === 'post' ? 'Postagem' : event.type === 'meeting' ? 'Reunião/Ensaio' : 'Evento'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-white/40 hover:text-white">Editar</Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeTab === "training" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Escola IDE & Trilhas</h2>
                <p className="text-white/60">Acompanhe as trilhas obrigatórias e o progresso da equipe.</p>
              </div>
              <Button className="bg-primary text-black">
                <Plus className="w-4 h-4 mr-2" />
                Vincular Nova Trilha
              </Button>
            </div>

            {selectedMinistry.requiredTracks.length > 0 && (
              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">Trilhas Obrigatórias do Desempenho</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedMinistry.requiredTracks.map(track => (
                    <div key={track.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex justify-between items-center group">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mt-1">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{track.name}</h4>
                          <p className="text-xs text-white/60">{track.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">Engajamento Escolar da Equipe</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ministryMembers.map(member => {
                  const metrics = member.metrics || { ideProgress: 0 };
                  return (
                  <Card key={member.id} className="bg-zinc-900 border-white/10 hover:border-white/20 transition-all">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                          {member.name?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-none">{member.name}</p>
                          <p className="text-[10px] text-white/40 mt-1">{member.role || "Servo"}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/60">
                          <span>Progresso Médio na IDE</span>
                          <span>{metrics.ideProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-black rounded-full overflow-hidden">
                          <div className={`h-full ${metrics.ideProgress > 70 ? 'bg-green-500' : metrics.ideProgress > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${metrics.ideProgress}%` }} />
                        </div>
                        {metrics.ideProgress < 40 && (
                          <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Requer acompanhamento do líder
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="w-full h-8 text-[10px] border-white/10 hover:bg-white/5">
                        Ver Boletim Escolar
                      </Button>
                    </CardContent>
                  </Card>
                )})}
              </div>
            </div>
          </div>
        )}

        {showBriefingForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 border border-white/10 rounded-xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold">Novo Briefing (Doc 15)</h3>
                <p className="text-sm text-white/60">Crie uma nova solicitação para o ministério.</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Título</label>
                    <Input 
                      placeholder="Ex: Arte Culto de Jovens" 
                      className="bg-black border-white/10"
                      value={newBriefing.title}
                      onChange={(e) => setNewBriefing({...newBriefing, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Ministério Solicitante</label>
                    <Input 
                      placeholder="Ex: Eventos" 
                      className="bg-black border-white/10"
                      value={newBriefing.requesterMinistry}
                      onChange={(e) => setNewBriefing({...newBriefing, requesterMinistry: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Descrição / Detalhes</label>
                    <textarea 
                      placeholder="Explique os detalhes da solicitação..." 
                      className="w-full bg-black border border-white/10 rounded-md p-3 text-sm min-h-[100px]"
                      value={newBriefing.description}
                      onChange={(e) => setNewBriefing({...newBriefing, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Prazo (Deadline)</label>
                    <Input 
                      type="date"
                      className="bg-black border-white/10"
                      value={newBriefing.deadline}
                      onChange={(e) => setNewBriefing({...newBriefing, deadline: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-white/10 text-white hover:bg-white/20" onClick={() => setShowBriefingForm(false)}>Cancelar</Button>
                  <Button className="flex-1 bg-primary text-black font-bold" onClick={async () => {
                    if (newBriefing.title && newBriefing.deadline) {
                      try {
                        await addDoc(collection(db, 'briefings'), {
                          ...newBriefing,
                          ministryId: selectedMinistry.id,
                          tenantId: tenantId,
                          createdAt: serverTimestamp(),
                          updatedAt: serverTimestamp()
                        });
                        setShowBriefingForm(false);
                        setNewBriefing({ title: '', description: '', requesterMinistry: '', deadline: '', status: 'todo' });
                      } catch (e) {
                        console.error(e);
                        alert("Erro ao criar briefing: " + (e as Error).message);
                      }
                    }
                  }}>Enviar Solicitação</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        
        {showScaleForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 border border-white/10 rounded-xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold">Nova Escala</h3>
                <p className="text-sm text-white/60">Agende a equipe para um novo culto ou evento.</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Nome do Evento</label>
                    <Input 
                      placeholder="Ex: Culto de Celebração" 
                      className="bg-black border-white/10"
                      value={newScale.eventName}
                      onChange={(e) => setNewScale({...newScale, eventName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Data</label>
                      <Input 
                        type="date"
                        className="bg-black border-white/10"
                        value={newScale.date}
                        onChange={(e) => setNewScale({...newScale, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Hora</label>
                      <Input 
                        type="time"
                        className="bg-black border-white/10"
                        value={newScale.time}
                        onChange={(e) => setNewScale({...newScale, time: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Adicionar Posição / Vaga na Escala</label>
                    <div className="flex gap-2">
                      <Input id="newRoleInput" placeholder="Ex: Câmera 1, Teclado, Recepção" className="bg-black border-white/10" />
                      <Button variant="outline" className="border-white/10" onClick={() => {
                        const val = (document.getElementById('newRoleInput') as HTMLInputElement).value;
                        if(val) {
                          setNewScale({
                            ...newScale,
                            assignments: [...(newScale.assignments || []), { memberId: '', role: val, status: 'pending' }]
                          });
                          (document.getElementById('newRoleInput') as HTMLInputElement).value = '';
                        }
                      }}>Add Vaga</Button>
                    </div>
                    <div className="border border-white/10 rounded-lg max-h-32 overflow-y-auto p-2 bg-black/50 space-y-1">
                      {(newScale.assignments || []).map((a, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-sm font-medium">{a.role}</span>
                            <span className="text-xs text-white/50">{a.memberId ? 'Servo Vinculado' : 'Vaga Aberta (Sorteável)'}</span>
                            <Button size="sm" variant="ghost" className="h-6 text-red-400 hover:text-red-300" onClick={() => {
                               const updated = [...newScale.assignments!];
                               updated.splice(idx, 1);
                               setNewScale({...newScale, assignments: updated});
                            }}>X</Button>
                          </div>
                      ))}
                      {(!newScale.assignments || newScale.assignments.length === 0) && (
                        <p className="text-xs text-white/40 p-2 text-center">Nenhuma vaga adicionada ainda.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-white/10 text-white hover:bg-white/20" onClick={() => setShowScaleForm(false)}>Cancelar</Button>
                  <Button className="flex-1 bg-primary text-black font-bold" onClick={async () => {
                    if (newScale.eventName && newScale.date && newScale.time) {
                      try {
                        await addDoc(collection(db, 'scales'), {
                          ...newScale,
                          ministryId: selectedMinistry.id,
                          tenantId: tenantId,
                          createdAt: serverTimestamp(),
                          updatedAt: serverTimestamp()
                        });
                        setShowScaleForm(false);
                        setNewScale({ eventName: '', date: '', time: '', setlist: [], assignments: [] });
                      } catch (e) {
                        console.error(e);
                        alert("Erro ao salvar escala: " + (e as Error).message);
                      }
                    }
                  }}>Salvar Escala</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-24 max-w-6xl space-y-8">
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

      {showNewMinistryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
                      className="w-full bg-black border border-white/10 rounded-md p-3 text-sm h-10"
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
                  <span className="px-2 py-1 rounded-full text-[10px] border border-white/10 text-white/60">
                    {ministry.members.length} servos
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">{ministry.name}</h3>
                <p className="text-sm text-white/60 mb-4 line-clamp-2">{ministry.description}</p>
                
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                      {ministry.leaderName.substring(0, 2).toUpperCase()}
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
    </div>
  );
}

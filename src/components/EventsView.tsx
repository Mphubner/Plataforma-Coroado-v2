import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Users, Ticket, QrCode, ScanEye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactQrCode from 'react-qr-code';
import { auth, db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, getDoc, serverTimestamp, where } from "firebase/firestore";
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';
import { can } from '@/src/lib/permissions';
import { postJson } from '@/src/lib/api/http';
import { pageMotion } from '@/src/lib/motion/presets';
import { ImageUpload } from './ui/ImageUpload';

type EventInfo = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: string;
  capacity: number;
  enrolled: number;
  image: string;
  description: string;
  visibilityScope?: 'church' | 'ministry' | 'cell';
  visibilityId?: string;
  isPaid?: boolean;
  price?: number;
  requiresRegistration?: boolean;
  requiresFunding?: boolean;
  fundingAmount?: number;
  requiredMinistries?: string[];
  status?: 'draft' | 'pending_approval' | 'approved';
};

type EventEnrollment = {
  id: string;
  eventId: string;
  userId: string;
  tenantId: string;
  checkedIn: boolean;
  kids?: { id: string, name: string, age: string, obs: string, checkedIn: boolean }[];
  paymentStatus?: 'pending' | 'approved' | 'rejected';
  pixCopiaECola?: string;
  preferenceId?: string;
  paymentInitPoint?: string;
};

export function EventsView({ isLoggedIn = false, userData, onLoginClick }: { isLoggedIn?: boolean; userData?: any; onLoginClick?: () => void }) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'mytickets' | 'admin'>('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [enrollments, setEnrollments] = useState<EventEnrollment[]>([]);
  const [scanResult, setScanResult] = useState<EventEnrollment | null>(null);
  const [scannedUser, setScannedUser] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [enrollKids, setEnrollKids] = useState<{name: string, age: string, obs: string}[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'monthly'>('list');
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Form states
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<EventInfo>>({
    visibilityScope: 'church',
    isPaid: false,
    requiresRegistration: true,
    requiredMinistries: [],
    status: 'pending_approval'
  });
  const [ministries, setMinistries] = useState<{id: string, name: string}[]>([]);
  const [cells, setCells] = useState<{id: string, name: string}[]>([]);

  const isAnyLeader = can(userData, 'manage:events') || userData?.roles?.includes('ministryLeader') || userData?.roles?.includes('cellLeader');

  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);

  useEffect(() => {
    try {
      const q = localStorage.getItem('coroado_checkin_queue');
      if (q) setOfflineQueue(JSON.parse(q));
    } catch(e) {}
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'events'));

    const unsub = onSnapshot(q, (snap) => {
       const evs = snap.docs.map(d => {
          const docData = d.data();
          const d_iso = docData.date ? new Date(docData.date).toISOString().split('T')[0] : '2026-01-01';
          return {
            id: d.id,
            title: docData.title || 'Evento',
            date: d_iso,
            time: docData.time || '19:30',
            location: docData.location || 'Campus Sede',
            type: docData.category || docData.type || 'Geral',
            capacity: docData.capacity || 500,
            enrolled: docData.enrolled || 0,
            image: docData.image || 'https://images.unsplash.com/photo-1540039155733-d730a53ffb4c?q=80&w=800&auto=format&fit=crop',
            description: docData.description || '',
            visibilityScope: docData.visibilityScope || 'church',
            visibilityId: docData.visibilityId || '',
            isPaid: docData.isPaid || false,
            price: docData.price || 0,
            requiresRegistration: docData.requiresRegistration !== false,
            requiredMinistries: docData.requiredMinistries || [],
            status: docData.status || 'approved'
          } as EventInfo;
       }).sort((a,b) => a.date.localeCompare(b.date));
       setEvents(evs);
    }, (error) => {
       console.error("Error fetching events:", error);
    });

    if (userData?.tenantId) {
      // Fetch Ministries
      const unsubMin = onSnapshot(query(collection(db, 'ministries'), where('tenantId', '==', userData.tenantId)), (snap) => {
        setMinistries(snap.docs.map(d => ({id: d.id, name: d.data().name})));
      });
      // Fetch Cells
      const unsubCel = onSnapshot(query(collection(db, 'cells'), where('tenantId', '==', userData.tenantId)), (snap) => {
        setCells(snap.docs.map(d => ({id: d.id, name: d.data().name})));
      });
      return () => { unsub(); unsubMin(); unsubCel(); };
    }

    return () => unsub();
  }, [userData?.tenantId]);

  useEffect(() => {
    if (!userData?.id) return;
    const q2 = query(collection(db, 'event_enrollments'), where("userId", "==", userData.id));
    const unsub2 = onSnapshot(q2, (snap) => {
       const myEnrolls = snap.docs.map(d => ({id: d.id, ...d.data()}) as EventEnrollment);
       setEnrollments(myEnrolls);
    }, (error) => {
       console.error("Error fetching enrollments:", error);
    });
    return () => unsub2();
  }, [userData]);

  useEffect(() => {
     if (activeTab === 'admin') {
       startScanner();
     } else {
       stopScanner();
       setScanResult(null);
       setScannedUser(null);
     }
     return () => stopScanner();
  }, [activeTab]);

  const startScanner = () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner("qr-reader", { 
         fps: 15, 
         qrbox: {width: 250, height: 250},
         formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
         supportedScanTypes: [ Html5QrcodeScanType.SCAN_TYPE_CAMERA ],
         videoConstraints: {
            facingMode: "environment",
         }
      }, false);
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch(e) {}
      scannerRef.current = null;
    }
  };

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    if (scanResult) return; // Prevent multiple scans
    try {
      stopScanner();
      
      // Checagem offline simplificada
      if (!navigator.onLine) {
        saveToOfflineQueue(decodedText);
        startScanner();
        return;
      }
      
      const enrollmentRef = doc(db, 'event_enrollments', decodedText);
      const enrollmentSnap = await getDoc(enrollmentRef);
      if (enrollmentSnap.exists()) {
        const data = enrollmentSnap.data() as EventEnrollment;
        data.id = enrollmentSnap.id;
        setScanResult(data);
        
        // fetch user to show name
        const uSnap = await getDoc(doc(db, 'users', data.userId));
        if (uSnap.exists()) {
           setScannedUser(uSnap.data());
        } else {
           setScannedUser({ name: "Usuário Desconhecido" });
        }
      } else {
        alert("Ingresso não encontrado ou inválido.");
        startScanner();
      }
    } catch(e) {
      console.error(e);
      // Se falhar por erro de rede ao tentar consultar
      if (e instanceof Error && e.message.includes('offline')) {
         saveToOfflineQueue(decodedText);
      } else {
         alert("Erro ao checar ingresso. Verifique sua conexão ou limpe o cache.");
      }
      startScanner();
    }
  };

  const saveToOfflineQueue = (decodedText: string) => {
    alert("Sem conexão: Ingresso salvo na fila de sincronização offline.");
    const q = [...offlineQueue, decodedText];
    setOfflineQueue(q);
    localStorage.setItem('coroado_checkin_queue', JSON.stringify(q));
  };

  const onScanFailure = (error: any) => {};

  const handleEnroll = async (event: EventInfo) => {
    if (!userData?.id) return alert("Você precisa estar logado!");
    const isEnrolled = enrollments.find(e => e.eventId === event.id);
    if (isEnrolled) {
      alert("Você já tem ingresso para este evento.");
      return;
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Sua sessão expirou. Entre novamente para realizar a inscrição.");
        return;
      }

      const enrollment = await postJson<{
        enrollmentId: string;
        alreadyEnrolled?: boolean;
        paymentRequired?: boolean;
        initPoint?: string;
      }>(`/api/events/${event.id}/enroll`, {
        kids: enrollKids,
      }, { token });

      if (enrollment.initPoint) {
        window.location.href = enrollment.initPoint;
        return;
      }

      if (enrollment.paymentRequired) {
        alert('Inscrição iniciada! Finalize o pagamento em Meus Ingressos.');
      } else if (enrollment.alreadyEnrolled) {
        alert('Você já tem ingresso para este evento.');
      } else {
        alert(`Inscrição confirmada com sucesso!`);
      }
      setSelectedEvent(null);
      setEnrollKids([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `event_enrollments`);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.location) {
      alert("Preencha as informações básicas do evento.");
      return;
    }
    try {
      if (newEvent.id) {
        await setDoc(doc(db, 'events', newEvent.id), {
          ...newEvent,
          updatedAt: serverTimestamp()
        }, { merge: true });
        alert("Evento atualizado com sucesso!");
      } else {
        const eventId = crypto.randomUUID();
        await setDoc(doc(db, 'events', eventId), {
          ...newEvent,
          tenantId: userData.tenantId,
          enrolled: 0,
          createdAt: serverTimestamp()
        });

        // Se há ministérios auxiliares, cria um briefing (Doc 15) para cada
        if (newEvent.requiredMinistries && newEvent.requiredMinistries.length > 0) {
          for (const mId of newEvent.requiredMinistries) {
            await setDoc(doc(db, 'briefings', crypto.randomUUID()), {
               title: `Apoio para Evento: ${newEvent.title}`,
               description: `Foi solicitado o apoio do seu ministério para o evento ${newEvent.title} que acontecerá dia ${newEvent.date} às ${newEvent.time}. Local: ${newEvent.location}. Por favor, avalie a viabilidade.`,
               requesterMinistry: userData.id,
               ministryId: mId,
               status: 'todo',
               deadline: newEvent.date,
               tenantId: userData.tenantId,
               createdAt: serverTimestamp()
            });
          }
        }

        if (newEvent.requiresFunding && newEvent.fundingAmount) {
          await setDoc(doc(db, 'briefings', crypto.randomUUID()), {
               title: `Aprovação Financeira: ${newEvent.title}`,
               description: `Foi solicitado R$ ${newEvent.fundingAmount} de verba para o evento ${newEvent.title} que acontecerá dia ${newEvent.date}. Local: ${newEvent.location}. Por favor, avalie a viabilidade do custeio pela Igreja.`,
               requesterMinistry: userData.id,
               ministryId: 'financeiro', // ID lógico para cair no board financeiro
               status: 'todo',
               deadline: newEvent.date,
               tenantId: userData.tenantId,
               createdAt: serverTimestamp()
          });
        }
        alert("Evento criado com sucesso!");
      }

      setShowNewEventForm(false);
      setNewEvent({ visibilityScope: 'church', isPaid: false, requiresRegistration: true, requiredMinistries: [], status: 'pending_approval' });
    } catch (e) {
      console.error(e);
      alert("Erro ao criar evento.");
    }
  };

  const handleConfirmCheckin = async () => {
    if (!scanResult) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Sessao expirada. Entre novamente para confirmar o check-in.");
        return;
      }

      await postJson(`/api/event-enrollments/${scanResult.id}/check-in`, {}, { token });
      alert(`Check-in confirmado para ${scannedUser?.name || 'Membro'}!`);
      setScanResult(null);
      setScannedUser(null);
      startScanner();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `event_enrollments/${scanResult.id}`);
    }
  };

  const cancelScanResult = () => {
    setScanResult(null);
    setScannedUser(null);
    startScanner();
  };

  const handleSyncOffline = async () => {
    if (offlineQueue.length === 0) return;
    if (!navigator.onLine) {
       alert("Dispositivo ainda está offline.");
       return;
    }
    
    let successCount = 0;
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
       alert("Sessao expirada. Entre novamente para sincronizar os check-ins.");
       return;
    }

    for (const enrollmentId of offlineQueue) {
       try {
         await postJson(`/api/event-enrollments/${enrollmentId}/check-in`, {}, { token });
         successCount++;
       } catch (error) {
         console.error(`Erro ao sincronizar ${enrollmentId}`, error);
       }
    }
    
    alert(`Sincronização concluída! ${successCount} ingressos registrados com sucesso.`);
    setOfflineQueue([]);
    localStorage.removeItem('coroado_checkin_queue');
  };

  const isAdmin = userData?.roles?.includes('admin') || can(userData, 'manage:events');

  return (
    <motion.div {...pageMotion} className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Eventos & Agenda</h1>
          <p className="text-white/60">Inscreva-se em cultos, retiros e conferências da igreja, e faça seu check-in.</p>
        </div>
        {isAnyLeader && (
          <Button onClick={() => { setNewEvent({ visibilityScope: 'church', isPaid: false, requiresRegistration: true, requiredMinistries: [], status: 'pending_approval' }); setShowNewEventForm(true); }} className="bg-primary text-black font-bold">
            Criar Evento
          </Button>
        )}
      </div>

      <div className="flex gap-2 bg-zinc-900 border border-white/10 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
        <button 
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "upcoming" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Próximos Eventos
          </div>
        </button>
        <button 
          onClick={() => {
            if (!isLoggedIn && onLoginClick) return onLoginClick();
            setActiveTab("mytickets");
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "mytickets" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4" /> Meus Ingressos
          </div>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab("admin")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "admin" ? "bg-primary/20 text-primary" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <div className="flex items-center gap-2">
              <ScanEye className="w-4 h-4" /> Check-in (Recepção)
            </div>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.2 }}
        >
          {activeTab === 'upcoming' && (() => {
            // Filter out past events based on the current date
            const today = new Date().toISOString().split('T')[0];
            const futureEvents = events.filter(e => e.date >= today);
            
            // Auto-select current month if dateFilter is empty
            const currentMonth = today.substring(0, 7);
            const appliedDateFilter = dateFilter || currentMonth;
            
            let filteredByDate = futureEvents;
            if (appliedDateFilter !== 'all') {
               filteredByDate = futureEvents.filter(e => e.date.startsWith(appliedDateFilter));
               // Se não houver eventos neste mês, busca o próximo evento disponível
               if (filteredByDate.length === 0 && futureEvents.length > 0) {
                 const nextEventMonth = futureEvents[0].date.substring(0, 7);
                 filteredByDate = futureEvents.filter(e => e.date.startsWith(nextEventMonth));
               }
            }
            
            const filteredByCategory = categoryFilter ? filteredByDate.filter(e => e.type === categoryFilter) : filteredByDate;
            
            const filteredEvents = filteredByCategory.filter(e => {
                if (can(userData, 'manage:events')) return true;
                if (!e.visibilityScope || e.visibilityScope === 'church') return e.status !== 'draft';
                if (e.visibilityScope === 'ministry') return userData?.roles?.includes('ministryLeader') || userData?.ministryId === e.visibilityId;
                if (e.visibilityScope === 'cell') return userData?.roles?.includes('cellLeader') || userData?.cellId === e.visibilityId;
                return false;
            });
            
            const groupedEvents = filteredEvents.reduce((acc, event) => {
               if (!acc[event.date]) acc[event.date] = [];
               acc[event.date].push(event);
               return acc;
            }, {} as Record<string, EventInfo[]>);

            return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-black/40 p-2 rounded-2xl border border-white/10">
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar">
                   <Button variant="ghost" className={`rounded-xl px-4 ${viewMode === 'list' ? 'bg-primary text-black font-bold' : 'text-white/60 hover:text-white'}`} onClick={() => setViewMode('list')}>Cards</Button>
                   <Button variant="ghost" className={`rounded-xl px-4 ${viewMode === 'calendar' ? 'bg-primary text-black font-bold' : 'text-white/60 hover:text-white'}`} onClick={() => setViewMode('calendar')}>Calendário Diário</Button>
                   <Button variant="ghost" className={`rounded-xl px-4 ${viewMode === 'monthly' ? 'bg-primary text-black font-bold' : 'text-white/60 hover:text-white'}`} onClick={() => setViewMode('monthly')}>Visão Mensal</Button>
                </div>
                <div className="w-full sm:w-auto flex flex-wrap items-center gap-4 pr-4 pl-4 sm:pl-0 border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                   <div className="flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-primary" />
                     <select 
                        value={dateFilter || 'all'} 
                        onChange={(e) => setDateFilter(e.target.value === 'all' ? 'all' : e.target.value)}
                        className="bg-zinc-900 border border-white/10 text-white text-sm rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                     >
                        <option value="all">Todos os Meses</option>
                        <option value="2026-06">Junho 2026</option>
                        <option value="2026-07">Julho 2026</option>
                        <option value="2026-08">Agosto 2026</option>
                        <option value="2026-09">Setembro 2026</option>
                        <option value="2026-10">Outubro 2026</option>
                        <option value="2026-11">Novembro 2026</option>
                        <option value="2026-12">Dezembro 2026</option>
                     </select>
                   </div>
                   <div className="flex items-center gap-2">
                     <select 
                        value={categoryFilter} 
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-zinc-900 border border-white/10 text-white text-sm rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                     >
                        <option value="">Todas as Categorias</option>
                        <option value="Culto Público">Cultos Públicos</option>
                        <option value="Conferência">Conferências</option>
                        <option value="Curso/Treinamento">Cursos e Treinamentos</option>
                        <option value="Retiro">Retiros</option>
                        <option value="Ação Social">Ação Social</option>
                        <option value="Evento Festivo">Eventos Festivos</option>
                     </select>
                   </div>
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map(event => {
                    const occupancy = (event.enrolled / event.capacity) * 100;
                    const isFull = event.enrolled >= event.capacity;
                    const alreadyEnrolled = enrollments.some(e => e.eventId === event.id);
                    return (
                      <Card key={event.id} className="bg-zinc-900 border-white/10 overflow-hidden flex flex-col group">
                        <div className="relative h-48 overflow-hidden">
                          <div className="absolute inset-0 bg-black/40 z-10" />
                          <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 grayscale group-hover:grayscale-0" />
                          <Badge className="absolute top-4 left-4 z-20 bg-primary/20 text-primary border-none">{event.type}</Badge>
                          <Badge className="absolute top-4 right-4 z-20 bg-black/60 text-white border-white/20 backdrop-blur-md">
                            {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </Badge>
                          {isAdmin && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="absolute bottom-4 right-4 z-20 bg-black/60 text-white border-white/20 hover:bg-black"
                              onClick={(e) => { e.stopPropagation(); setNewEvent(event); setShowNewEventForm(true); }}
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                        <CardHeader>
                          <CardTitle className="text-xl line-clamp-1">{event.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-2 font-medium">
                            <MapPin className="w-3 h-3 text-primary shrink-0" /> <span className="truncate">{event.location}</span>
                            <Clock className="w-3 h-3 text-primary shrink-0 ml-2" /> <span>{event.time}</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-white/60">
                              <span>Vagas: {event.enrolled} preenchidas</span>
                              <span>Capacidade: {event.capacity}</span>
                            </div>
                            <div className="h-1.5 bg-black rounded-full overflow-hidden">
                              <div className={`h-full ${isFull ? 'bg-red-500' : occupancy > 80 ? 'bg-yellow-500' : 'bg-primary'}`} style={{ width: `${occupancy}%` }} />
                            </div>
                            {isFull && !alreadyEnrolled && <p className="text-xs text-red-500 font-bold">Lotação Esgotada</p>}
                          </div>
                          <Button 
                            onClick={() => {
                              if (!isLoggedIn && onLoginClick) return onLoginClick();
                              if (!alreadyEnrolled) setSelectedEvent(event);
                            }}
                            disabled={isFull && !alreadyEnrolled}
                            className={`w-full font-bold ${(isFull && !alreadyEnrolled) ? 'bg-zinc-800 text-white/40' : alreadyEnrolled ? 'bg-primary/20 text-primary border-primary hover:bg-primary/30' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
                          >
                            {alreadyEnrolled ? 'Já Inscrito' : isFull ? 'Esgotado' : 'Garantir Vaga'}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                  {filteredEvents.length === 0 && <div className="col-span-full py-12 text-center text-white/40 border border-dashed border-white/10 rounded-2xl">Nenhum evento agendado para esta data.</div>}
                </div>
              ) : viewMode === 'calendar' ? (
                <div className="bg-zinc-900 border border-white/10 rounded-[2rem] p-6 lg:p-8 space-y-8">
                   {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                     <div key={date}>
                       <h3 className="text-2xl font-black font-serif italic text-primary mb-4 flex items-center gap-3">
                         <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center not-italic font-sans text-sm">{new Date(date + 'T00:00:00').getDate()}</div>
                         {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                       </h3>
                       <div className="space-y-3">
                         {(dayEvents as any[]).map(event => {
                            const alreadyEnrolled = enrollments.some(e => e.eventId === event.id);
                            return (
                             <div key={event.id} className="flex flex-col sm:flex-row gap-4 items-center bg-black/40 hover:bg-white/5 transition-colors p-4 rounded-2xl border border-white/5 group">
                               <div className="text-center px-6 border-b sm:border-b-0 sm:border-r border-white/10 pb-4 sm:pb-0 shrink-0 w-full sm:w-auto">
                                 <p className="text-3xl font-black">{event.time}</p>
                               </div>
                               <div className="flex-1 text-center sm:text-left">
                                 <h4 className="font-bold text-lg mb-1">{event.title}</h4>
                                 <p className="text-white/60 text-sm flex items-center justify-center sm:justify-start gap-1"><MapPin className="w-3 h-3 text-primary" /> {event.location}</p>
                               </div>
                               <div className="w-full sm:w-auto mt-4 sm:mt-0">
                                 <Button 
                                   onClick={() => { 
                                     if (!isLoggedIn && onLoginClick) return onLoginClick(); 
                                     if (!alreadyEnrolled) setSelectedEvent(event); 
                                   }} 
                                   className={`w-full sm:w-auto font-bold ${alreadyEnrolled ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-primary text-black'}`}
                                 >
                                   {alreadyEnrolled ? 'Inscrito' : 'Garantir Vaga'}
                                 </Button>
                               </div>
                             </div>
                            )
                         })}
                       </div>
                     </div>
                   ))}
                   {Object.keys(groupedEvents).length === 0 && (
                     <div className="text-center py-12 text-white/40 border border-dashed border-white/10 rounded-2xl">Nenhum evento agendado para o filtro selecionado.</div>
                   )}
                </div>
              ) : (
                <div className="bg-zinc-900 border border-white/10 rounded-[2rem] p-6 lg:p-8">
                   <div className="grid grid-cols-7 gap-2 mb-4">
                     {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                       <div key={day} className="text-center font-bold text-white/40 text-sm py-2">{day}</div>
                     ))}
                   </div>
                   <div className="grid grid-cols-7 gap-2">
                     {(() => {
                        // Montar calendário
                        // Como a busca pode não estar limitando a apenas um mês (se "all"), pegamos o primeiro mês dos eventos ou o atual
                        const baseDateStr = Object.keys(groupedEvents)[0] || new Date().toISOString().split('T')[0];
                        const baseDate = new Date(baseDateStr + 'T00:00:00');
                        const year = baseDate.getFullYear();
                        const month = baseDate.getMonth();
                        
                        const firstDayOfMonth = new Date(year, month, 1);
                        const lastDayOfMonth = new Date(year, month + 1, 0);
                        const daysInMonth = lastDayOfMonth.getDate();
                        const startDayOfWeek = firstDayOfMonth.getDay();
                        
                        const days = [];
                        for (let i = 0; i < startDayOfWeek; i++) {
                           days.push(<div key={`empty-${i}`} className="min-h-[100px] bg-black/20 rounded-xl border border-white/5 opacity-50"></div>);
                        }
                        
                        for (let day = 1; day <= daysInMonth; day++) {
                           const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                           const dayEvents = groupedEvents[dStr] || [];
                           
                           days.push(
                             <div key={dStr} className="min-h-[100px] bg-black/40 rounded-xl border border-white/10 p-2 flex flex-col hover:bg-white/5 transition-colors relative group">
                               <span className={`text-sm font-bold mb-2 ${dayEvents.length > 0 ? 'text-primary' : 'text-white/40'}`}>{day}</span>
                               <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                  {dayEvents.map(event => (
                                    <div 
                                      key={event.id} 
                                      onClick={() => { if (!isLoggedIn && onLoginClick) return onLoginClick(); setSelectedEvent(event); }}
                                      className="text-[10px] bg-primary/20 text-primary border border-primary/30 p-1 rounded truncate cursor-pointer hover:bg-primary hover:text-black transition-colors"
                                      title={event.title}
                                    >
                                      {event.time} - {event.title}
                                    </div>
                                  ))}
                               </div>
                             </div>
                           );
                        }
                        return days;
                     })()}
                   </div>
                   {Object.keys(groupedEvents).length === 0 && (
                     <div className="text-center py-12 text-white/40 border border-dashed border-white/10 rounded-2xl mt-4">Nenhum evento agendado para o filtro selecionado.</div>
                   )}
                </div>
              )}
            </div>
            );
          })()}

          {activeTab === 'mytickets' && (
            <div className="space-y-6">
              {enrollments.length === 0 && (
                <div className="text-center py-20 text-white/40">Você não possui ingressos.</div>
              )}
              {enrollments.map(enrollment => {
                const event = events.find(e => e.id === enrollment.eventId);
                if (!event) return null;
                return (
                  <div key={enrollment.id} className="flex flex-col md:flex-row bg-zinc-900 border border-white/10 rounded-[2rem] overflow-hidden align-center relative max-w-4xl mx-auto">
                     <div className="md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-dashed border-white/20 flex flex-col items-center justify-center bg-black/40 relative">
                       <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-black md:block hidden"></div>
                       <div className="absolute -bottom-4 -right-4 w-8 h-8 rounded-full bg-black md:block hidden"></div>

                       <div className={`p-4 rounded-xl ${enrollment.paymentStatus === 'pending' ? 'bg-zinc-950' : enrollment.checkedIn ? 'bg-zinc-800' : 'bg-white'}`}>
                         {enrollment.paymentStatus === 'pending' ? (
                           <div className="flex w-full max-w-[240px] flex-col items-center justify-center gap-3 text-center text-white">
                             <Ticket className="h-8 w-8 text-primary" />
                             <div>
                               <p className="text-sm font-black uppercase tracking-widest">Pagamento pendente</p>
                               <p className="mt-1 text-xs text-white/50">Finalize no checkout seguro para liberar o ingresso.</p>
                             </div>
                             {enrollment.paymentInitPoint ? (
                               <Button
                                 size="sm"
                                 className="rounded-full bg-primary px-5 text-xs font-black text-black hover:bg-primary/90"
                                 onClick={() => { window.location.href = enrollment.paymentInitPoint || ''; }}
                               >
                                 Continuar pagamento
                               </Button>
                             ) : (
                               <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Aguardando link de pagamento</p>
                             )}
                           </div>
                         ) : (
                           <ReactQrCode value={enrollment.id} size={150} fgColor={enrollment.checkedIn ? '#666' : '#000'} bgColor={enrollment.checkedIn ? '#27272a' : '#fff'} />
                         )}
                       </div>
                       {enrollment.paymentStatus !== 'pending' && <p className="mt-4 text-xs font-mono text-white/40 tracking-widest uppercase truncate w-32 text-center text-ellipsis">{enrollment.id}</p>}
                       {enrollment.checkedIn && <Badge className="mt-4 bg-green-500/20 text-green-400">Usado (Check-in)</Badge>}
                     </div>

                     <div className="md:w-2/3 p-8 md:p-12 space-y-6 flex flex-col justify-center relative opacity-90">
                       <div>
                         <Badge className="bg-primary/20 text-primary border-none mb-4">{event.type}</Badge>
                         <h3 className="text-3xl font-black font-serif italic mb-2">{event.title}</h3>
                         <p className="text-white/60">{event.description}</p>
                       </div>
                       <div className="flex flex-wrap gap-6 pt-4 border-t border-white/10">
                         <div>
                           <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Data</p>
                           <p className="font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> {new Date(event.date).toLocaleDateString('pt-BR')}</p>
                         </div>
                         <div>
                           <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Hora</p>
                           <p className="font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {event.time}</p>
                         </div>
                         <div>
                           <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Local</p>
                           <p className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {event.location}</p>
                         </div>
                       </div>
                     </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="max-w-md mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto">
                  <ScanEye className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold">Modo Escâner</h3>
                <p className="text-white/60">Aponte a câmera para o QR Code do ingresso do membro para registrar sua entrada.</p>
              </div>

              {!scanResult ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[2rem] border-2 border-dashed border-primary/50 relative bg-black">
                    <div id="qr-reader" className="w-full"></div>
                    <style>{`
                      #qr-reader { width: 100% !important; border: none !important; }
                      #qr-reader video { max-width: 100% !important; width: 100% !important; height: auto !important; border-radius: 1.5rem !important; object-fit: cover !important; }
                      #qr-reader__scan_region { min-height: 300px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                      #qr-reader__dashboard_section_csr span { color: white !important; }
                      #qr-reader__dashboard_section_swaplink { color: #f59e0b !important; }
                      #qr-reader__camera_selection { background: black; color: white; border: 1px solid #333; border-radius: 8px; padding: 4px; max-width: 100%; }
                      #qr-reader button { background-color: rgba(201,146,42,0.1); color: #C9922A; border: 1px solid rgba(201,146,42,0.3); border-radius: 8px; padding: 6px 12px; margin-top: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
                      #qr-reader button:hover { background-color: rgba(201,146,42,0.2); }
                    `}</style>
                  </div>
                  {offlineQueue.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                       <p className="text-yellow-500 font-bold mb-3">{offlineQueue.length} Check-ins salvos no dispositivo offline</p>
                       <Button onClick={handleSyncOffline} className="w-full bg-yellow-500 text-black hover:bg-yellow-600 font-bold">
                         Sincronizar Agora
                       </Button>
                    </div>
                  )}
                </div>
              ) : (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 border border-white/20 rounded-[2rem] p-8 text-center space-y-6">
                   <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Ticket className="w-8 h-8" />
                   </div>
                   <div>
                     <p className="text-sm text-white/60 font-bold uppercase tracking-widest">Ingresso Identificado</p>
                     <h3 className="text-2xl font-black mt-2 text-white">{events.find(e => e.id === scanResult.eventId)?.title || 'Evento Desconhecido'}</h3>
                   </div>
                   <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                     <p className="text-sm text-white/40 font-bold uppercase tracking-widest">Membro</p>
                     <p className="text-lg font-bold">{scannedUser?.name || 'Carregando...'}</p>
                   </div>
                   
                   {scanResult.kids && scanResult.kids.length > 0 && (
                     <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3 text-left">
                       <p className="text-sm text-primary font-bold uppercase tracking-widest text-center">Ministério Infantil</p>
                       {scanResult.kids.map((kid, idx) => (
                         <div key={idx} className="bg-black/40 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                           <div>
                             <p className="font-bold text-white text-sm">{kid.name} <span className="text-white/40 text-xs font-normal">({kid.age} anos)</span></p>
                             {kid.obs && <p className="text-xs text-red-300">Obs: {kid.obs}</p>}
                           </div>
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="text-xs h-7 border-primary/30 text-primary hover:bg-primary/20"
                             onClick={() => {
                               // Simulação de impressão de etiqueta térmica
                               const printContent = `
                                 <html>
                                   <head><style>body { font-family: sans-serif; text-align: center; padding: 20px; }</style></head>
                                   <body>
                                     <h2>${kid.name}</h2>
                                     <p>Responsável: ${scannedUser?.name || 'Membro'}</p>
                                     <p>Idade: ${kid.age}</p>
                                     ${kid.obs ? `<p><strong>Alerta:</strong> ${kid.obs}</p>` : ''}
                                     <p><small>${new Date().toLocaleString()}</small></p>
                                   </body>
                                 </html>
                               `;
                               const printWin = window.open('', '_blank');
                               if (printWin) {
                                 printWin.document.write(printContent);
                                 printWin.document.close();
                                 printWin.focus();
                                 printWin.print();
                                 printWin.close();
                               }
                             }}
                           >
                              Imprimir
                           </Button>
                         </div>
                       ))}
                     </div>
                   )}
                   
                   {scanResult.checkedIn ? (
                     <div className="space-y-4">
                       <Badge className="bg-red-500/20 text-red-500 px-4 py-2 text-sm">Este ingresso já foi utilizado!</Badge>
                       <Button onClick={cancelScanResult} variant="outline" className="w-full font-bold">Ler Novo Código</Button>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       <Button onClick={handleConfirmCheckin} className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-sm hover:bg-primary/90">
                         Confirmar Entrada
                       </Button>
                       <Button onClick={cancelScanResult} variant="ghost" className="w-full font-bold text-white/40 hover:text-white">
                         Cancelar
                       </Button>
                     </div>
                   )}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-zinc-900 border border-white/10 rounded-[2.5rem] max-w-lg w-full overflow-hidden"
            >
              <div className="h-48 relative">
                <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={() => { setSelectedEvent(null); setEnrollKids([]); }}
                   className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <Badge className="bg-primary/20 text-primary border-none mb-3">{selectedEvent.type}</Badge>
                  <h3 className="text-2xl font-black font-serif italic leading-tight mb-2">{selectedEvent.title}</h3>
                  <p className="text-white/60">{selectedEvent.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div className="space-y-1">
                     <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Data e Hora</p>
                     <p className="font-bold text-sm">{new Date(selectedEvent.date).toLocaleDateString('pt-BR')} às {selectedEvent.time}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Local</p>
                     <p className="font-bold text-sm">{selectedEvent.location}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <h4 className="font-bold text-sm text-white/80">Ministério Infantil / Dependentes</h4>
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="h-8 border-white/10 text-xs text-white"
                       onClick={() => setEnrollKids([...enrollKids, {name: '', age: '', obs: ''}])}
                     >
                       + Adicionar Criança
                     </Button>
                  </div>
                  {enrollKids.length > 0 && (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {enrollKids.map((kid, idx) => (
                         <div key={idx} className="bg-white/5 p-4 rounded-xl space-y-3 relative border border-white/10">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="absolute top-1 right-1 h-6 w-6 text-white/40 hover:text-red-400"
                             onClick={() => setEnrollKids(enrollKids.filter((_, i) => i !== idx))}
                           >
                             <X className="w-3 h-3" />
                           </Button>
                           <input 
                             className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none" 
                             placeholder="Nome da criança"
                             value={kid.name}
                             onChange={(e) => {
                                const newKids = [...enrollKids];
                                newKids[idx].name = e.target.value;
                                setEnrollKids(newKids);
                             }}
                           />
                           <div className="flex gap-2">
                             <input 
                               className="w-1/3 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none" 
                               placeholder="Idade"
                               value={kid.age}
                               onChange={(e) => {
                                  const newKids = [...enrollKids];
                                  newKids[idx].age = e.target.value;
                                  setEnrollKids(newKids);
                               }}
                             />
                             <input 
                               className="w-2/3 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none" 
                               placeholder="Obs (Alergias, etc)"
                               value={kid.obs}
                               onChange={(e) => {
                                  const newKids = [...enrollKids];
                                  newKids[idx].obs = e.target.value;
                                  setEnrollKids(newKids);
                               }}
                             />
                           </div>
                         </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={() => handleEnroll(selectedEvent)} className="w-full h-14 bg-primary text-black font-bold uppercase tracking-wider">
                  Confirmar Inscrição
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewEventForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-zinc-900 border border-white/10 rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black font-serif italic leading-tight">{newEvent.id ? 'Editar Evento' : 'Novo Evento'}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowNewEventForm(false)} className="bg-white/5 hover:bg-white/10 rounded-full">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Título do Evento</label>
                      <input className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" placeholder="Ex: Culto da Família" value={newEvent.title || ''} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Tipo/Categoria</label>
                      <select className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" value={newEvent.type || ''} onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}>
                        <option value="">Selecione...</option>
                        <option value="Culto">Culto</option>
                        <option value="Conferência">Conferência</option>
                        <option value="Retiro">Retiro</option>
                        <option value="Workshop">Workshop (Escola IDE)</option>
                        <option value="Célula">Encontro de Célula</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Data</label>
                      <input type="date" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" value={newEvent.date || ''} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Hora</label>
                      <input type="time" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" value={newEvent.time || ''} onChange={(e) => setNewEvent({...newEvent, time: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Capacidade</label>
                      <input type="number" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" placeholder="Qtd máxima" value={newEvent.capacity || ''} onChange={(e) => setNewEvent({...newEvent, capacity: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Local</label>
                    <input className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" placeholder="Ex: Campus Sede / Endereço" value={newEvent.location || ''} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Descrição</label>
                    <textarea className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none min-h-[80px]" placeholder="Mais detalhes sobre o evento..." value={newEvent.description || ''} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Foto do Evento</label>
                    <ImageUpload 
                      value={newEvent.image || ''} 
                      onChange={url => setNewEvent({ ...newEvent, image: url })} 
                      folder="images/eventos"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Escopo (Visibilidade)</label>
                      <select className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" value={newEvent.visibilityScope || 'church'} onChange={(e) => setNewEvent({...newEvent, visibilityScope: e.target.value as any, visibilityId: ''})}>
                        <option value="church">Toda a Igreja (Aprovação Pastoral)</option>
                        <option value="ministry">Meu Ministério Específico</option>
                        <option value="cell">Minha Célula</option>
                      </select>
                    </div>
                    {newEvent.visibilityScope === 'ministry' && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Selecione o Ministério</label>
                        <select className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" value={newEvent.visibilityId || ''} onChange={(e) => setNewEvent({...newEvent, visibilityId: e.target.value})}>
                          <option value="">Selecione...</option>
                          {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                    )}
                    {newEvent.visibilityScope === 'cell' && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Selecione a Célula</label>
                        <select className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" value={newEvent.visibilityId || ''} onChange={(e) => setNewEvent({...newEvent, visibilityId: e.target.value})}>
                          <option value="">Selecione...</option>
                          {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={newEvent.requiresRegistration} onChange={(e) => setNewEvent({...newEvent, requiresRegistration: e.target.checked})} />
                      <label className="text-sm font-bold">Requer Inscrição / Check-in de Acesso?</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={newEvent.isPaid} onChange={(e) => setNewEvent({...newEvent, isPaid: e.target.checked})} />
                      <label className="text-sm font-bold">Evento Pago (Mercado Pago - Pix/Cartão)?</label>
                    </div>
                    
                    {newEvent.isPaid && (
                      <div className="space-y-2 pl-6 border-l-2 border-primary/30">
                        <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Valor da Inscrição (R$)</label>
                        <input type="number" step="0.01" className="w-32 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" placeholder="0.00" value={newEvent.price || ''} onChange={(e) => setNewEvent({...newEvent, price: parseFloat(e.target.value) || 0})} />
                        <p className="text-xs text-white/40">Nota: O ingresso só será liberado após confirmação do Mercado Pago.</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <input type="checkbox" checked={newEvent.requiresFunding} onChange={(e) => setNewEvent({...newEvent, requiresFunding: e.target.checked})} />
                      <label className="text-sm font-bold text-yellow-500">Solicitar Verba/Custeio da Igreja?</label>
                    </div>

                    {newEvent.requiresFunding && (
                      <div className="space-y-2 pl-6 border-l-2 border-yellow-500/30">
                        <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Valor Solicitado (R$)</label>
                        <input type="number" step="0.01" className="w-32 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none" placeholder="0.00" value={newEvent.fundingAmount || ''} onChange={(e) => setNewEvent({...newEvent, fundingAmount: parseFloat(e.target.value) || 0})} />
                        <p className="text-xs text-white/40">Isso criará um Briefing para o Ministério Financeiro aprovar a despesa.</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-4">
                    <div>
                      <p className="text-sm font-bold">Ministérios Necessários (Apoio)</p>
                      <p className="text-xs text-white/60">Marque as equipes que precisarão servir (será aberto um Briefing automático para eles).</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                       {ministries.map(m => (
                         <div key={m.id} className="flex items-center gap-2 text-sm">
                           <input type="checkbox" checked={newEvent.requiredMinistries?.includes(m.id)} onChange={(e) => {
                             if (e.target.checked) setNewEvent({...newEvent, requiredMinistries: [...(newEvent.requiredMinistries || []), m.id]});
                             else setNewEvent({...newEvent, requiredMinistries: (newEvent.requiredMinistries || []).filter(id => id !== m.id)});
                           }} />
                           <span>{m.name}</span>
                         </div>
                       ))}
                    </div>
                  </div>

                </div>

                <div className="pt-4 border-t border-white/10">
                  <Button onClick={handleCreateEvent} className="w-full h-12 bg-primary text-black font-bold uppercase tracking-wider">
                    Salvar e Agendar Evento
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Users, Ticket, QrCode, ScanEye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactQrCode from 'react-qr-code';
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, getDoc, serverTimestamp, where } from "firebase/firestore";
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

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
};

type EventEnrollment = {
  id: string;
  eventId: string;
  userId: string;
  tenantId: string;
  checkedIn: boolean;
  kids?: { id: string, name: string, age: string, obs: string, checkedIn: boolean }[];
};

export function EventsView({ userData }: { userData?: any }) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'mytickets' | 'admin'>('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [enrollments, setEnrollments] = useState<EventEnrollment[]>([]);
  const [scanResult, setScanResult] = useState<EventEnrollment | null>(null);
  const [scannedUser, setScannedUser] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [enrollKids, setEnrollKids] = useState<{name: string, age: string, obs: string}[]>([]);

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
            type: docData.category || 'Geral',
            capacity: docData.capacity || 500,
            enrolled: docData.enrolled || 0,
            image: docData.image || 'https://images.unsplash.com/photo-1540039155733-d730a53ffb4c?q=80&w=800&auto=format&fit=crop',
            description: docData.description || ''
          } as EventInfo;
       }).sort((a,b) => a.date.localeCompare(b.date));
       setEvents(evs);
    }, (error) => {
       console.error("Error fetching events:", error);
    });
    return () => unsub();
  }, []);

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
      const enrollmentId = `${event.id}_${userData.id}`;
      await setDoc(doc(db, 'event_enrollments', enrollmentId), {
        eventId: event.id,
        userId: userData.id,
        tenantId: userData.tenantId,
        checkedIn: false,
        kids: enrollKids.map(k => ({...k, checkedIn: false, id: crypto.randomUUID()})),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert(`Inscrição confirmada com sucesso!`);
      setSelectedEvent(null);
      setEnrollKids([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `event_enrollments`);
    }
  };

  const handleConfirmCheckin = async () => {
    if (!scanResult) return;
    try {
      await updateDoc(doc(db, 'event_enrollments', scanResult.id), {
         checkedIn: true,
         updatedAt: serverTimestamp()
      });
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
    for (const enrollmentId of offlineQueue) {
       try {
         const enrollmentRef = doc(db, 'event_enrollments', enrollmentId);
         await updateDoc(enrollmentRef, {
            checkedIn: true,
            updatedAt: serverTimestamp()
         });
         successCount++;
       } catch (error) {
         console.error(`Erro ao sincronizar ${enrollmentId}`, error);
       }
    }
    
    alert(`Sincronização concluída! ${successCount} ingressos registrados com sucesso.`);
    setOfflineQueue([]);
    localStorage.removeItem('coroado_checkin_queue');
  };

  const isAdmin = userData?.roles?.includes('admin') || userData?.roles?.includes('pastor') || userData?.roles?.includes('leader');

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Eventos & Agenda</h1>
          <p className="text-white/60">Inscreva-se em cultos, retiros e conferências da igreja, e faça seu check-in.</p>
        </div>
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
          onClick={() => setActiveTab("mytickets")}
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
          {activeTab === 'upcoming' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => {
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
                        {new Date(event.date).toLocaleDateString('pt-BR')}
                      </Badge>
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
                        onClick={() => !alreadyEnrolled && setSelectedEvent(event)}
                        disabled={isFull && !alreadyEnrolled}
                        className={`w-full font-bold ${(isFull && !alreadyEnrolled) ? 'bg-zinc-800 text-white/40' : alreadyEnrolled ? 'bg-primary/20 text-primary border-primary hover:bg-primary/30' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
                      >
                        {alreadyEnrolled ? 'Já Inscrito' : isFull ? 'Esgotado' : 'Garantir Vaga'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

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

                       <div className={`p-4 rounded-xl ${enrollment.checkedIn ? 'bg-zinc-800' : 'bg-white'}`}>
                         <ReactQrCode value={enrollment.id} size={150} fgColor={enrollment.checkedIn ? '#666' : '#000'} bgColor={enrollment.checkedIn ? '#27272a' : '#fff'} />
                       </div>
                       <p className="mt-4 text-xs font-mono text-white/40 tracking-widest uppercase truncate w-32 text-center text-ellipsis">{enrollment.id}</p>
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

    </div>
  )
}


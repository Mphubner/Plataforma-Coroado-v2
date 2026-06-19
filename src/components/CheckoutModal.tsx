import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';

const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || 'TEST-4939536a-f2c1-4660-af98-2adb043eaa49';
if (publicKey) {
  initMercadoPago(publicKey, { locale: 'pt-BR' });
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
}

interface EventData {
  id: string;
  title: string;
  price: number;
  ticketTypes?: TicketType[];
  allowChildren?: boolean;
  childTicketPrice?: number;
  servantsSlug?: string;
  servantsPrice?: number;
  image?: string;
  description?: string;
  location?: string;
  date?: string;
  time?: string;
  requiresRegistration?: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  event: EventData | null;
  onClose: () => void;
  onSuccess: () => void;
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
}

export function CheckoutModal({ isOpen, event, onClose, onSuccess, isLoggedIn, onLoginClick }: CheckoutModalProps) {
  const [step, setStep] = useState<'selection' | 'payment' | 'success'>('selection');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [isServant, setIsServant] = useState(false);
  const [kidsCount, setKidsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && event) {
      const urlParams = new URLSearchParams(window.location.search);
      const servantSlug = urlParams.get('servant');
      if (servantSlug && servantSlug === event.servantsSlug) {
        setIsServant(true);
      }
    } else {
      setStep('selection');
      setSelectedTicketId('');
      setKidsCount(0);
      setIsServant(false);
      setPreferenceId('');
      setError('');
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const hasMultipleTickets = Array.isArray(event.ticketTypes) && event.ticketTypes.length > 0;
  
  const calculateTotal = () => {
    let total = event.price || 0;
    if (isServant && event.servantsPrice !== undefined) {
      total = event.servantsPrice;
    } else if (hasMultipleTickets && selectedTicketId) {
      const ticket = event.ticketTypes!.find(t => t.id === selectedTicketId);
      if (ticket) total = ticket.price;
    }

    if (kidsCount > 0 && event.allowChildren) {
      total += (event.childTicketPrice || 0) * kidsCount;
    }
    return total;
  };

  const handleGeneratePayment = async () => {
    if (!isLoggedIn) {
      if (onLoginClick) onLoginClick();
      return;
    }

    if (hasMultipleTickets && !selectedTicketId && !isServant) {
      setError('Por favor, selecione um tipo de ingresso.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const kidsArray = Array(kidsCount).fill({ name: 'Criança Adicional', age: 'N/A', obs: '' });
      
      const enrollFunction = httpsCallable(functions, 'createEventEnrollment');
      const createPreferenceFunction = httpsCallable(functions, 'createPreference');

      // 1. Create Event Enrollment
      const enrollResponse = await enrollFunction({ 
        eventId: event.id,
        kids: kidsArray,
        ticketTypeId: selectedTicketId,
        isServant
      });
      const payload: any = enrollResponse.data;

      if (!payload.success) {
        throw new Error(payload.error || 'Não foi possível iniciar o pagamento.');
      }

      if (payload.paymentRequired && !payload.initPoint) {
        // 2. Generate Preference if required
        const prefResponse = await createPreferenceFunction({
          eventId: event.id,
          enrollmentId: payload.enrollmentId
        });
        const prefPayload: any = prefResponse.data;
        if (prefPayload.preferenceId) {
          setPreferenceId(prefPayload.preferenceId);
          setStep('payment');
        } else {
          throw new Error('Não foi possível gerar a preferência de pagamento.');
        }
      } else if (payload.paymentRequired && payload.initPoint) {
        window.location.href = payload.initPoint;
      } else if (!payload.paymentRequired) {
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg rounded-xl bg-[#0f0f0f] border border-white/10 p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        >
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-white/50 hover:text-white" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>

          {step === 'selection' && (
            <div className="space-y-6">
              <div className="relative -mt-6 -mx-6 mb-6 rounded-t-xl overflow-hidden h-48 bg-zinc-800">
                 {event.image ? (
                   <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-2xl text-center px-4">
                     {event.title}
                   </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                 <div className="absolute bottom-4 left-4 right-4">
                   <h2 className="text-2xl font-black text-white">{event.title}</h2>
                   <div className="flex flex-wrap items-center gap-3 text-xs text-white/70 mt-2">
                     {event.date && event.time && <span>{new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {event.time}</span>}
                     {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {event.location}</span>}
                   </div>
                 </div>
              </div>

              {event.description && (
                <div className="text-sm text-white/70 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
                  {event.description}
                </div>
              )}

              {error && <div className="text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">{error}</div>}

              {!event.requiresRegistration ? (
                 <div className="bg-primary/20 border border-primary/30 p-6 rounded-xl text-center">
                   <p className="font-black text-xl text-primary mb-3">Evento Aberto</p>
                   <p className="text-sm text-white/80 leading-relaxed mb-6">Este é um culto ou evento aberto que não requer inscrição prévia nem pagamento. Basta comparecer ao local no horário marcado para participar.</p>
                   <Button className="w-full h-12 bg-primary text-black font-bold hover:bg-primary/90" onClick={onClose}>
                     Entendido
                   </Button>
                 </div>
              ) : (
                <>
                  {isServant && (
                     <div className="bg-primary/20 border border-primary/30 p-4 rounded-xl">
                       <p className="font-bold text-primary mb-1">Ingresso Especial (Servos)</p>
                       <p className="text-xl font-black">R$ {event.servantsPrice?.toFixed(2)}</p>
                     </div>
                  )}

                  {!isServant && hasMultipleTickets && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40">Selecione o Ingresso</label>
                      <div className="grid gap-2">
                        {event.ticketTypes!.map(ticket => (
                          <button 
                            key={ticket.id} 
                            onClick={() => setSelectedTicketId(ticket.id)}
                            className={`flex justify-between items-center p-4 rounded-xl border text-left transition-colors ${selectedTicketId === ticket.id ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                          >
                            <span className="font-bold">{ticket.name}</span>
                            <span className="font-black text-lg">R$ {ticket.price.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isServant && !hasMultipleTickets && (
                    <div className="flex justify-between items-center p-4 rounded-xl border border-white/10 bg-white/5">
                      <span className="font-bold">Inscrição Padrão</span>
                      <span className="font-black text-lg">R$ {event.price.toFixed(2)}</span>
                    </div>
                  )}

                  {event.allowChildren && (
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40">Crianças Adicionais (R$ {event.childTicketPrice?.toFixed(2)}/cada)</label>
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => setKidsCount(Math.max(0, kidsCount - 1))}>-</Button>
                        <span className="font-bold text-lg w-8 text-center">{kidsCount}</span>
                        <Button variant="outline" size="icon" onClick={() => setKidsCount(kidsCount + 1)}>+</Button>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-widest">Total a pagar</p>
                      <p className="text-3xl font-black text-primary mt-1">R$ {calculateTotal().toFixed(2)}</p>
                    </div>
                    <Button 
                      className="bg-primary text-black font-bold h-12 px-6" 
                      disabled={isLoading || (!isServant && hasMultipleTickets && !selectedTicketId)}
                      onClick={handleGeneratePayment}
                    >
                      {isLoading ? 'Processando...' : 'Prosseguir para Pagamento'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'payment' && (
             <div className="space-y-4">
                <h2 className="text-xl font-black mb-4">Pagamento</h2>
                {preferenceId ? (
                   <Wallet initialization={{ preferenceId }} />
                ) : (
                  <p className="text-white/50 text-center py-8">Preparando pagamento...</p>
                )}
             </div>
          )}

          {step === 'success' && (
             <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-full mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black">Inscrição Pré-reservada</h2>
                <p className="text-white/60">Sua inscrição será garantida após confirmação do pagamento. Você receberá um e-mail com os detalhes.</p>
                <Button className="w-full mt-6 bg-white/10 text-white hover:bg-white/20" onClick={() => { onSuccess(); onClose(); }}>
                  Voltar para Eventos
                </Button>
             </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

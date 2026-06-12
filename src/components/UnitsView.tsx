import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const UNITS = [
  {
    id: 'sede',
    name: 'Coroado Sede',
    address: 'Rua Padre José de Anchieta, 36 - Coroado, Guarapari - ES',
    serviceTimes: 'Domingo às 10h, 18h e 20h',
    phone: '(27) 99999-9999',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3732.8895932719656!2d-40.519796!3d-20.6740703!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb85636e80cba7d%3A0xafa61e9023f5dca2!2sIgreja%20Coroado!5e0!3m2!1spt-BR!2sbr!4v1776019674123!5m2!1spt-BR!2sbr',
    image: 'https://images.unsplash.com/photo-1472905981516-5ac09f35b7f4?q=80&w=1174&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    referrerPolicy: 'no-referrer'
  },
  {
    id: 'coroado-norte',
    name: 'Coroado Norte',
    address: 'Av. Água M.nha, 3442 - Santa Mônica, Guarapari - ES, 29220-700',
    serviceTimes: 'Domingo às 19h',
    phone: '(27) 99999-8888',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d59726.26898758945!2d-40.55842082843687!3d-20.673980063444038!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb85b005aead363%3A0x667e3278df6645c8!2sCoroado%20Unidade%20Norte!5e0!3m2!1spt-BR!2sbr!4v1776019830302!5m2!1spt-BR!2sbr',
    image: 'https://images.unsplash.com/photo-1499652848871-1527a310b13a?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    referrerPolicy: 'no-referrer'
  }
];

export function UnitsView({ isAdmin, userData }: { isAdmin?: boolean; userData?: any }) {
  const [unitsList, setUnitsList] = React.useState<any[]>(UNITS);

  React.useEffect(() => {
    const q = userData?.tenantId
      ? query(collection(db, 'units'), where('tenantId', '==', userData.tenantId))
      : query(collection(db, 'units'));

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setUnitsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setUnitsList(UNITS); // Fallback para lista mock
      }
    });
    return () => unsub();
  }, [userData?.tenantId]);

  return (
    <div className="space-y-20 pb-20">
      <div className="space-y-6">
        <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
          Localização
        </Badge>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] font-serif italic text-white">Nossas Unidades</h1>
        <p className="text-xl text-white/60 max-w-2xl font-medium">
          Encontre a Igreja Coroado mais próxima de você. Estamos de braços abertos para receber você e sua família.
        </p>
      </div>

      <div className="space-y-6">
        {isAdmin && (
          <div className="flex justify-end">
             <Button variant="outline" className="border-white/10" onClick={() => alert("Gerenciamento de Unidades será integrado ao painel Gestão")}>
                + Adicionar Unidade
             </Button>
          </div>
        )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {unitsList.map((unit, index) => (
          <motion.div
            key={unit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -10 }}
          >
            <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col h-full group">
              {/* Unit Image & Map Overlay */}
              <div className="relative h-[400px] overflow-hidden">
                <img 
                  src={unit.image} 
                  alt={unit.name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent z-10" />
                
                {/* Map Iframe */}
                <div className="absolute inset-x-6 top-6 bottom-32 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl z-20">
                  <iframe 
                    src={unit.mapUrl} 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full grayscale contrast-125 invert brightness-90 opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                <div className="absolute bottom-8 left-10 right-10 z-30">
                  <h2 className="text-4xl font-black font-serif italic text-white group-hover:text-primary transition-colors">{unit.name}</h2>
                </div>
              </div>
              
              <div className="p-10 pt-0 flex-1 flex flex-col space-y-8">
                <div className="space-y-4 flex-1">
                  <div className="flex items-start gap-4 text-white/60 font-medium">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <span className="pt-2">{unit.address}</span>
                  </div>
                  <div className="flex items-start gap-4 text-white/60 font-medium">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <span className="pt-2">{unit.serviceTimes}</span>
                  </div>
                  <div className="flex items-start gap-4 text-white/60 font-medium">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <span className="pt-2">{unit.phone}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(unit.address)}`, '_blank')}
                  className="w-full h-16 bg-primary text-black hover:bg-primary/90 font-black rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg uppercase tracking-widest"
                >
                  <Navigation className="mr-3 w-6 h-6" /> Como Chegar
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
}

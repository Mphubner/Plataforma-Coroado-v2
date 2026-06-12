import React from 'react';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Youtube, Mail, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const PASTORS = [
  {
    id: 'rafael',
    name: 'Rafael Vaillant',
    role: 'Pastor Presidente',
    image: 'https://i.imgur.com/guYg9mA.png',
    bookingUrl: 'https://calendly.com/coroado/rafael',
    social: {
      facebook: 'https://www.facebook.com/rafael.vaillant',
      instagram: 'https://www.instagram.com/rafaelvaillant.coroado/',
      youtube: 'https://www.youtube.com/@IgrejaCoroado'
    }
  },
  {
    id: 'fabricio',
    name: 'Fabricio Campos',
    role: 'Pastor de Rede',
    image: 'https://imgur.com/N4sRBgl.png',
    bookingUrl: 'https://calendly.com/coroado/fabricio',
    social: {
      facebook: '#',
      instagram: '#',
      youtube: 'https://www.youtube.com/@IgrejaCoroado'
    }
  },
  {
    id: 'alan',
    name: 'Alan Vaz',
    role: 'Pastor de Rede',
    image: 'https://i.imgur.com/dpggKK7.png',
    bookingUrl: 'https://calendly.com/coroado/alan',
    social: {
      facebook: '#',
      instagram: '#',
      youtube: 'https://www.youtube.com/@IgrejaCoroado'
    }
  }
];

export function PastorsView({ isAdmin, userData }: { isAdmin?: boolean; userData?: any }) {
  const [pastorsList, setPastorsList] = React.useState<any[]>(PASTORS);

  React.useEffect(() => {
    const q = userData?.tenantId
      ? query(collection(db, 'pastors'), where('tenantId', '==', userData.tenantId))
      : query(collection(db, 'pastors'));

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPastorsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setPastorsList(PASTORS); // Fallback para lista mock enquanto não há pastores no DB
      }
    });
    return () => unsub();
  }, [userData?.tenantId]);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 min-h-[400px] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 1.5 }}
            src="https://images.unsplash.com/photo-1438283173091-5dbf5c5a3206?q=80&w=1200&auto=format&fit=crop" 
            alt="Igreja Coroado" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-20 p-8 md:p-20 max-w-3xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
              Liderança
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] font-serif italic text-white">
              Nossos Pastores
            </h1>
            <p className="text-xl text-white/60 leading-relaxed max-w-xl font-medium">
              Conheça os líderes que Deus levantou para guiar, cuidar e pastorear a família Coroado. Homens dedicados ao ensino da Palavra e ao amor pelas pessoas.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pastors Grid */}
      <section className="space-y-6">
        {isAdmin && (
          <div className="flex justify-end">
             <Button variant="outline" className="border-white/10" onClick={() => alert("Gerenciamento de Pastores será integrado ao painel Gestão")}>
                + Adicionar Pastor
             </Button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pastorsList.map((pastor, index) => (
            <motion.div
              key={pastor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="glass-card rounded-[2.5rem] overflow-hidden group relative aspect-[4/5]">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                <img 
                  src={pastor.image} 
                  alt={pastor.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  referrerPolicy="no-referrer"
                />
                
                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-10 z-20 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black font-serif italic text-white group-hover:text-primary transition-colors">{pastor.name}</h2>
                    <p className="text-primary font-bold uppercase tracking-widest text-xs">{pastor.role}</p>
                  </div>
                  
                  {/* Social Links */}
                  <div className="flex items-center gap-3 pt-2">
                    {pastor.social.facebook !== '#' && (
                      <motion.a 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href={pastor.social.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                      >
                        <Facebook className="w-5 h-5" />
                      </motion.a>
                    )}
                    {pastor.social.instagram !== '#' && (
                      <motion.a 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href={pastor.social.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                      >
                        <Instagram className="w-5 h-5" />
                      </motion.a>
                    )}
                    {pastor.social.youtube !== '#' && (
                      <motion.a 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href={pastor.social.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                      >
                        <Youtube className="w-5 h-5" />
                      </motion.a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="glass-card rounded-[2.5rem] p-12 md:p-20 text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-black font-serif italic text-white">Precisa de Aconselhamento?</h2>
          <p className="text-white/50 text-xl max-w-2xl mx-auto font-medium">
            Nossa equipe pastoral está pronta para ouvir, orar com você e oferecer direcionamento bíblico para os desafios da vida.
          </p>
        </div>
        <Button 
          onClick={() => window.open('https://calendly.com/coroado/atendimento', '_blank')}
          className="bg-primary text-black hover:bg-primary/90 font-black px-10 h-16 text-lg rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          Agendar Atendimento <ChevronRight className="ml-2 w-6 h-6" />
        </Button>
      </section>
    </div>
  );
}

// Need to import Badge at the top, let's add it.

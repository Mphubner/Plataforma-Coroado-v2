import React from 'react';
import { motion } from 'motion/react';
import { Instagram, Youtube, Facebook, Music, PlayCircle, Radio, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SOCIAL_LINKS = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Acompanhe nosso dia a dia, eventos e mensagens curtas.',
    icon: Instagram,
    url: 'https://www.instagram.com/igrejacoroado/',
    color: 'from-pink-500 to-purple-500',
    handle: '@igrejacoroado'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Assista aos nossos cultos ao vivo e mensagens completas.',
    icon: Youtube,
    url: 'https://www.youtube.com/@IgrejaCoroado',
    color: 'from-red-500 to-red-600',
    handle: 'Igreja Coroado'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Ouça nossos louvores e podcasts de mensagens.',
    icon: Music,
    url: '#',
    color: 'from-green-400 to-green-600',
    handle: 'Coroado Worship'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Fique por dentro das novidades e comunicados.',
    icon: Facebook,
    url: 'https://www.facebook.com/igrejacoroado',
    color: 'from-blue-500 to-blue-700',
    handle: '/igrejacoroado'
  },
  {
    id: 'website',
    name: 'Site Oficial',
    description: 'Acesse nosso portal para mais informações institucionais.',
    icon: Globe,
    url: 'https://coroado.org',
    color: 'from-zinc-500 to-zinc-700',
    handle: 'coroado.org'
  }
];

export function SocialMediaView() {
  return (
    <div className="space-y-20 pb-20">
      <div className="text-center max-w-2xl mx-auto space-y-6">
        <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
          Conecte-se
        </Badge>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] font-serif italic text-white">Nossas Redes</h1>
        <p className="text-xl text-white/60 font-medium">
          Acompanhe a Igreja Coroado em todas as plataformas digitais. Fique por dentro de tudo o que acontece e seja edificado durante toda a semana.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {SOCIAL_LINKS.map((link, index) => {
          const Icon = link.icon;
          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                <div className="glass-card rounded-[2.5rem] p-10 flex flex-col items-center text-center h-full group relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  
                  <div className={`w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${link.color} flex items-center justify-center mb-8 shadow-2xl transform group-hover:scale-110 transition-transform duration-500`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black font-serif italic text-white group-hover:text-primary transition-colors">{link.name}</h2>
                      <p className="text-primary font-bold uppercase tracking-widest text-xs">{link.handle}</p>
                    </div>
                    <p className="text-white/50 font-medium leading-relaxed flex-1">{link.description}</p>
                  </div>

                  <div className="mt-8 w-full">
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-white/10 group-hover:border-primary group-hover:bg-primary group-hover:text-black transition-all font-bold uppercase tracking-widest text-xs">
                      Seguir Agora
                    </Button>
                  </div>
                </div>
              </a>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

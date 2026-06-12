import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, HandHeart, ChevronRight, ExternalLink, Instagram } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function SocialView({ onLoginClick, isLoggedIn = false }: { onLoginClick?: () => void; isLoggedIn?: boolean }) {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 min-h-[500px] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 1.5 }}
            src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000&auto=format&fit=crop" 
            alt="Coroado Social" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-20 p-8 md:p-20 max-w-3xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
              ONG Coroado Social
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] font-serif italic text-white">
              Amor em <br />
              <span className="text-primary">Ação</span>
            </h1>
            <p className="text-xl text-white/60 leading-relaxed max-w-xl font-medium">
              O Coroado Social é o braço de assistência da nossa igreja. Acreditamos que o evangelho transforma não apenas o espírito, mas também a realidade social da nossa comunidade.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button 
                onClick={() => {
                  if (isLoggedIn) {
                    window.open('https://wa.me/5527999999999?text=Olá! Gostaria de ser um servo no Coroado Social.', '_blank')
                  } else {
                    onLoginClick?.();
                  }
                }}
                className="bg-primary text-black hover:bg-primary/90 font-black px-10 h-14 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Heart className="mr-2 w-5 h-5" /> Seja um Servo
              </Button>
              <a 
                href="https://www.instagram.com/social.coroado/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-white/10 hover:bg-white/5 rounded-full px-10 h-14 font-bold backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                )}
              >
                <Instagram className="mr-2 w-5 h-5" /> @social.coroado
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Users, val: "+500", label: "Famílias Atendidas" },
          { icon: HandHeart, val: "+10t", label: "Alimentos Doados" },
          { icon: Heart, val: "120", label: "Servos Ativos" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="glass-card p-10 rounded-[2.5rem] flex flex-col items-center text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <stat.icon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-5xl font-black font-serif italic text-white">{stat.val}</h3>
              <p className="text-white/40 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Projects */}
      <section className="space-y-10">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight font-serif italic">Nossos Projetos</h2>
            <p className="text-white/50">Conheça as frentes de atuação do Coroado Social.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[
            { 
              title: "Cestas Básicas", 
              desc: "Distribuição mensal de alimentos para famílias em situação de vulnerabilidade social cadastradas em nosso programa.",
              img: "https://images.unsplash.com/photo-1593113565214-8cb20299600b?q=80&w=800&auto=format&fit=crop"
            },
            { 
              title: "Apoio Escolar", 
              desc: "Reforço escolar e distribuição de material didático para crianças e adolescentes da comunidade.",
              img: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop"
            }
          ].map((proj, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="glass-card rounded-[2.5rem] overflow-hidden group"
            >
              <div className="h-64 overflow-hidden relative">
                <img 
                  src={proj.img} 
                  alt={proj.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
              </div>
              <div className="p-10 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black font-serif italic text-white group-hover:text-primary transition-colors">{proj.title}</h3>
                  <p className="text-white/60 leading-relaxed font-medium">{proj.desc}</p>
                </div>
                <Button variant="link" className="text-white p-0 h-auto font-black text-xs uppercase tracking-widest group-hover:text-primary transition-colors">
                  Saber mais <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

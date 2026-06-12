import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, Send, Radio, Zap, Clock, Smartphone, Globe, Shield } from "lucide-react";
import { motion } from "motion/react";
import { auth } from "@/lib/firebase";

export function AdminAutomations() {
  const [activePreset, setActivePreset] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const triggerNotification = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessao expirada. Entre novamente.");

      const response = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preset: activePreset || 'manual' }),
      });
      const data = await response.json().catch(() => ({}));
      setStatusMessage(data.error || (response.ok ? 'Solicitacao enviada.' : 'Falha ao enviar notificacao.'));
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  };

  const automations = [
    { trigger: "Ausência Mensal (Célula)", action: "Notificação Push para o Líder", audience: "Líderes de Célula", active: true },
    { trigger: "Novo Visitante no App", action: "Alerta de SMS para Recepção", audience: "Eq. de Recepção", active: true },
    { trigger: "Carrinho Abandonado (Loja)", action: "Email com cupom 10%", audience: "Membros Geral", active: false },
    { trigger: "Inscrição Concluída (Evento)", action: "Voucher e QR via WhatsApp", audience: "Inscritos", active: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Centro de Notificações</h2>
          <p className="text-white/60">Disparos Globais PWA, Alertas, e Automações de Acesso.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/10 hover:bg-white/5" disabled>
            <Radio className="mr-2 h-4 w-4" /> Log de Disparos
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Painel de Disparo Manual de Alertas */}
        <Card className="bg-zinc-900 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Globe className="w-48 h-48" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="h-5 w-5 text-primary" />
              Disparo em Tempo Real (Global)
            </CardTitle>
            <CardDescription>Envie push notifications e in-app alerts para os dispositivos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-white/40 tracking-wider">Título do Alerta</label>
                <Input placeholder="Ex: Novo Culto de Celebração" className="bg-black/50 border-white/10" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-white/40 tracking-wider">Mensagem</label>
                <textarea 
                  className="w-full min-h-[80px] bg-black/50 border border-white/10 rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Escreva a mensagem curta que aparecerá na tela..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-white/40 tracking-wider">Audiência</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="bg-black/50 border-white/10">
                      <SelectValue placeholder="Selecione o público" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="all">Todos os Usuários App</SelectItem>
                      <SelectItem value="leaders">Apenas Liderança</SelectItem>
                      <SelectItem value="volunteers">Servos (Escalas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-white/40 tracking-wider">Canal de Entrega</label>
                  <Select defaultValue="push">
                    <SelectTrigger className="bg-black/50 border-white/10">
                      <SelectValue placeholder="Selecione o canal" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="push"><span className="flex items-center"><Smartphone className="w-3 h-3 mr-2"/> Push PWA</span></SelectItem>
                      <SelectItem value="in-app"><span className="flex items-center"><Bell className="w-3 h-3 mr-2"/> In-App Banner</span></SelectItem>
                      <SelectItem value="email"><span className="flex items-center"><Mail className="w-3 h-3 mr-2"/> E-mail</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {statusMessage && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                {statusMessage}
              </div>
            )}

            <Button onClick={triggerNotification} className="w-full h-12 bg-primary text-black font-black uppercase tracking-wider hover:bg-primary/90 flex items-center justify-center space-x-2">
              <Send className="w-4 h-4" />
              <span>Lançar Notificação</span>
            </Button>
          </CardContent>
        </Card>

        {/* Réguas de Automação */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">Réguas Ativas (Triggers)</h3>
            <Badge className="bg-primary text-black font-bold">Gerenciável</Badge>
          </div>
          <div className="space-y-3">
            {automations.map((rule, idx) => (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                key={idx} 
                className={`p-4 rounded-xl border flex flex-col gap-3 ${rule.active ? 'bg-white/5 border-white/10' : 'bg-black/50 border-white/5 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${rule.active ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/40'}`}>
                      {rule.action.includes('Email') ? <Mail className="w-5 h-5"/> : <Bell className="w-5 h-5"/>}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight text-white">{rule.trigger}</p>
                      <p className="text-xs text-secondary font-medium tracking-wide">ALVO: {rule.audience}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={rule.active ? 'border-primary/50 text-primary' : 'border-white/20 text-white/40'}>
                    {rule.active ? 'Ativo' : 'Pausado'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pl-11">
                  <ArrowRightIcon className="w-3 h-3 text-white/30" />
                  <span className="text-xs text-white/60">Ação automatizada: <strong className="text-white/80">{rule.action}</strong></span>
                </div>
              </motion.div>
            ))}
            <Button variant="outline" className="w-full border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5" disabled>
              Criar Nova Automação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

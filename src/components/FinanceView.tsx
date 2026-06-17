import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HeartHandshake, DollarSign, Target, MapPin, Globe, CreditCard, Send, History, CheckCircle2, QrCode, Copy, ChevronRight, TrendingUp, Users, Calendar, Heart, Edit3, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ImageUpload } from './ui/ImageUpload';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import ReactQrCode from 'react-qr-code';
import { can } from '@/src/lib/permissions';
import { COLLECTIONS } from '@/src/lib/domain/collections';
import { postJson } from '@/src/lib/api/http';
import { pageMotion } from '@/src/lib/motion/presets';

const EMPTY_CAMPAIGN = {
  title: '',
  description: '',
  target: 0,
  current: 0,
  donors: 0,
  deadline: '',
  imageUrl: '',
  impactReports: [] as Array<{ date: string; text: string; image: string }>,
};

interface FinanceViewProps {
  userData?: any;
}

export function FinanceView({ userData }: FinanceViewProps) {
  const [activeTab, setActiveTab] = useState<'tithes' | 'missions' | 'history'>('tithes');
  const [donateAmount, setDonateAmount] = useState('100');
  const [donateType, setDonateType] = useState('dizimo');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showPix, setShowPix] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);

  const tenantId = userData?.tenantId || 'tenant-1';
  const isAdmin = can(userData, 'manage:finance');

  useEffect(() => {
    if (!userData?.id) return;
    const q = query(
      collection(db, COLLECTIONS.transactions),
      where('userId', '==', userData.id),
      where('tenantId', '==', tenantId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      txs.sort((a: any, b: any) => {
        const da = a.createdAt?.seconds || 0;
        const dbVal = b.createdAt?.seconds || 0;
        return dbVal - da;
      });
      setHistory(txs);
    });
    
    const qCamps = query(
      collection(db, 'campaigns'),
      where('tenantId', '==', tenantId)
    );
    const unsubCamps = onSnapshot(qCamps, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); unsubCamps(); };
  }, [userData?.id, tenantId]);

  const handlePixIntent = () => {
    setShowPix(true);
  };

  const registerPendingPayment = async () => {
    if (!userData?.id) {
      alert("Você precisa estar logado!");
      return;
    }
    const amount = Number(donateAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Informe um valor valido para a contribuicao.");
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Sua sessão expirou. Entre novamente para registrar a contribuição.");
        return;
      }

      await postJson('/api/contributions', {
        amount,
        contributionType: donateType === 'dizimo' ? 'Dízimo' : (donateType === 'oferta' ? 'Oferta' : `Campanha: ${donateType}`),
        itemId: selectedCampaignId || donateType,
        method: 'pix_manual',
      }, { token });
      alert("Contribuicao registrada como pendente. A confirmacao final deve ser feita pelo financeiro apos conciliacao.");
    } catch(e) {
      console.error(e);
      alert("Erro ao salvar contribuição: " + (e as Error).message);
    }
    setShowPix(false);
    setSelectedCampaignId(null);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCampaign.id) {
        await updateDoc(doc(db, 'campaigns', editingCampaign.id), {
          ...editingCampaign,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'campaigns'), {
          ...editingCampaign,
          tenantId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setShowCampaignForm(false);
      setEditingCampaign(null);
    } catch(err) {
      console.error(err);
      alert("Erro ao salvar campanha");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if(confirm('Deseja realmente excluir esta campanha?')) {
      await deleteDoc(doc(db, 'campaigns', id));
    }
  };

  return (
    <motion.div {...pageMotion} className="space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Financeiro & Missões</h1>
        <p className="text-white/60">Gestão de dízimos, ofertas e envolvimento nos campos missionários.</p>
      </div>

      <div className="flex gap-2 bg-zinc-900 border border-white/10 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
        <button 
          onClick={() => setActiveTab("tithes")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "tithes" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Dízimos e Ofertas
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("missions")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "missions" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" /> Missões e Projetos
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === "history" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" /> Histórico
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'tithes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader>
                  <CardTitle className="text-2xl">Nova Contribuição</CardTitle>
                  <CardDescription>Devolva seu dízimo ou oferte com facilidade e segurança.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setDonateType('dizimo')}
                      className={`h-16 ${donateType === 'dizimo' ? 'bg-primary/20 border-primary text-white' : 'bg-black border-white/10 text-white/60'}`}
                    >
                      Dízimo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setDonateType('oferta')}
                      className={`h-16 ${donateType === 'oferta' ? 'bg-primary/20 border-primary text-white' : 'bg-black border-white/10 text-white/60'}`}
                    >
                      Oferta Voluntária
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white/60">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input 
                        type="number" 
                        value={donateAmount}
                        onChange={(e) => setDonateAmount(e.target.value)}
                        className="pl-10 h-14 bg-black border-white/10 text-xl font-bold font-mono" 
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button onClick={handlePixIntent} className="w-full h-14 bg-primary text-black font-bold text-lg hover:bg-primary/90">
                      Gerar PIX
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Informative Side */}
              <div className="space-y-6 flex flex-col justify-center">
                <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-[2rem] border border-white/10 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <HeartHandshake className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-2xl font-serif italic font-black">Princípios da Graça</h3>
                    <p className="text-white/60 leading-relaxed">
                      "Cada um contribua segundo propôs no seu coração; não com tristeza, nem por constrangimento; porque Deus ama ao que dá com alegria." <br/><br/>
                      — 2 Coríntios 9:7
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <CreditCard className="w-6 h-6 text-white/40 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Transparência Financeira</h4>
                    <p className="text-xs text-white/60">Todos os recursos são direcionados ao avanço da igreja e das missões. O balanço está sempre disponível na Secretaria.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'missions' && (
            <div className="space-y-8">
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={() => {
                    setEditingCampaign(EMPTY_CAMPAIGN);
                    setShowCampaignForm(true);
                  }} className="bg-primary text-black font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Nova Campanha
                  </Button>
                </div>
              )}

              {campaigns.length === 0 ? (
                <div className="text-center p-12 bg-zinc-900 border border-white/10 rounded-[2.5rem]">
                  <h3 className="text-xl font-bold">Nenhuma campanha ativa</h3>
                  <p className="text-white/60 mt-2">Novos projetos missionários aparecerão aqui.</p>
                </div>
              ) : (
                campaigns.map((campaign, idx) => {
                  const progress = campaign.target > 0 ? (campaign.current / campaign.target) * 100 : 0;
                  return (
                    <div key={campaign.id || idx} className="space-y-8 pb-12 border-b border-white/10 last:border-0">
                      <div className="relative h-[300px] rounded-[2.5rem] overflow-hidden flex items-end p-8 border border-white/10">
                        <div className="absolute inset-0">
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                          <img src={campaign.imageUrl || "https://images.unsplash.com/photo-1542810634-71277d95dc8c?q=80&w=1200&auto=format&fit=crop"} alt={campaign.title} className="w-full h-full object-cover grayscale" />
                        </div>
                        <div className="relative z-20 w-full max-w-3xl space-y-4">
                          <Badge className="bg-primary/20 text-primary border-none px-3 py-1 uppercase tracking-widest text-[10px]">Missões Transculturais</Badge>
                          <h2 className="text-4xl md:text-5xl font-black tracking-tight font-serif italic text-white">
                            {campaign.title}
                          </h2>
                          <p className="text-lg text-white/80 max-w-xl">
                            {campaign.description}
                          </p>
                          {isAdmin && (
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" variant="outline" className="border-white/10 bg-black/40" onClick={() => { setEditingCampaign(campaign); setShowCampaignForm(true); }}>
                                <Edit3 className="w-4 h-4 mr-2" /> Editar Campanha
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 bg-black/40 hover:bg-red-500 hover:text-white" onClick={() => handleDeleteCampaign(campaign.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                          <Card className="bg-zinc-900 border-white/10">
                            <CardHeader>
                              <CardTitle>Meta da Campanha</CardTitle>
                              <CardDescription>Acompanhe a arrecadação deste projeto.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm font-bold">
                                  <span className="text-primary">R$ {(campaign.current || 0).toLocaleString('pt-BR')} arrecadados</span>
                                  <span className="text-white/60">Meta: R$ {(campaign.target || 0).toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="h-4 bg-black rounded-full overflow-hidden border border-white/5">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-primary relative overflow-hidden"
                                  >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                  </motion.div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-white/40" />
                                  <span className="text-sm">{campaign.donors || 0} Pessoas doaram</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-white/40" />
                                  <span className="text-sm">{campaign.deadline ? `Encerra em ${new Date(campaign.deadline).toLocaleDateString('pt-BR')}` : 'Sem prazo cadastrado'}</span>
                                </div>
                              </div>
                              <Button onClick={() => { setActiveTab('tithes'); setDonateType(campaign.title); setSelectedCampaignId(campaign.id); }} className="w-full bg-primary text-black font-bold h-12">
                                Somar à Campanha
                              </Button>
                            </CardContent>
                          </Card>

                          {campaign.impactReports && campaign.impactReports.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="text-xl font-bold">Transparência em Ação</h3>
                              <div className="space-y-4">
                                {campaign.impactReports.map((report: any, idxR: number) => (
                                  <div key={idxR} className="flex flex-col md:flex-row gap-4 bg-zinc-900 p-4 rounded-2xl border border-white/10">
                                    <img src={report.image} alt="Impact" className="w-full md:w-48 h-32 object-cover rounded-xl grayscale hover:grayscale-0 transition-all" />
                                    <div className="space-y-2">
                                      <Badge variant="outline" className="text-[10px] text-white/40">{report.date}</Badge>
                                      <p className="font-medium text-white/80">{report.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <Card className="bg-zinc-900 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-lg">Como Envolver-se</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0"><DollarSign className="w-4 h-4"/></div>
                        <div>
                          <p className="font-bold text-sm">Contribuição Ouro</p>
                          <p className="text-xs text-white/60">Ajuda financeira mensal via Pix/Cartão.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4"/></div>
                        <div>
                          <p className="font-bold text-sm">Viagem Missionária</p>
                          <p className="text-xs text-white/60">Inscreva-se para a próxima caravana de Janeiro.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"><Heart className="w-4 h-4"/></div>
                        <div>
                          <p className="font-bold text-sm">Adoção de Criança</p>
                          <p className="text-xs text-white/60">Apadrinhe parte da educação infantil no sertão.</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-4 border-white/10 hover:bg-white/5">Falar com a Equipe</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
              </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader>
                <CardTitle>Histórico de Contribuições</CardTitle>
                <CardDescription>Seus registros de dízimos e ofertas emitidos com a sua conta.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold max-w-xs truncate">{item.type}</p>
                          <p className="text-xs text-white/40">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className={`text-[10px] uppercase tracking-widest ${item.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {item.status === 'completed' ? 'Confirmado' : 'Pendente'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center p-8 text-white/40 border border-dashed border-white/10 rounded-xl">
                      Nenhum histórico encontrado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* PIX Modal */}
      <AnimatePresence>
        {showPix && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl max-w-md w-full overflow-hidden p-8 text-center space-y-6"
            >
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold font-serif italic text-white">Contribuição via PIX</h3>
              <p className="text-white/60">
                Valor: <span className="font-bold text-primary text-xl">R$ {Number(donateAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              
              <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center">
                <ReactQrCode value={`00020101021226850014br.gov.bcb.pix2563pix.coroado.org/contrib?amount=${donateAmount}&type=${donateType}`} size={160} />
              </div>
              
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-white/40 uppercase">Código PIX Copie e Cole</label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={`00020101021226850014br.gov.bcb.pix2563pix.coroado.org/contrib?amount=${donateAmount}&type=${donateType}`} 
                    className="bg-black border-white/10 text-xs text-white/60"
                  />
                  <Button size="icon" variant="outline" className="border-white/10 shrink-0 hover:bg-white/5" onClick={() => {
                    navigator.clipboard.writeText(`00020101021226850014br.gov.bcb.pix2563pix.coroado.org/contrib?amount=${donateAmount}&type=${donateType}`);
                    alert("Código PIX copiado com sucesso!");
                  }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-white/60">
                Escaneie o QR Code acima no aplicativo do seu banco. Depois registre a intencao para que o financeiro concilie o pagamento real.
              </div>

              <div className="space-y-3 pt-4">
                <Button onClick={registerPendingPayment} className="w-full bg-primary text-black font-bold h-12">
                  Registrar Como Pendente
                </Button>
                <Button variant="ghost" onClick={() => setShowPix(false)} className="w-full text-white/40 hover:text-white">
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Campaign Form Modal */}
      <AnimatePresence>
        {showCampaignForm && editingCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold mb-6">{editingCampaign.id ? 'Editar Campanha' : 'Nova Campanha'}</h3>
              <form onSubmit={handleSaveCampaign} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Título da Campanha</label>
                  <Input required value={editingCampaign.title} onChange={e => setEditingCampaign({ ...editingCampaign, title: e.target.value })} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Descrição</label>
                  <textarea required value={editingCampaign.description} onChange={e => setEditingCampaign({ ...editingCampaign, description: e.target.value })} className="w-full bg-black border border-white/10 rounded-md p-3 text-sm min-h-[80px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60">Meta (R$)</label>
                    <Input type="number" required value={editingCampaign.target} onChange={e => setEditingCampaign({ ...editingCampaign, target: Number(e.target.value) })} className="bg-black border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60">Arrecadado até o momento (R$)</label>
                    <Input type="number" value={editingCampaign.current} onChange={e => setEditingCampaign({ ...editingCampaign, current: Number(e.target.value) })} className="bg-black border-white/10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Data de Encerramento</label>
                  <Input type="date" value={editingCampaign.deadline} onChange={e => setEditingCampaign({ ...editingCampaign, deadline: e.target.value })} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Foto de Capa</label>
                  <ImageUpload
                    value={editingCampaign.imageUrl || ''}
                    onChange={url => setEditingCampaign({ ...editingCampaign, imageUrl: url })}
                    folder="images/campanhas"
                  />
                </div>
                
                <div className="pt-6 flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => { setShowCampaignForm(false); setEditingCampaign(null); }} className="flex-1 text-white/40 hover:text-white">Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-primary text-black font-bold">Salvar Campanha</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


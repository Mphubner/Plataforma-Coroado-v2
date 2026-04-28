import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Mail, Phone, MapPin, Users, User, Heart, ShieldAlert } from "lucide-react";

import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

type AuthState = 'login' | 'onboarding' | 'pending';

interface AuthViewProps {
  onLoginComplete: () => void;
}

export function AuthView({ onLoginComplete }: AuthViewProps) {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthdate: '',
    relationship: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    roles: [] as string[],
    cellName: '',
    ministryName: '',
    selectedLeader: ''
  });

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isApproved) {
          onLoginComplete();
        } else {
          setAuthState('pending');
        }
      } else {
        setFormData(prev => ({
          ...prev,
          name: user.displayName || '',
          email: user.email || ''
        }));
        setAuthState('onboarding');
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: `${data.localidade} - ${data.uf}`
        }));
      }
    } catch (e) {
      console.error("ViaCEP error", e);
    }
  };

  const submitOnboarding = async () => {
    if (!auth.currentUser) return;
    try {
      setLoading(true);
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        email: auth.currentUser.email || '',
        name: formData.name,
        phone: formData.phone,
        birthdate: formData.birthdate,
        roles: formData.roles,
        details: {
          relationship: formData.relationship,
          address: {
            cep: formData.cep,
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
          },
          leadership: {
            cellName: formData.cellName,
            ministryName: formData.ministryName,
            selectedLeader: formData.selectedLeader
          }
        },
        tenantId: 'default', // Multi-tenancy starts here
        isApproved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setAuthState('pending');
    } catch (error) {
      console.error("Signup failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authState === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <Card className="w-full max-w-md bg-zinc-900 border-white/10 text-center py-12">
          <CardContent className="space-y-6">
            <div className="w-20 h-20 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white">Cadastro em Análise!</h2>
            <p className="text-white/60">
              Seu perfil foi enviado e está aguardando aprovação do líder responsável selecionado.
              Assim que for aprovado, você terá acesso total à plataforma.
            </p>
            <Button 
              className="w-full bg-white/10 text-white mt-8" 
              onClick={async () => {
                if (auth.currentUser) {
                  try {
                    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                      isApproved: true,
                      updatedAt: serverTimestamp()
                    });
                    onLoginComplete();
                  } catch (e) {
                    console.error("Error bypassing approval", e);
                  }
                }
              }}
            >
              [Ambiente DEV: Forçar Aprovação]
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authState === 'onboarding') {
    return (
      <div className="min-h-screen flex items-start justify-center p-4 py-12 bg-black overflow-y-auto">
        <Card className="w-full max-w-2xl bg-zinc-900 border-white/10 overflow-hidden">
          <div className="h-2 w-full bg-black">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
          
          <CardHeader>
            <CardTitle className="text-2xl font-black uppercase">Completar Perfil</CardTitle>
            <CardDescription>Precisamos de mais alguns dados para direcionar sua aprovação.</CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center gap-2 text-primary font-bold mb-4 border-b border-white/10 pb-2"><User className="w-5 h-5"/> Dados Pessoais</div>
                  <div className="space-y-4">
                    <div className="space-y-2"><label className="text-xs font-bold text-white/40 uppercase">Nome Completo</label><Input className="bg-black border-white/10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-xs font-bold text-white/40 uppercase">Data de Nascimento</label><Input type="date" className="bg-black border-white/10" value={formData.birthdate} onChange={e => setFormData({...formData, birthdate: e.target.value})} /></div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase">Estado Civil</label>
                        <select className="w-full h-10 bg-black border border-white/10 rounded-md px-3 text-white" value={formData.relationship} onChange={e => setFormData({...formData, relationship: e.target.value})}>
                          <option value="">Selecione...</option><option value="solteiro">Solteiro(a)</option><option value="casado">Casado(a)</option><option value="divorciado">Divorciado(a)</option><option value="viuvo">Viúvo(a)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2"><label className="text-xs font-bold text-white/40 uppercase">Telefone / WhatsApp</label><Input className="bg-black border-white/10" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(99) 99999-9999" /></div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center gap-2 text-primary font-bold mb-4 border-b border-white/10 pb-2"><MapPin className="w-5 h-5"/> Endereço Completo</div>
                  <div className="space-y-4">
                    <div className="space-y-2"><label className="text-xs font-bold text-white/40 uppercase">CEP</label><Input className="bg-black border-white/10 max-w-[200px]" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} onBlur={handleCepBlur} /></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2"><label className="text-xs font-bold text-white/40 uppercase">Rua / Logradouro</label><Input className="bg-black border-white/10" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-white/40 uppercase">Número</label><Input className="bg-black border-white/10" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-xs font-bold text-white/40 uppercase">Bairro</label><Input className="bg-black border-white/10" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-white/40 uppercase">Cidade - Estado</label><Input className="bg-black border-white/10" placeholder="Ex: Vitória - ES" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center gap-2 text-primary font-bold mb-4 border-b border-white/10 pb-2"><Heart className="w-5 h-5"/> Relacionamento com a Igreja</div>
                  
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-white/40 uppercase">O que você é hoje? (Selecione todos que se aplicam)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {['Membro', 'Líder de Célula', 'Supervisor de Células', 'Líder de Ministério', 'Pastor da Sede', 'Pastor Auxiliar'].map(role => (
                        <div 
                          key={role} 
                          onClick={() => handleRoleToggle(role)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${formData.roles.includes(role) ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-black text-white/60 hover:bg-white/5'}`}
                        >
                          <span className="font-medium text-sm">{role}</span>
                          {formData.roles.includes(role) && <CheckCircle2 className="w-5 h-5" />}
                        </div>
                      ))}
                    </div>

                    {(formData.roles.includes('Membro') || formData.roles.includes('Líder de Célula')) && (
                      <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        <label className="text-xs font-bold text-white/40 uppercase">Qual o nome da sua Célula?</label>
                        <select className="w-full h-10 bg-black border border-white/10 rounded-md px-3 text-white">
                          <option>Selecione a Célula...</option>
                          <option>Célula Esperança</option>
                          <option>Célula Vida</option>
                          <option>Célula Graça</option>
                        </select>
                      </div>
                    )}

                    {formData.roles.includes('Líder de Ministério') && (
                      <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        <label className="text-xs font-bold text-white/40 uppercase">Qual o nome do seu Ministério?</label>
                        <select className="w-full h-10 bg-black border border-white/10 rounded-md px-3 text-white">
                          <option>Selecione o Ministério...</option>
                          <option>Louvor e Adoração</option>
                          <option>Kids</option>
                          <option>Comunicação e Mídia</option>
                        </select>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center gap-2 text-primary font-bold mb-4 border-b border-white/10 pb-2"><ShieldAlert className="w-5 h-5"/> Roteamento de Aprovação</div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                    <p className="text-sm text-yellow-500 leading-relaxed mb-4">
                      Com base nas suas seleções, seu cadastro precisa ser validado por um líder direto. 
                      Selecione quem avaliará sua entrada na plataforma.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-yellow-500/70 uppercase">Quem é seu Líder Responsável?</label>
                        <select className="w-full h-12 bg-black border border-yellow-500/30 rounded-xl px-3 text-white focus:ring-yellow-500">
                          <option value="">Selecione o Líder / Pastor / Supervisor...</option>
                          {formData.roles.includes('Líder de Ministério') && <optgroup label="Pastores Sênior">
                            <option>Pr. Marcos Pereira</option>
                            <option>Pra. Ana Vitória</option>
                          </optgroup>}
                          {formData.roles.includes('Líder de Célula') && <optgroup label="Supervisores">
                            <option>João P. (Supervisor Bloco Norte)</option>
                            <option>Marta L. (Supervisora Bloco Sul)</option>
                          </optgroup>}
                          {formData.roles.includes('Membro') && <optgroup label="Líderes de Célula">
                            <option>Líder - Célula Esperança</option>
                            <option>Líder - Célula Vida</option>
                          </optgroup>}
                          <optgroup label="Não encontrei">
                            <option value="admin">Encaminhar para Administração Central</option>
                          </optgroup>
                        </select>
                      </div>

                      {formData.roles.includes('Membro') && formData.roles.includes('Líder de Ministério') && (
                        <p className="text-xs text-white/50 bg-black/50 p-3 rounded-lg border border-white/5 mt-2">
                          💡 Identificamos que você participa de uma célula e de um ministério. Seu cadastro será encaminhado para as duas aprovações. O primeiro que aprovar liberará seu acesso.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex justify-between bg-black/20 pt-6 mt-6 border-t border-white/5">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>Voltar</Button>
            ) : <div/>}

            {step < 4 ? (
              <Button className="bg-primary text-black" onClick={() => setStep(step + 1)}>Continuar <ChevronRight className="w-4 h-4 ml-2"/></Button>
            ) : (
              <Button className="bg-primary text-black" onClick={submitOnboarding}>Enviar para Aprovação <CheckCircle2 className="w-4 h-4 ml-2"/></Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black relative">
      <div className="absolute inset-0 bg-zinc-900/50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black" />
      
      <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border-white/10 relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="flex items-center justify-center mx-auto mb-2">
            <img src="/logomarcab.png" alt="Coroado" className="h-10 w-auto object-contain text-white drop-shadow-[0_0_15px_rgba(201,146,42,0.4)]" />
          </div>
          <CardDescription className="text-white/60">Acesse a plataforma da sua igreja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full h-12 bg-white text-black hover:bg-white/90 font-medium text-base flex items-center gap-3 relative"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 absolute left-4">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="flex-1 text-center font-bold">
              {loading ? "Aguarde..." : "Continuar com o Google"}
            </span>
          </Button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-white/40">Ou acesse com email</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase">E-mail</label>
              <Input type="email" placeholder="seu@email.com" className="bg-black/50 border-white/10 h-12" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase">Senha</label>
              <Input type="password" placeholder="••••••••" className="bg-black/50 border-white/10 h-12" />
            </div>
            <Button className="w-full h-12 bg-primary text-black font-bold uppercase tracking-wider text-sm hover:bg-primary/90">
              Entrar ou Criar Conta
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <p className="absolute bottom-8 left-0 right-0 text-center text-xs text-white/40 max-w-sm mx-auto">
        Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
      </p>
    </div>
  );
}

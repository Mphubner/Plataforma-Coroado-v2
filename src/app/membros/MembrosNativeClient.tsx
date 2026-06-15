'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Search, Users, Heart, Shield, Edit2, X, Check, MapPin, Network, List, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { auth, db } from "../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'motion/react';
import { trpc } from "../../lib/trpc-client";
import { pagePreset } from "../../lib/motion/presets";
import { onAuthStateChanged } from 'firebase/auth';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isApproved: boolean;
  cellId?: string;
  ministryId?: string;
  tenantId?: string;
  supervisorId?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  birthdate?: string;
  maritalStatus?: string;
  profession?: string;
  socialMedia?: string;
  avatarUrl?: string;
};

export function MembrosNativeClient() {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [cellsMap, setCellsMap] = useState<Record<string, string>>({});
  const [ministriesMap, setMinistriesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedOut, setIsSignedOut] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || ""
  });

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch maps from Firestore locally (for non-sensitive metadata)
      const user = auth.currentUser;
      if (!user) return;
      
      const tokenResult = await user.getIdTokenResult();
      const tenantId = tokenResult.claims.tenantId as string;
      if (!tenantId) return;

      const qC = query(collection(db, 'cells'), where('tenantId', '==', tenantId));
      const snapC = await getDocs(qC);
      const cMap: Record<string, string> = {};
      snapC.docs.forEach(d => cMap[d.id] = d.data().name);
      setCellsMap(cMap);

      const qM = query(collection(db, 'ministries'), where('tenantId', '==', tenantId));
      const snapM = await getDocs(qM);
      const mMap: Record<string, string> = {};
      snapM.docs.forEach(d => mMap[d.id] = d.data().name);
      setMinistriesMap(mMap);

      // 2. Fetch members via tRPC 
      const fetchedMembers = await trpc.members.list.query();
      setMembers(fetchedMembers as UserProfile[]);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsSignedOut(false);
        loadData();
      } else {
        setIsSignedOut(true);
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, [loadData]);


  const handleQuickApprove = async (memberId: string) => {
    try {
      await trpc.members.updateAccess.mutate({ targetUid: memberId, isApproved: true });
      alert("Membro aprovado com sucesso!");
      loadData();
    } catch (e) {
      console.error(e);
      alert("Erro ao aprovar membro: " + (e as Error).message);
    }
  };

  const filteredMembers = members.filter(m =>
    (filterPending ? m.isApproved === false : true) &&
    (m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.roles?.join(',').toLowerCase().includes(search.toLowerCase()) ||
      m.cellId?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    try {
      const originalMember = members.find(member => member.id === editingMember.id);
      const rolesChanged = JSON.stringify(originalMember?.roles || []) !== JSON.stringify(editingMember.roles || []);

      // Atualiza perfil pelo tRPC
      await trpc.members.updateProfile.mutate({
        id: editingMember.id,
        data: {
          cellId: editingMember.cellId || "",
          ministryId: editingMember.ministryId || "",
          supervisorId: editingMember.supervisorId || "",
          address: editingMember.address || "",
          lat: Number(editingMember.lat) || 0,
          lng: Number(editingMember.lng) || 0,
          phone: editingMember.phone || "",
          birthdate: editingMember.birthdate || "",
          maritalStatus: editingMember.maritalStatus || "",
          profession: editingMember.profession || "",
          socialMedia: editingMember.socialMedia || "",
          avatarUrl: editingMember.avatarUrl || "",
        }
      });

      // Atualiza roles e isApproved
      let backendError = false;
      try {
        let shouldCall = false;
        const payload: any = { targetUid: editingMember.id };

        if (rolesChanged) {
          payload.roles = editingMember.roles || ["member"];
          shouldCall = true;
        }

        if (originalMember && originalMember.isApproved !== editingMember.isApproved) {
          if (!editingMember.isApproved) {
            throw new Error("Revogar acesso ainda nao esta liberado pela interface. Ajuste isso no backend/admin.");
          }
          payload.isApproved = true;
          shouldCall = true;
        }

        if (shouldCall) {
          await trpc.members.updateAccess.mutate(payload);
        }
      } catch (err) {
        console.error("Erro na API Admin (Backend):", err);
        backendError = true;
        alert("Dados básicos salvos, porém houve falha ao atualizar permissões de acesso (claims). O servidor backend pode estar indisponível.");
      }

      if (!backendError) {
        alert("Membro atualizado com sucesso!");
        loadData();
      }

      setEditingMember(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar dados: " + (e as Error).message);
    }
  };

  const toggleRole = (role: string) => {
    if (!editingMember) return;
    const currentRoles = editingMember.roles || [];
    const newRoles = currentRoles.includes(role) ? currentRoles.filter(r => r !== role) : [...currentRoles, role];
    setEditingMember({ ...editingMember, roles: newRoles });
  };

  const handleExportCSV = () => {
    const headers = ["Nome", "Email", "Telefone", "Data Nascimento", "Estado Civil", "Profissao", "Redes Sociais", "Celula", "Ministerio", "Aprovado", "Cargos"];
    const rows = filteredMembers.map(m => [
      m.name || "",
      m.email || "",
      m.phone || "",
      m.birthdate || "",
      m.maritalStatus || "",
      m.profession || "",
      m.socialMedia || "",
      m.cellId || "",
      m.ministryId || "",
      m.isApproved ? "Sim" : "Nao",
      m.roles?.join("; ") || ""
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `membros_coroado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalMembers = members.length;
  const volunteers = members.filter(m => m.roles?.includes('member')).length;
  const leaders = members.filter(m => m.roles?.some(role => ['cellLeader', 'ministryLeader', 'supervisor', 'networkPastor', 'auxPastor', 'seniorPastor', 'admin', 'leader', 'pastor'].includes(role))).length;

  const renderTree = (parentId?: string, level = 0) => {
    const children = members.filter(m => {
      if (!parentId) return !m.supervisorId && m.roles?.some(role => ['seniorPastor', 'networkPastor', 'pastor', 'admin'].includes(role)); // Root nodes
      return m.supervisorId === parentId;
    });

    if (children.length === 0) return null;

    return (
      <div className={`pl-${level === 0 ? '0' : '6'} border-l border-white/10 ml-${level === 0 ? '0' : '3'} space-y-2 mt-2`}>
        {children.map(child => (
          <div key={child.id} className="relative">
            <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-white/5 rounded-lg hover:border-white/20 transition-colors w-fit pr-8 cursor-pointer" onClick={() => setEditingMember(child)}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{child.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold">{child.name} {child.roles?.includes('leader') && <Shield className="w-3 h-3 inline text-primary" />}</p>
                <p className="text-xs text-white/40">{child.roles?.join(', ')} {child.cellId ? ` - Célula: ${cellsMap[child.cellId] || child.cellId}` : ''}</p>
              </div>
            </div>
            {renderTree(child.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  if (isSignedOut) {
    return <div className="p-8 text-center text-white/60">Faça login para gerenciar membros.</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-8 pb-20 animate-pulse">
        <div className="h-10 bg-white/10 w-48 rounded mb-2"></div>
        <div className="h-6 bg-white/10 w-96 rounded"></div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="h-24 bg-white/10 rounded-xl"></div>
          <div className="h-24 bg-white/10 rounded-xl"></div>
          <div className="h-24 bg-white/10 rounded-xl"></div>
        </div>
        <div className="h-64 bg-white/10 rounded-xl w-full"></div>
      </div>
    );
  }

  return (
    <motion.div {...pagePreset} className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Membros</h1>
          <p className="text-white/60">Gestão global de membros, hierarquia e mapa demográfico.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-[#1a73e8]/10 text-[#1a73e8] border-none hover:bg-[#1a73e8]/20" onClick={() => window.open('https://contacts.google.com/', '_blank')}>
            Google Contacts
          </Button>
          <Button variant="outline" className="bg-[#ea4335]/10 text-[#ea4335] border-none hover:bg-[#ea4335]/20" onClick={() => window.open('https://mail.google.com/', '_blank')}>
            Gmail
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-white/40 font-bold">Total Membros</p>
              <p className="text-3xl font-bold text-primary mt-1">{totalMembers}</p>
            </div>
            <Users className="h-8 w-8 text-white/10" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-white/40 font-bold">Servos</p>
              <p className="text-3xl font-bold text-secondary mt-1">{volunteers}</p>
            </div>
            <Heart className="h-8 w-8 text-white/10" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-white/40 font-bold">Líderes</p>
              <p className="text-3xl font-bold text-primary mt-1">{leaders}</p>
            </div>
            <Shield className="h-8 w-8 text-white/10" />
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <Card className="bg-zinc-900 border-primary/50 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 w-full h-1 bg-primary left-0" />
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Editando: {editingMember.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setEditingMember(null)}><X className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6 mb-4">
                    <Avatar className="h-20 w-20 border-2 border-primary/50">
                      <AvatarImage src={editingMember.avatarUrl} />
                      <AvatarFallback className="bg-primary/20 text-primary text-2xl">{editingMember.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-lg transition-colors font-bold">
                        Alterar Foto
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) { alert("A imagem não pode ter mais de 1MB."); return; }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditingMember({ ...editingMember, avatarUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Email</label>
                      <Input value={editingMember.email} disabled className="bg-black/50 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Telefone</label>
                      <Input value={editingMember.phone || ""} onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })} className="bg-black border-white/10" placeholder="(27) 99999-9999" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Data Nascimento</label>
                      <Input type="date" value={editingMember.birthdate || ""} onChange={e => setEditingMember({ ...editingMember, birthdate: e.target.value })} className="bg-black border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Estado Civil</label>
                      <Input value={editingMember.maritalStatus || ""} onChange={e => setEditingMember({ ...editingMember, maritalStatus: e.target.value })} className="bg-black border-white/10" placeholder="Solteiro(a), Casado(a)" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Profissão</label>
                      <Input value={editingMember.profession || ""} onChange={e => setEditingMember({ ...editingMember, profession: e.target.value })} className="bg-black border-white/10" placeholder="Ex: Analista de Sistemas" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Redes Sociais</label>
                      <Input value={editingMember.socialMedia || ""} onChange={e => setEditingMember({ ...editingMember, socialMedia: e.target.value })} className="bg-black border-white/10" placeholder="@usuario" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Lider da Celula ID</label>
                      <select
                        value={editingMember.cellId || ""}
                        onChange={e => setEditingMember({ ...editingMember, cellId: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white"
                      >
                        <option value="">Nenhuma / Não Vinculado</option>
                        {Object.entries(cellsMap).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Ministério ID</label>
                      <Input
                        value={editingMember.ministryId || ""}
                        onChange={e => setEditingMember({ ...editingMember, ministryId: e.target.value })}
                        className="bg-black border-white/10" placeholder="Ex: ID do Ministério"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Supervisor ID (Hierarquia)</label>
                      <Input
                        value={editingMember.supervisorId || ""}
                        onChange={e => setEditingMember({ ...editingMember, supervisorId: e.target.value })}
                        className="bg-black border-white/10" placeholder="Ex: ID do supervisor/pastor"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60">Endereço</label>
                      <div className="flex gap-2">
                        <Input
                          value={editingMember.address || ""}
                          onChange={e => setEditingMember({ ...editingMember, address: e.target.value })}
                          className="bg-black border-white/10" placeholder="Rua, Numero - Bairro - Cidade"
                        />
                        <Button variant="outline" type="button" className="border-white/10" onClick={() => {
                          if (!editingMember.address) return;
                          if (!window.google || !window.google.maps) {
                            alert("Google Maps não está carregado.");
                            return;
                          }
                          const geocoder = new window.google.maps.Geocoder();
                          geocoder.geocode({ address: editingMember.address }, (results, status) => {
                              if (status === 'OK' && results && results[0]) {
                                  const loc = results[0].geometry.location;
                                  setEditingMember(prev => ({ ...prev!, lat: loc.lat(), lng: loc.lng() }));
                                  alert("Coordenadas atualizadas com sucesso!");
                              } else {
                                  alert("Não foi possível encontrar as coordenadas para este endereço.");
                              }
                          });
                        }}>
                          Gerar Lat/Lng
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-white/60">Lat</label>
                        <Input type="number" step="any" value={editingMember.lat || ""} onChange={e => setEditingMember({ ...editingMember, lat: parseFloat(e.target.value) })} className="bg-black border-white/10" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-white/60">Lng</label>
                        <Input type="number" step="any" value={editingMember.lng || ""} onChange={e => setEditingMember({ ...editingMember, lng: parseFloat(e.target.value) })} className="bg-black border-white/10" />
                      </div>
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" id="approved" checked={editingMember.isApproved}
                          onChange={e => setEditingMember({ ...editingMember, isApproved: e.target.checked })}
                        />
                        <label htmlFor="approved" className="text-sm">Acesso Aprovado</label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <label className="text-xs font-bold text-white/60">Cargos / Perfis de Acesso</label>
                    <div className="flex flex-wrap gap-2">
                      {['member', 'cellLeader', 'ministryLeader', 'supervisor', 'networkPastor', 'auxPastor', 'seniorPastor', 'admin'].map(role => (
                        <Badge
                          key={role}
                          variant={editingMember.roles?.includes(role) ? "default" : "outline"}
                          className={`cursor-pointer ${editingMember.roles?.includes(role) ? 'bg-primary text-black' : 'border-white/20'}`}
                          onClick={() => toggleRole(role)}
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleUpdateMember} className="bg-primary text-black"><Check className="mr-2 h-4 w-4" /> Salvar Alterações</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Dados dos Membros</CardTitle>
            <CardDescription>Cadastros, hierarquia e mapa.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-center justify-between">
              <TabsList className="bg-black">
                <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-black"><List className="w-4 h-4 mr-2" /> Lista</TabsTrigger>
                <TabsTrigger value="tree" className="data-[state=active]:bg-primary data-[state=active]:text-black"><Network className="w-4 h-4 mr-2" /> Árvore Hierárquica</TabsTrigger>
                <TabsTrigger value="map" className="data-[state=active]:bg-primary data-[state=active]:text-black"><MapPin className="w-4 h-4 mr-2" /> Google Maps</TabsTrigger>
              </TabsList>

              <div className="relative flex-1 md:max-w-md flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Buscar (nome, celula, etc)..."
                    className="pl-10 bg-black border-white/10"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  variant={filterPending ? "default" : "outline"}
                  className={filterPending ? "bg-red-500 hover:bg-red-600 text-white border-0" : "border-white/10 text-white/60"}
                  onClick={() => setFilterPending(!filterPending)}
                >
                  Pendentes
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                  onClick={handleExportCSV}
                >
                  <Download className="w-4 h-4 mr-2" /> Exportar
                </Button>
              </div>
            </div>

            <TabsContent value="list" className="m-0">
              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredMembers.map(m => (
                  <div key={m.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-4" onClick={() => setEditingMember(m)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={m.avatarUrl} />
                          <AvatarFallback className="bg-primary/20 text-primary">{m.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-white leading-tight">{m.name}</p>
                          <p className="text-xs text-white/40">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!m.isApproved && (
                          <Button variant="outline" size="icon" className="border-green-500/50 text-green-500 hover:bg-green-500/20" onClick={(e) => { e.stopPropagation(); handleQuickApprove(m.id); }} title="Aprovar Membro">
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingMember(m); }}>
                          <Edit2 className="h-4 w-4 text-white/40" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-white/5 pt-3">
                      <div>
                        <p className="text-xs text-white/40 mb-1">Status</p>
                        {m.isApproved ? (
                          <Badge className="bg-green-500/20 text-green-500 text-[10px] hover:bg-green-500/20">Aprovado</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">Pendente</Badge>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">Célula</p>
                        <p className="text-white/80">{cellsMap[m.cellId || ''] || m.cellId || '-'}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-white/40 mb-1">Cargos</p>
                      <div className="flex flex-wrap gap-1">
                        {m.roles?.map(r => (
                          <Badge key={r} variant="outline" className="text-[10px] border-white/10 py-0">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredMembers.length === 0 && (
                  <div className="text-center py-8 text-white/40 bg-zinc-900 rounded-xl border border-white/10">
                    Nenhum membro encontrado.
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="border-white/10">
                    <TableRow className="hover:bg-transparent border-white/10">
                      <TableHead className="text-white/40">Nome</TableHead>
                      <TableHead className="text-white/40">Cargo</TableHead>
                      <TableHead className="text-white/40">Célula</TableHead>
                      <TableHead className="text-white/40">Status</TableHead>
                      <TableHead className="text-right text-white/40">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map(m => (
                      <TableRow key={m.id} className="border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setEditingMember(m)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m.avatarUrl} />
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">{m.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-white">{m.name}</p>
                              <p className="text-xs text-white/40">{m.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {m.roles?.map(r => (
                              <Badge key={r} variant="outline" className="text-[10px] border-white/10 py-0">{r}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/60">{cellsMap[m.cellId || ''] || m.cellId || '-'}</TableCell>
                        <TableCell>
                          {m.isApproved ? (
                            <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20">Aprovado</Badge>
                          ) : (
                            <Badge variant="destructive">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!m.isApproved && (
                              <Button variant="outline" size="icon" className="border-green-500/50 text-green-500 hover:bg-green-500/20" onClick={(e) => { e.stopPropagation(); handleQuickApprove(m.id); }} title="Aprovar Membro">
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingMember(m); }}>
                              <Edit2 className="h-4 w-4 text-white/40" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-white/40">
                          Nenhum membro encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="tree" className="m-0 p-4 border border-white/10 rounded-lg bg-black overflow-x-auto min-h-[300px]">
              {members.filter(m => !m.supervisorId && m.roles?.some(role => ['seniorPastor', 'networkPastor', 'pastor', 'admin'].includes(role))).length > 0 ? (
                renderTree()
              ) : (
                <p className="text-white/40 text-center py-8">Nenhuma liderança de topo (Pastor sem supervisor) encontrada para iniciar a árvore. Selecione alguém para ser o topo e deixe seu campo Supervisor ID em branco.</p>
              )}
            </TabsContent>

            <TabsContent value="map" className="m-0">
              <div className="h-[500px] w-full rounded-lg overflow-hidden border border-white/10 relative z-0">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: -20.3155, lng: -40.3128 }} // Vitoria ES coord default
                    zoom={11}
                    options={{
                      styles: [
                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                        {
                          featureType: "water",
                          elementType: "geometry",
                          stylers: [{ color: "#17263c" }]
                        }
                      ],
                      disableDefaultUI: false
                    }}
                  >
                    {filteredMembers.filter(m => m.lat && m.lng).map(m => (
                      <Marker
                        key={m.id}
                        position={{ lat: m.lat!, lng: m.lng! }}
                        title={`${m.name} - ${m.address}`}
                      />
                    ))}
                  </GoogleMap>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    Carregando Google Maps...
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-zinc-950/90 backdrop-blur border border-white/10 px-4 py-2 rounded-lg text-xs pointer-events-none z-10">
                  Mostrando {filteredMembers.filter(m => m.lat && m.lng).length} membros com coordenada.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

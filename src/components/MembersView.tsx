import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, Heart, Shield, Edit2, X, Check, MapPin, Network, List, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { can } from "@/src/lib/permissions";

// Fix for default leaflet icons not showing in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

export function MembersView({ userData }: { userData?: any }) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  const callAdminApi = async (url: string, options: RequestInit = {}) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sessao expirada. Entre novamente.");

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Acao administrativa recusada.");
    }

    return data;
  };

  useEffect(() => {
    if (!userData?.tenantId) return;
    const q = query(collection(db, 'users'), where('tenantId', '==', userData.tenantId));
    const unsub = onSnapshot(q, (snap) => {
      let fetchedMembers = snap.docs.map(d => ({id: d.id, ...d.data()})) as UserProfile[];
      
      // Aplicar filtro hierárquico
      const canSeeLeadershipScope = can(userData, "manage:roles") || can(userData, "manage:approvals");
      
      if (!canSeeLeadershipScope) {
        if (can(userData, "manage:members")) {
          fetchedMembers = fetchedMembers.filter(m => 
            m.id === userData.id || 
            (userData.cellId && m.cellId === userData.cellId) ||
            m.supervisorId === userData.id
          );
        } else {
          fetchedMembers = fetchedMembers.filter(m => m.id === userData.id);
        }
      }
      
      setMembers(fetchedMembers);
    });
    return () => unsub();
  }, [userData]);

  const handleQuickApprove = async (memberId: string) => {
    try {
       await callAdminApi(`/api/admin/users/${memberId}/approve`, { method: "POST" });
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

      if (rolesChanged) {
        await callAdminApi(`/api/admin/users/${editingMember.id}/roles`, {
          method: "PATCH",
          body: JSON.stringify({ roles: editingMember.roles || ["member"] }),
        });
      }

      if (originalMember && originalMember.isApproved !== editingMember.isApproved) {
        if (!editingMember.isApproved) {
          throw new Error("Revogar acesso ainda nao esta liberado pela interface. Ajuste isso no backend/admin.");
        }

        await callAdminApi(`/api/admin/users/${editingMember.id}/approve`, { method: "POST" });
      }

      await updateDoc(doc(db, 'users', editingMember.id), {
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
        avatarUrl: editingMember.avatarUrl || ""
      });
      setEditingMember(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar membro: " + (e as Error).message);
    }
  };

  const toggleRole = (role: string) => {
    if (!editingMember) return;
    const currentRoles = editingMember.roles || [];
    const newRoles = currentRoles.includes(role) ? currentRoles.filter(r => r !== role) : [...currentRoles, role];
    setEditingMember({...editingMember, roles: newRoles});
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
                 <p className="text-xs text-white/40">{child.roles?.join(', ')} {child.cellId ? ` - Célula: ${child.cellId}` : ''}</p>
               </div>
             </div>
             {renderTree(child.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase">Membros</h1>
        <p className="text-white/60">Gestão global de membros, hierarquia e mapa demográfico.</p>
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
              <p className="text-xs uppercase text-white/40 font-bold">Voluntários</p>
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

      {editingMember && (
        <Card className="bg-zinc-900 border-primary/50 relative overflow-hidden z-20">
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
                         setEditingMember({...editingMember, avatarUrl: reader.result as string});
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
                  <Input value={editingMember.phone || ""} onChange={e => setEditingMember({...editingMember, phone: e.target.value})} className="bg-black border-white/10" placeholder="(27) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Data Nascimento</label>
                  <Input type="date" value={editingMember.birthdate || ""} onChange={e => setEditingMember({...editingMember, birthdate: e.target.value})} className="bg-black border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Estado Civil</label>
                  <Input value={editingMember.maritalStatus || ""} onChange={e => setEditingMember({...editingMember, maritalStatus: e.target.value})} className="bg-black border-white/10" placeholder="Solteiro(a), Casado(a)" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Profissão</label>
                  <Input value={editingMember.profession || ""} onChange={e => setEditingMember({...editingMember, profession: e.target.value})} className="bg-black border-white/10" placeholder="Ex: Analista de Sistemas" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Redes Sociais</label>
                  <Input value={editingMember.socialMedia || ""} onChange={e => setEditingMember({...editingMember, socialMedia: e.target.value})} className="bg-black border-white/10" placeholder="@usuario" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Líder da Célula ID</label>
                  <Input 
                    value={editingMember.cellId || ""} 
                    onChange={e => setEditingMember({...editingMember, cellId: e.target.value})} 
                    className="bg-black border-white/10" placeholder="Ex: ID da célula" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Ministério ID</label>
                  <Input 
                    value={editingMember.ministryId || ""} 
                    onChange={e => setEditingMember({...editingMember, ministryId: e.target.value})} 
                    className="bg-black border-white/10" placeholder="Ex: ID do Ministério" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Supervisor ID (Hierarquia)</label>
                  <Input 
                    value={editingMember.supervisorId || ""} 
                    onChange={e => setEditingMember({...editingMember, supervisorId: e.target.value})} 
                    className="bg-black border-white/10" placeholder="Ex: ID do supervisor/pastor" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60">Endereço</label>
                  <Input 
                    value={editingMember.address || ""} 
                    onChange={e => setEditingMember({...editingMember, address: e.target.value})} 
                    className="bg-black border-white/10" placeholder="Rua, Numero - Bairro" 
                  />
                </div>
                <div className="space-y-2 flex gap-2">
                   <div className="flex-1">
                      <label className="text-xs font-bold text-white/60">Lat</label>
                      <Input type="number" step="any" value={editingMember.lat || ""} onChange={e => setEditingMember({...editingMember, lat: parseFloat(e.target.value)})} className="bg-black border-white/10" />
                   </div>
                   <div className="flex-1">
                      <label className="text-xs font-bold text-white/60">Lng</label>
                      <Input type="number" step="any" value={editingMember.lng || ""} onChange={e => setEditingMember({...editingMember, lng: parseFloat(e.target.value)})} className="bg-black border-white/10" />
                   </div>
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                   <div className="flex items-center gap-2 mb-2">
                     <input type="checkbox" id="approved" checked={editingMember.isApproved} 
                       onChange={e => setEditingMember({...editingMember, isApproved: e.target.checked})} 
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
               <Button onClick={handleUpdateMember} className="bg-primary text-black"><Check className="mr-2 h-4 w-4"/> Salvar Alterações</Button>
             </div>
          </CardContent>
        </Card>
      )}

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
                  <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-black"><List className="w-4 h-4 mr-2"/> Lista</TabsTrigger>
                  <TabsTrigger value="tree" className="data-[state=active]:bg-primary data-[state=active]:text-black"><Network className="w-4 h-4 mr-2"/> Árvore Hierárquica</TabsTrigger>
                  <TabsTrigger value="map" className="data-[state=active]:bg-primary data-[state=active]:text-black"><MapPin className="w-4 h-4 mr-2"/> Mapa (Leaflet)</TabsTrigger>
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
                          <p className="text-white/80">{m.cellId || '-'}</p>
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
                          <TableCell className="text-white/60">{m.cellId || '-'}</TableCell>
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
                  <MapContainer center={[-23.5505, -46.6333]} zoom={11} style={{ height: '100%', width: '100%' }}>
                     <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                     {filteredMembers.filter(m => m.lat && m.lng).map(m => (
                       <Marker key={m.id} position={[m.lat!, m.lng!]}>
                         <Popup>
                           <div className="flex flex-col text-black">
                             <span className="font-bold">{m.name}</span>
                             <span className="text-xs text-gray-600">{m.address || 'Sem endereço'}</span>
                             <span className="text-xs text-blue-600 mt-1">{m.roles?.join(', ')}</span>
                             {m.cellId && <span className="text-xs font-bold mt-1">Célula: {m.cellId}</span>}
                           </div>
                         </Popup>
                       </Marker>
                     ))}
                  </MapContainer>
                  <div className="absolute top-4 right-4 bg-zinc-950/90 backdrop-blur border border-white/10 px-4 py-2 rounded-lg text-xs pointer-events-none">
                     Mostrando {filteredMembers.filter(m => m.lat && m.lng).length} membros com coordenada.
                  </div>
                </div>
             </TabsContent>
           </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

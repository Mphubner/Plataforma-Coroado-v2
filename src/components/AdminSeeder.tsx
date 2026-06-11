import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, DatabaseZap } from "lucide-react";
import { db } from "@/lib/firebase";
import { writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";

export function AdminSeeder({ userData }: { userData?: any }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const tenantId = userData?.tenantId || 'tenant-1';

  const runSeeder = async () => {
    setLoading(true);
    setProgress(0);
    setMessage('');

    try {
      // 1. Create Ministries
      const minNames = ["Kids", "Jovens", "Adolescentes", "Louvor", "Diaconato", "Acolhimento", "Mídia", "Casais", "Homens", "Mulheres", "Ensino", "Intercessão", "Ação Social", "Evangelismo"];
      const ministryDocs: any[] = [];
      
      const batches = [];
      let batch = writeBatch(db);
      let opCount = 0;

      const commitAndReset = async () => {
         if (opCount > 0) {
            batches.push(batch.commit());
            batch = writeBatch(db);
            opCount = 0;
            setProgress(prev => prev + 1);
         }
      };

      for (const m of minNames) {
        const docRef = doc(collection(db, 'ministries'));
        ministryDocs.push(docRef.id);
        batch.set(docRef, { name: m, description: "Ministério de " + m, leaderId: "", leaderName: "", icon: "Users", tenantId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        opCount++;
      }

      // 2. Create Pastor Senior
      const psRef = doc(collection(db, 'users'));
      batch.set(psRef, { name: "Pastor Sênior (Semente)", email: "psenior@teste.com", roles: ['seniorPastor', 'admin'], isApproved: true, tenantId, supervisorId: "", lat: -23.5505, lng: -46.6333, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      opCount++;

      // 3. Create Network Pastors (2)
      const npRefs = [];
      for (let i = 0; i < 2; i++) {
         const npRef = doc(collection(db, 'users'));
         npRefs.push(npRef.id);
         batch.set(npRef, { name: `Pastor de Rede ${i+1}`, email: `prede${i}@teste.com`, roles: ['networkPastor'], isApproved: true, tenantId, supervisorId: psRef.id, lat: -23.55 + Math.random()*0.05, lng: -46.63 + Math.random()*0.05, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
         opCount++;
      }

      // 4. Create Supervisors (12)
      const supRefs = [];
      for (let i = 0; i < 12; i++) {
         const supRef = doc(collection(db, 'users'));
         supRefs.push(supRef.id);
         const myNet = npRefs[i % 2];
         batch.set(supRef, { name: `Supervisor ${i+1}`, email: `sup${i}@teste.com`, roles: ['supervisor'], isApproved: true, tenantId, supervisorId: myNet, lat: -23.55 + Math.random()*0.1, lng: -46.63 + Math.random()*0.1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
         opCount++;
         if (opCount > 400) await commitAndReset();
      }

      // 5. Create 150 Cells & 150 Cell Leaders
      const cellRefs = [];
      for (let i = 0; i < 150; i++) {
         const leaderRef = doc(collection(db, 'users'));
         const mySup = supRefs[i % 12];
         const cellIdRef = doc(collection(db, 'cells'));
         cellRefs.push(cellIdRef.id);

         batch.set(leaderRef, { 
             name: `Líder de Célula ${i+1}`, 
             email: `lider${i}@teste.com`, 
             roles: ['cellLeader'], 
             isApproved: true, 
             tenantId, 
             supervisorId: mySup, 
             cellId: cellIdRef.id,
             lat: -23.5 + Math.random()*0.2, 
             lng: -46.6 + Math.random()*0.2, 
             address: `Rua Exemplo ${i}, Sao Paulo`,
             createdAt: serverTimestamp(), 
             updatedAt: serverTimestamp() 
         });
         opCount++;

         batch.set(cellIdRef, {
            name: `Célula Semente ${i+1}`,
            neighborhood: `Bairro ${i%10}`,
            day: 'Quarta',
            time: '20:00',
            phone: '11999999999',
            leaderId: leaderRef.id,
            tenantId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
         });
         opCount++;

         if (opCount > 400) await commitAndReset();
      }

      // 6. Create 900 Members
      for (let i = 0; i < 900; i++) {
         const memberRef = doc(collection(db, 'users'));
         const myCell = cellRefs[i % 150];
         batch.set(memberRef, { 
             name: `Membro ${i+1}`, 
             email: `membro${i}@teste.com`, 
             roles: ['member'], 
             isApproved: true, 
             tenantId, 
             cellId: myCell,
             lat: -23.5 + Math.random()*0.2, 
             lng: -46.6 + Math.random()*0.2, 
             address: `Avenida Fictícia ${i}, SP`,
             createdAt: serverTimestamp(), 
             updatedAt: serverTimestamp() 
         });
         opCount++;
         if (opCount > 400) await commitAndReset();
      }

      // 7. Create Events for next 6 months
      for (let i=0; i<6; i++) { // roughly 6 events spaced out
         const evRef = doc(collection(db, 'events'));
         const d = new Date();
         d.setMonth(d.getMonth() + i);
         batch.set(evRef, {
            title: `Evento de Massa ${i+1}`,
            date: d.toISOString().split('T')[0],
            tags: ['Conferência'],
            category: 'Geral',
            tenantId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
         });
         opCount++;
      }

      // 8. Create IDE Courses
      const cRef = doc(collection(db, 'courses'));
      batch.set(cRef, {
        title: "Integração & Boas Vindas",
        description: "Curso inicial gerado pelo seed",
        level: "Básico",
        duration: "4 semanas",
        img: "https://images.unsplash.com/photo-1542626991-cbc4e32524cc",
        status: "active",
        category: "Fundamentos",
        tenantId,
        createdBy: psRef.id,
        students: 15,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      opCount++;

      await commitAndReset();
      await Promise.all(batches);

      setMessage("Seed concluído com sucesso!");
    } catch(e) {
      console.error(e);
      setMessage("Erro ao injetar seed: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardHeader>
        <CardTitle>Injeção de Massa (Seed)</CardTitle>
        <CardDescription>Popula o banco com 900 membros, 150 células e hierarquia completa.</CardDescription>
      </CardHeader>
      <CardContent>
        {showConfirm ? (
           <div className="flex flex-col gap-2">
             <p className="text-sm font-bold text-red-500 mb-2">Atenção! Isso irá injetar milhares de documentos no seu banco de dados (Custo alto). Tem certeza?</p>
             <div className="flex gap-4">
               <Button onClick={() => { setShowConfirm(false); runSeeder(); }} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                 Sim, Injetar Dados
               </Button>
               <Button onClick={() => setShowConfirm(false)} variant="outline">
                 Cancelar
               </Button>
             </div>
           </div>
        ) : (
           <Button onClick={() => setShowConfirm(true)} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DatabaseZap className="w-4 h-4 mr-2" />}
              {loading ? `Injetando lote... ${progress}` : "Gerar Dados Fictícios"}
           </Button>
        )}
        {message && <p className="mt-4 text-sm font-bold text-emerald-400">{message}</p>}
        <p className="mt-4 text-xs text-white/40">Isso criará 1x Pastor Senior, 2x Pastores de Rede, 12x Supervisores, 150x Células e Líderes, 900x Membros, 14x Ministérios, e eventos.</p>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subMonths, parseISO, formatISO } from 'date-fns';

export interface VirtualKpi {
  id: string;
  title: string;
  pillar: string;
  color: string;
  isDerived: boolean;
  isVirtual: boolean;
  targetData?: Record<number, number>;
}

export interface VirtualEntry {
  id: string;
  kpiName: string;
  actualValue: number;
  date: string;
}

export function useCrossModuleMetrics(tenantId: string | undefined, monthsToFetch: number = 12) {
  const [virtualKpis, setVirtualKpis] = useState<VirtualKpi[]>([]);
  const [virtualEntries, setVirtualEntries] = useState<VirtualEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const sinceDate = subMonths(new Date(), monthsToFetch);
        const sinceTimestamp = Timestamp.fromDate(sinceDate);

        // Fetch Cell Reports
        const cellReportsQ = query(collection(db, 'cell_reports'), where('tenantId', '==', tenantId));
        const cellReportsSnap = await getDocs(cellReportsQ);
        
        // Fetch Enrollments
        const enrollmentsQ = query(collection(db, 'enrollments'), where('tenantId', '==', tenantId));
        const enrollmentsSnap = await getDocs(enrollmentsQ);

        // Fetch Pastoral Appointments
        const pastoralQ = query(collection(db, 'pastoral_appointments'), where('tenantId', '==', tenantId));
        const pastoralSnap = await getDocs(pastoralQ);

        // Fetch Social Appointments
        const socialQ = query(collection(db, 'social_appointments'), where('tenantId', '==', tenantId));
        const socialSnap = await getDocs(socialQ);

        // Generate Entries
        const generatedEntries: VirtualEntry[] = [];

        // 1. Cell Metrics
        cellReportsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.date) {
            // Frequency
            if (data.present) {
              generatedEntries.push({
                id: `virt-cell-freq-${doc.id}`,
                kpiName: 'kpi_virt_celulas_freq',
                actualValue: Number(data.present),
                date: typeof data.date === 'string' ? data.date : formatISO(data.date.toDate(), { representation: 'date' })
              });
            }
            // Visitors
            if (data.visitors) {
              generatedEntries.push({
                id: `virt-cell-vis-${doc.id}`,
                kpiName: 'kpi_virt_celulas_vis',
                actualValue: Number(data.visitors),
                date: typeof data.date === 'string' ? data.date : formatISO(data.date.toDate(), { representation: 'date' })
              });
            }
          }
        });

        // 2. Escola IDE
        enrollmentsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.createdAt) {
            const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            generatedEntries.push({
              id: `virt-esc-${doc.id}`,
              kpiName: 'kpi_virt_escola_ide_ativos',
              actualValue: 1, 
              date: formatISO(date, { representation: 'date' })
            });
          }
        });

        // 3. Pastoral Appointments
        pastoralSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.date) {
            generatedEntries.push({
              id: `virt-pastoral-${doc.id}`,
              kpiName: 'kpi_virt_pastoral_atendimentos',
              actualValue: 1,
              date: data.date
            });
          }
        });

        // 4. Social Appointments
        socialSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.date) {
            generatedEntries.push({
              id: `virt-social-${doc.id}`,
              kpiName: 'kpi_virt_social_atendimentos',
              actualValue: 1,
              date: data.date
            });
          }
        });

        const vKpis: VirtualKpi[] = [
          {
            id: 'kpi_virt_celulas_freq',
            title: 'Frequência Média em Células',
            pillar: 'Crescer',
            color: 'border-blue-500/50',
            isDerived: false,
            isVirtual: true,
            targetData: { 2025: 15, 2026: 20 }
          },
          {
            id: 'kpi_virt_celulas_vis',
            title: 'Visitantes em Células',
            pillar: 'Crescer',
            color: 'border-cyan-500/50',
            isDerived: false,
            isVirtual: true,
            targetData: { 2025: 50, 2026: 100 }
          },
          {
            id: 'kpi_virt_escola_ide_ativos',
            title: 'Novos Alunos (Escola IDE)',
            pillar: 'Discipular',
            color: 'border-purple-500/50',
            isDerived: false,
            isVirtual: true,
            targetData: { 2025: 100, 2026: 250 }
          },
          {
            id: 'kpi_virt_pastoral_atendimentos',
            title: 'Atendimentos Pastorais',
            pillar: 'Cuidar',
            color: 'border-green-500/50',
            isDerived: false,
            isVirtual: true,
            targetData: { 2025: 200, 2026: 350 }
          },
          {
            id: 'kpi_virt_social_atendimentos',
            title: 'Atendimentos Sociais',
            pillar: 'Impactar',
            color: 'border-orange-500/50',
            isDerived: false,
            isVirtual: true,
            targetData: { 2025: 150, 2026: 300 }
          }
        ];

        setVirtualEntries(generatedEntries);
        setVirtualKpis(vKpis);

      } catch (err) {
        console.error("Error fetching cross-module metrics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [tenantId, monthsToFetch]);

  return { virtualKpis, virtualEntries, loading };
}

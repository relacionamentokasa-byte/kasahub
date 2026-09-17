import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClients, fetchJobs, fetchJobStages } from "@/lib/ops-api";
import { fetchTransactions } from "@/lib/finance-api";
import { supabase } from "@/integrations/supabase/client";
import { GestaoSection } from "./GestaoSection";
import { SaudeNegocioSection } from "./SaudeNegocioSection";

import { OperacaoSection } from "./OperacaoSection";
import { OperationsChartsSection } from "./OperationsChartsSection";
import { PerformanceSection } from "./PerformanceSection";
import { AgendaSection } from "./AgendaSection";
import { ClientesSection } from "./ClientesSection";
import { FeedSection, FeedEvent } from "./FeedSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfToday, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfDay, isWithinInterval, subDays } from "date-fns";
import { usePermissions } from "@/hooks/use-permissions";
import { Loader2, Filter, Settings2, AlertCircle, Clock, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchCalendarEvents } from "@/lib/approvals-api";
import { fetchGoogleCalendarConnection } from "@/lib/google-calendar-api";

type FilterRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

export function ExecutiveDashboard() {
  const { isAdmin } = usePermissions();
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime-simplified')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => qc.invalidateQueries({ queryKey: ["jobs"] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => qc.invalidateQueries({ queryKey: ["clients"] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => qc.invalidateQueries({ queryKey: ["projects"] }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: roles = [] } = useQuery({ 
    queryKey: ["roles", "me"], 
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      return (data || []).map(r => r.role);
    } 
  });
  
  const [range, setRange] = useState<FilterRange>('month');
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(() => {
    return {
      gestao: false,
      operacao: true,
      performance: false,
      agenda: true,
      clientes: true,
      feed: true
    };
  });

  const toggleSection = (id: string) => {
    setVisibleSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { data: clients = [], isLoading: clientsLoading } = useQuery({ queryKey: ["clients"], queryFn: fetchClients, staleTime: 60_000 });
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => fetchJobs(), staleTime: 60_000 });
  const { data: jobStages = [] } = useQuery({ queryKey: ["job_stages"], queryFn: fetchJobStages, staleTime: 5 * 60_000 });
  const { data: transactionsResponse } = useQuery({
    queryKey: ["transactions", "dashboard-ranking"],
    queryFn: () => fetchTransactions({ type: "receita", pageSize: 1000 }),
    staleTime: 60_000,
  });
  const transactions = transactionsResponse?.data || [];

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["calendar-events", "today"],
    queryFn: () => {
      const today = new Date();
      const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      return fetchCalendarEvents({ from: start, to: end });
    },
    staleTime: 5 * 60_000,
  });


  const isLoading = clientsLoading || jobsLoading;

  const dateInterval = useMemo(() => {
    const now = new Date();
    let start: Date;
    switch (range) {
      case 'today': start = startOfToday(); break;
      case 'week': start = startOfWeek(now, { weekStartsOn: 1 }); break;
      case 'month': start = startOfMonth(now); break;
      case 'quarter': start = startOfQuarter(now); break;
      case 'year': start = startOfYear(now); break;
    }
    return { start, end: endOfDay(now) };
  }, [range]);

  const filteredData = useMemo(() => {
    const { start, end } = dateInterval;
    const interval = { start, end };

    const inRange = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      return isWithinInterval(new Date(dateStr), interval);
    };

    const periodJobs = jobs.filter(j => inRange(j.created_at));
    const jobsInProgress = jobs.filter(j => !j.done_at).length;
    const jobsOverdue = jobs.filter(j => !j.done_at && j.due_date && j.due_date < new Date().toISOString().slice(0, 10)).length;
    const monthStartIso = startOfMonth(new Date()).toISOString();
    const jobsCompletedMonth = jobs.filter(j => j.done_at && j.done_at >= monthStartIso).length;
    const pendingApprovals = jobs.filter(j => j.status === 'review').length;

    const todayIso = new Date().toISOString().slice(0, 10);
    const agendaItems = [
      ...jobs.filter(j => j.due_date === todayIso && !j.done_at).map(j => ({
        id: j.id, title: j.title, subtitle: clients.find(c => c.id === j.client_id)?.company || "—", client_id: j.client_id, type: 'job_today' as const
      })),
      ...jobs.filter(j => j.due_date && j.due_date < todayIso && !j.done_at).map(j => ({
        id: j.id, title: j.title, subtitle: clients.find(c => c.id === j.client_id)?.company || "—", client_id: j.client_id, type: 'job_overdue' as const
      })),
      ...jobs.filter(j => j.status === 'review').map(j => ({
        id: j.id, title: j.title, subtitle: clients.find(c => c.id === j.client_id)?.company || "—", client_id: j.client_id, type: 'approval' as const
      }))
    ];

    const totalsByClient = new Map<string, number>();
    for (const t of transactions as any[]) {
      if (!t.client_id) continue;
      const d = t.payment_date || t.due_date;
      if (!inRange(d)) continue;
      const amount = Number(t.amount) || 0;
      totalsByClient.set(t.client_id, (totalsByClient.get(t.client_id) || 0) + amount);
    }
    const clientRanking = clients.map(client => ({
        id: client.id,
        name: client.company || client.name,
        total: totalsByClient.get(client.id) || 0,
    }));

    const feedEvents: FeedEvent[] = [
      ...periodJobs.map(j => ({
        id: j.id, time: new Date(j.created_at), user: "Sistema", action: j.done_at ? "Concluiu" : "Criou o Job", target: j.title, type: 'job' as const
      }))
    ];

    const alerts: any[] = [];
    if (jobsOverdue > 0) {
      alerts.push({ 
        type: 'critical', 
        message: `${jobsOverdue} Jobs em atraso`, 
        detail: "Ação imediata necessária para cumprir prazos.",
        icon: AlertCircle
      });
    }

    return {
      ind: { mrr: 0, monthIncome: 0, monthExpense: 0, monthResult: 0 },
      jobsInProgress,
      jobsOverdue,
      jobsCompletedMonth,
      pendingApprovals,
      dmesInProduction: 0,
      performanceMetrics: { monthGoal: 0, monthActual: 0, yearGoal: 0, yearActual: 0, projection: 0 },
      agendaItems,
      clientRanking,
      feedEvents,
      alerts
    };
  }, [jobs, clients, transactions, dateInterval]);

  // Render immediately; individual sections show their own loading states.
  // Avoids blocking the entire dashboard on heavy queries (jobs/clients).


  const isManager = isAdmin || roles.some((r: any) => r === 'ceo' || r === 'gestor');

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg lg:text-xl font-bold tracking-tight">Indicadores Estratégicos</h2>
          <p className="text-xs text-muted-foreground truncate">Pulso financeiro e performance operacional consolidada.</p>
        </div>
      </header>

      <SaudeNegocioSection />

      {/* Gráficos Visuais com dados reais da Operação (Colunas por fase e Donut de Mix de Clientes) */}
      <OperationsChartsSection jobs={jobs} clients={clients} jobStages={jobStages} />
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchTransactions, 
  fetchContracts, 
  computeIndicators, 
  fetchBankAccounts 
} from "@/lib/finance-api";
import { fetchClients, fetchJobs, fetchJobStages } from "@/lib/ops-api";
import { fetchAgencyGoals } from "@/lib/performance-api";
import { supabase } from "@/integrations/supabase/client";
import { GestaoSection } from "./GestaoSection";
import { OperacaoSection } from "./OperacaoSection";
import { PerformanceSection } from "./PerformanceSection";
import { AgendaSection } from "./AgendaSection";
import { ClientesSection } from "./ClientesSection";
import { FeedSection, FeedEvent } from "./FeedSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfToday, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfDay, isWithinInterval, subDays } from "date-fns";
import { usePermissions } from "@/hooks/use-permissions";
import { Loader2, Filter } from "lucide-react";

type FilterRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

export function ExecutiveDashboard() {
  const { can, isAdmin } = usePermissions();
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

  // Queries
  const { data: txs = [], isLoading: txLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions() });
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: clients = [], isLoading: clientsLoading } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => fetchJobs() });
  const { data: jobStages = [] } = useQuery({ queryKey: ["job_stages"], queryFn: fetchJobStages });
  const { data: goals = [] } = useQuery({ 
    queryKey: ["agency-goals", new Date().getFullYear()], 
    queryFn: () => fetchAgencyGoals(new Date().getFullYear()) 
  });
  const { data: dmes = [] } = useQuery({
    queryKey: ["extra-demands"],
    queryFn: async () => {
      const { data, error } = await supabase.from('extra_demands').select('*');
      if (error) throw error;
      return data;
    }
  });

  const isLoading = txLoading || contractsLoading || clientsLoading || jobsLoading;

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

    const periodTxs = txs.filter(t => inRange(t.due_date));
    const periodJobs = jobs.filter(j => inRange(j.created_at));
    const periodContracts = contracts.filter(c => inRange(c.created_at));
    const periodDmes = dmes.filter(d => inRange(d.created_at));

    // Stats
    const ind = computeIndicators(txs, contracts, { 
      from: start.toISOString().slice(0, 10), 
      to: end.toISOString().slice(0, 10) 
    });

    const jobsInProgress = jobs.filter(j => !j.done_at).length;
    const jobsOverdue = jobs.filter(j => !j.done_at && j.due_date && j.due_date < new Date().toISOString().slice(0, 10)).length;
    const jobsCompleted = jobs.filter(j => j.done_at && inRange(j.done_at)).length;
    const pendingApprovals = jobs.filter(j => j.status === 'review').length;
    const dmesInProduction = dmes.filter(d => d.status === 'approved').length;

    // Performance
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const currentGoals = goals.filter(g => g.month === month || g.period === 'yearly');

    const performanceMetrics = [
      { 
        label: "Receita", 
        target: currentGoals.find(g => g.type === 'revenue')?.target_value || 0, 
        actual: ind.monthIncome, 
        isCurrency: true 
      },
      { 
        label: "Contratos", 
        target: currentGoals.find(g => g.type === 'contracts')?.target_value || 0, 
        actual: periodContracts.length 
      },
      { 
        label: "Jobs", 
        target: currentGoals.find(g => g.type === 'jobs')?.target_value || 0, 
        actual: jobsCompleted 
      },
    ];

    // Agenda
    const todayIso = new Date().toISOString().slice(0, 10);
    const agendaItems = [
      ...jobs.filter(j => j.due_date === todayIso && !j.done_at).map(j => ({
        id: j.id, title: j.title, subtitle: clients.find(c => c.id === j.client_id)?.company || "—", type: 'job_today' as const
      })),
      ...jobs.filter(j => j.due_date && j.due_date < todayIso && !j.done_at).map(j => ({
        id: j.id, title: j.title, subtitle: clients.find(c => c.id === j.client_id)?.company || "—", type: 'job_overdue' as const
      })),
      ...jobs.filter(j => j.status === 'review').map(j => ({
        id: j.id, title: j.title, subtitle: clients.find(c => c.id === j.client_id)?.company || "—", type: 'approval' as const
      })),
      ...txs.filter(t => t.kind === 'income' && t.status === 'pending' && t.due_date && t.due_date >= todayIso && t.due_date <= subDays(new Date(), -7).toISOString().slice(0, 10)).map(t => ({
        id: t.id, title: t.description || "Cobrança", subtitle: clients.find(c => c.id === t.client_id)?.company || "—", type: 'collection' as const, value: Number(t.amount)
      }))
    ];

    // Client Ranking
    const clientRanking = clients.map(client => {
      const clientTxs = txs.filter(t => t.client_id === client.id && inRange(t.due_date));
      const contracted = clientTxs.filter(t => t.kind === 'income' && t.contract_id).reduce((s, t) => s + Number(t.amount), 0);
      const extra = clientTxs.filter(t => t.kind === 'income' && !t.contract_id).reduce((s, t) => s + Number(t.amount), 0);
      return {
        id: client.id,
        name: client.company || client.name,
        contracted,
        extra,
        total: contracted + extra
      };
    }).filter(c => c.total > 0);

    // Feed Events (Simplified mock-like extraction from current state)
    const feedEvents: FeedEvent[] = [
      ...periodJobs.map(j => ({
        id: j.id, time: new Date(j.created_at), user: "Sistema", action: j.done_at ? "Concluiu" : "Criou o Job", target: j.title, type: 'job' as const
      })),
      ...periodContracts.map(c => ({
        id: c.id, time: new Date(c.created_at), user: "Sistema", action: "Novo Contrato", target: clients.find(cl => cl.id === c.client_id)?.company || "Cliente", description: `R$ ${c.monthly_value}/mês`, type: 'contract' as const
      })),
      ...periodDmes.filter(d => d.status === 'approved').map(d => ({
        id: d.id, time: new Date(d.created_at), user: "Cliente", action: "Aprovou DME", target: d.title, type: 'dme' as const
      }))
    ];

    return {
      ind,
      jobsInProgress,
      jobsOverdue,
      jobsCompleted,
      pendingApprovals,
      dmesInProduction,
      performanceMetrics,
      agendaItems,
      clientRanking,
      feedEvents
    };
  }, [txs, contracts, jobs, clients, dmes, goals, range, dateInterval]);

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-foreground/40 font-mono-kasa animate-pulse">Carregando dados executivos...</p>
      </div>
    );
  }

  const {
    ind,
    jobsInProgress,
    jobsOverdue,
    jobsCompleted,
    pendingApprovals,
    dmesInProduction,
    performanceMetrics,
    agendaItems,
    clientRanking,
    feedEvents
  } = filteredData;

  const isManager = userRole === 'admin' || userRole === 'ceo' || userRole === 'gestor';
  const isFinance = userRole === 'financeiro' || isManager;
  const isOps = userRole === 'operador' || isManager;

  return (
    <div className="space-y-10">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Resumo Geral</h2>
          <p className="text-sm text-foreground/50">Visualize os indicadores vitais da sua agência.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-foreground/40" />
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {isFinance && (
        <GestaoSection stats={{
          contractedRevenue: ind.mrr,
          receivedRevenue: ind.incomePaid,
          activeContracts: contracts.filter(c => c.status === 'active').length,
          extraRevenue: ind.extraIncome
        }} />
      )}

      {isOps && (
        <OperacaoSection stats={{
          jobsInProgress,
          jobsOverdue,
          jobsCompleted,
          pendingApprovals,
          dmesInProduction
        }} />
      )}

      {isManager && (
        <PerformanceSection metrics={performanceMetrics} />
      )}

      <AgendaSection items={agendaItems} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ClientesSection clients={clientRanking} />
        <FeedSection events={feedEvents} />
      </div>
    </div>
  );
}

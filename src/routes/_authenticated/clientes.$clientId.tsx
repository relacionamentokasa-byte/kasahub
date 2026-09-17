import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { 
  ArrowLeft, Mail, Phone, Building2, 
  Wallet, FileText, FolderKanban, Activity, 
  TrendingUp, Handshake, CheckSquare, Loader2,
  FileSignature, Sparkles, Link as LinkIcon, Plus, Rocket, CalendarDays,
  Presentation as PresentationIcon
} from "lucide-react";
import { ClientPresentationsPanel } from "@/components/clients/ClientPresentationsPanel";
import { ClientOnboardingPanel } from "@/components/onboarding/ClientOnboardingPanel";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { JobsBoard } from "@/components/jobs/JobsBoard";
import { LaunchGridSection } from "@/components/clients/LaunchGridSection";
import { ClientEditorialSection } from "@/components/clients/ClientEditorialSection";
import { ClientTimeline } from "@/components/clients/ClientTimeline";
import { ClientKpiHeader } from "@/components/clients/ClientKpiHeader";
import { ClientUnifiedTimeline, buildUnifiedEvents } from "@/components/clients/ClientUnifiedTimeline";
import { ClientServicesManager } from "@/components/clients/ClientServicesManager";
import { brl } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { fetchProposals } from "@/lib/crm-api";
import { fetchTransactions, fetchContracts } from "@/lib/finance-api";
import { effectiveAmount } from "@/lib/finance-values";
import { fetchProjects, fetchExtraDemands, getDmePublicUrl } from "@/lib/ops-api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailHeaderSkeleton, CardListSkeleton } from "@/components/ui/loading-skeletons";
import { StorageImage } from "@/components/ui/storage-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export const Route = createFileRoute("/_authenticated/clientes/$clientId")({
  head: () => ({ meta: [{ title: "Visão 360 do Cliente — KASA HUB" }] }),
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = useParams({ from: "/_authenticated/clientes/$clientId" });

  const { data: client, isLoading: clientLoading, error: clientError } = useQuery({ 
    queryKey: ["client", clientId], 
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Error fetching client 360 view:", err);
        throw err;
      }
    }
  });

  const { data: proposals = [], refetch: refetchProposals } = useQuery({ 
    queryKey: ["client-proposals", clientId], 
    queryFn: () => fetchProposals().then(res => res.filter(p => p.client_id === clientId)),
    enabled: !!client
  });

  const { data: projects = [] } = useQuery({ 
    queryKey: ["client-projects", clientId], 
    queryFn: () => fetchProjects({ clientId }),
    enabled: !!client
  });

  const { data: contracts = [], refetch: refetchContracts } = useQuery({ 
    queryKey: ["client-contracts", clientId], 
    queryFn: () => fetchContracts({ clientId }),
    enabled: !!client
  });

  const { data: transactionsResponse } = useQuery({ 
    queryKey: ["client-transactions", clientId], 
    queryFn: () => fetchTransactions({ clientId, pageSize: 1000 }), // Aumentar limite para visão 360 do cliente
    enabled: !!client
  });
  const transactions = transactionsResponse?.data || [];

  const { data: jobs = [] } = useQuery({
    queryKey: ["client-jobs-summary", clientId],
    enabled: !!client,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, done_at, created_at")
        .eq("client_id", clientId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dmes = [] } = useQuery({
    queryKey: ["client-dmes-summary", clientId],
    queryFn: () => fetchExtraDemands({ clientId }),
    enabled: !!client,
  });

  const { data: onboardings = [] } = useQuery({
    queryKey: ["client-onboardings", clientId],
    enabled: !!client,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboardings")
        .select("id, title, status, start_date, completed_at, created_at")
        .eq("client_id", clientId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ["client-timeline-events", clientId],
    enabled: !!client,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_timeline_events")
        .select("created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Todos os hooks devem ser declarados ANTES de qualquer early return
  // para preservar a ordem entre renders (loading -> loaded).
  const unifiedEvents = useMemo(
    () => buildUnifiedEvents({ proposals, contracts, projects, jobs, dmes, transactions, onboardings }),
    [proposals, contracts, projects, jobs, dmes, transactions, onboardings],
  );

  if (clientLoading) return <DetailHeaderSkeleton />;

  if (clientError || !client) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] space-y-6">
      <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <Activity className="size-8 text-destructive" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Cliente não encontrado</h2>
        <p className="text-foreground/50">O ID informado não corresponde a nenhum cliente na base.</p>
      </div>
      <Button asChild variant="outline" className="rounded-full">
        <Link to="/clientes">
          <ArrowLeft className="size-4 mr-2" /> Voltar para lista
        </Link>
      </Button>
    </div>
  );

  const totalRevenue = transactions
    .filter(t => t.type === "income" && t.status === "paid")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingRevenue = transactions
    .filter(t => t.type === 'income' && t.status !== 'paid' && client?.financial_collection_status !== 'suspended')
    .reduce((acc, t) => acc + effectiveAmount(t as any), 0);

  const suspendedRevenue = transactions
    .filter(t => t.type === 'income' && t.status !== 'paid' && client?.financial_collection_status === 'suspended')
    .reduce((acc, t) => acc + effectiveAmount(t as any), 0);

  const todayIso = new Date().toISOString().slice(0, 10);
  const mrr = contracts
    .filter((c: any) => c.status === "active")
    .reduce((sum: number, c: any) => sum + Number(c.monthly_value || 0), 0);
  const isClientSuspended = client?.financial_collection_status === 'suspended';
  const overdueIncomeCount = transactions.filter(
    (t: any) => (t.type === "income" || t.kind === "income") && t.status === "pending" && t.due_date && t.due_date < todayIso && !isClientSuspended,
  ).length;
  const paidIncomeCount = transactions.filter((t: any) => (t.type === "income" || t.kind === "income") && t.status === "paid").length;
  const pendingIncomeCount = transactions.filter((t: any) => (t.type === "income" || t.kind === "income") && t.status === "pending" && !isClientSuspended).length;
  const activeJobsCount = (jobs as any[]).filter(
    (j) => !j.done_at && !["done", "cancelled", "archived"].includes(j.status),
  ).length;

  const lastContactCandidates: Array<{ ts: string; source: string }> = [];
  if (timelineEvents[0]?.created_at) lastContactCandidates.push({ ts: timelineEvents[0].created_at, source: "Evento na timeline" });
  for (const p of proposals) {
    if (p.created_at) lastContactCandidates.push({ ts: p.created_at, source: "Proposta criada" });
    if ((p as any).sent_at) lastContactCandidates.push({ ts: (p as any).sent_at, source: "Proposta enviada" });
  }
  for (const t of transactions) {
    if (t.status === "paid" && (t as any).paid_at) lastContactCandidates.push({ ts: (t as any).paid_at, source: "Pagamento recebido" });
  }
  for (const d of dmes as any[]) {
    if (d.created_at) lastContactCandidates.push({ ts: d.created_at, source: "DME criada" });
  }
  const lastContact = lastContactCandidates.sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];






  return (
    <div className="flex flex-col h-full bg-background animate-reveal">
      {/* Header / Resumo Rápido */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border/60 bg-card">
        <div className="w-full mx-auto space-y-3">
          <Link to="/clientes" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono-kasa transition-colors group">
            <ArrowLeft className="size-3 group-hover:-translate-x-0.5 transition-transform" /> Voltar para lista
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-foreground text-base font-mono-kasa font-bold shrink-0">
                {client?.logo_url ? (
                  <StorageImage src={client?.logo_url} alt={client?.name} className="size-full object-cover rounded-lg" />
                ) : (
                  (client?.company || client?.name)?.[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight break-words text-foreground">
                    {client?.company || client?.name}
                  </h1>
                  <Badge variant="outline" className={cn(
                    "rounded px-2 py-0 text-[10px] font-mono-kasa font-semibold uppercase tracking-wider border",
                    client?.status === 'active' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' :
                    client?.status === 'paused' ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5' :
                    'border-border/60 text-muted-foreground bg-muted/20'
                  )}>
                    {client?.status === 'active' ? 'Ativo' : client?.status === 'paused' ? 'Pausado' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-mono-kasa text-[11px]">
                  {client?.email && <span className="inline-flex items-center gap-1.5"><Mail className="size-3 text-muted-foreground/70" />{client?.email}</span>}
                  {client?.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3 text-muted-foreground/70" />{client?.phone}</span>}
                  {client?.document && <span className="inline-flex items-center gap-1.5"><Building2 className="size-3 text-muted-foreground/70" />{client?.document}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block border-r border-border/60 pr-4">
                 <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground leading-none">Receita Paga</p>
                 <p className="text-base font-mono-kasa font-bold text-foreground tabular-nums mt-1">{brl(totalRevenue)}</p>
               </div>
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground leading-none">A Receber</p>
                 <p className="text-base font-mono-kasa font-bold text-foreground tabular-nums mt-1">{brl(pendingRevenue)}</p>
                 {suspendedRevenue > 0 && (
                   <p className="text-[10px] font-mono-kasa text-amber-600 dark:text-amber-400 mt-0.5">Suspenso: {brl(suspendedRevenue)}</p>
                 )}
               </div>
            </div>
          </div>

          <ClientKpiHeader
            mrr={mrr}
            lastContactAt={lastContact?.ts ?? null}
            lastContactSource={lastContact?.source ?? null}
            activeJobsCount={activeJobsCount}
            overdueIncomeCount={overdueIncomeCount}
            paidIncomeCount={paidIncomeCount}
            pendingIncomeCount={pendingIncomeCount}
          />
        </div>
      </div>


      {/* Navegação 360 */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <div className="bg-card border-b border-border/60 sticky top-0 z-10">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
            <TabsList className="bg-transparent border-0 h-auto p-0 gap-6 overflow-x-auto justify-start no-scrollbar">
              {[
                { v: "overview", label: "Resumo", icon: Activity },
                { v: "contratos", label: "Contratos", icon: FileSignature },
                { v: "propostas", label: "Propostas", icon: FileText },
                { v: "projetos", label: "Projetos", icon: FolderKanban },
                { v: "jobs", label: "Jobs", icon: CheckSquare },
                ...((client as any)?.has_launch_grid ? [{ v: "grid", label: "Grid de Lançamento", icon: Rocket }] : []),
                ...((client as any)?.has_editorial_calendar ? [{ v: "editorial", label: "Calendário Editorial", icon: CalendarDays }] : []),
                { v: "financeiro", label: "Financeiro", icon: Wallet },
                { v: "dmes", label: "Demandas Extras", icon: Sparkles },
                { v: "servicos", label: "Serviços", icon: Handshake },
                { v: "onboarding", label: "Onboarding", icon: Rocket },
                { v: "apresentacoes", label: "Apresentações", icon: PresentationIcon },
                { v: "timeline", label: "Linha do Tempo", icon: TrendingUp },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.v}
                  value={tab.v}
                  className="relative data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground border-b-2 border-transparent rounded-none px-0 py-3 text-xs font-mono-kasa font-medium tracking-tight gap-1.5 transition-colors hover:text-foreground text-muted-foreground shadow-none"
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                  {tab.v === "contratos" && contracts.length > 0 && (
                    <span className="flex size-4 items-center justify-center rounded bg-foreground/10 text-[9px] font-mono-kasa font-bold text-foreground">
                      {contracts.length}
                    </span>
                  )}
                  {tab.v === "propostas" && proposals.filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status)).length > 0 && (
                    <span className="flex size-4 items-center justify-center rounded bg-foreground/10 text-[9px] font-mono-kasa font-bold text-foreground">
                      {proposals.filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status)).length}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
            
            {/* Conteúdo: Resumo */}
            <TabsContent value="overview" className="m-0 space-y-6 animate-reveal">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <QuickStatCard title="Propostas" value={proposals.filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status)).length} />
                <QuickStatCard title="Contratos Ativos" value={contracts.filter(c => c.status === 'active').length} />
                <QuickStatCard title="Projetos Ativos" value={projects.filter(p => p.status === 'active').length} />
                <QuickStatCard title="Receita Paga" value={brl(totalRevenue)} isText />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card border border-border/60 rounded-lg overflow-hidden">
                  <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                      <FolderKanban className="size-3.5 text-foreground" /> Projetos em Andamento
                    </span>
                  </div>
                  <div>
                    <div className="divide-y divide-border/60">
                      {projects.slice(0, 5).map(project => (
                        <div key={project.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors">
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate text-foreground">{project.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono-kasa mt-0.5">Criado em {new Date(project.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline" className="rounded px-2 py-0 text-[10px] font-mono-kasa uppercase tracking-wider border-border/60 text-muted-foreground bg-muted/20">
                            {project.status}
                          </Badge>
                        </div>
                      ))}
                      {projects.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-8">Nenhum projeto vinculado.</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border/60 rounded-lg overflow-hidden flex flex-col">
                  <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                      <TrendingUp className="size-3.5 text-foreground" /> Histórico Recente
                    </span>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto">
                    <ClientUnifiedTimeline events={unifiedEvents} limit={8} emptyHint="Sem atividades ainda — crie uma proposta ou registre um pagamento." />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Conteúdo: Contratos (Propostas Aprovadas) */}
            <TabsContent value="contratos" className="m-0 space-y-4 animate-reveal">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contracts.map(contract => (
                  <div key={contract.id} className="bg-card border border-border/60 rounded-lg p-4 hover:border-border transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-kasa uppercase tracking-wider font-semibold border",
                        contract.status === 'active'
                          ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5"
                          : "border-border/60 text-muted-foreground bg-muted/20"
                      )}>
                        {contract.status === 'active' ? 'Ativo' : contract.status}
                      </span>
                      <FileSignature className="size-3.5 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground mb-1 truncate">{contract.title}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono-kasa mb-3">Início: {new Date(contract.start_date).toLocaleDateString()}</p>

                    <div className="space-y-2 pt-3 border-t border-border/60 font-mono-kasa">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Fee Mensal</span>
                        <span className="font-bold text-emerald-500 tabular-nums">{brl(Number(contract.monthly_value))}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Duração</span>
                        <span className="font-medium text-foreground">{(contract as any).installments_count ? `${(contract as any).installments_count} meses` : 'Recorrente'}</span>
                      </div>

                      <Button asChild variant="outline" size="sm" className="w-full mt-2 rounded-md text-[11px] font-mono-kasa tracking-tight gap-1.5 h-8 border-border/60">
                        <Link to="/propostas/$proposalId" params={{ proposalId: contract.proposal_id || "" }}>
                          <FileText className="size-3.5" /> Detalhes do Contrato
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {contracts.length === 0 && (
                  <div className="col-span-full py-12 border border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <FileSignature className="size-6 opacity-30" />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground">Nenhum contrato ativo</p>
                      <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground mt-0.5">Aprove uma proposta para gerar o contrato</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Conteúdo: Propostas */}
            <TabsContent value="propostas" className="m-0 animate-reveal">
               <div className="bg-card border border-border/60 rounded-lg overflow-hidden shadow-xs">
                 <Table>
                   <TableHeader className="bg-muted/20">
                     <TableRow className="border-border/60">
                       <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-muted-foreground">Proposta</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-muted-foreground">Data</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-right text-muted-foreground">Valor Total</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-center text-muted-foreground">Status</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-center text-muted-foreground">Ação</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody className="divide-y divide-border/60">
                     {proposals
                       .filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status))
                       .map(p => (
                        <TableRow key={p.id} className="border-border/60 hover:bg-muted/10 transition-colors">
                          <TableCell className="font-medium text-xs py-2.5 text-foreground">{p.title}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono-kasa py-2.5">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right text-xs font-mono-kasa tabular-nums font-semibold py-2.5">{brl(p.total || 0)}</TableCell>
                          <TableCell className="text-center py-2.5">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-kasa uppercase tracking-wider font-semibold border",
                              p.status === 'draft' || p.status === 'Rascunho'
                                ? "border-amber-500/20 text-amber-500 bg-amber-500/5"
                                : "border-border/60 text-muted-foreground bg-muted/20"
                            )}>
                              {p.status === 'draft' ? 'Rascunho' : p.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                             <Button asChild variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] font-mono-kasa rounded-md">
                               <Link to="/propostas/$proposalId" params={{ proposalId: p.id }}>Editar</Link>
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                     {proposals.filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status)).length === 0 && (
                       <TableRow>
                         <TableCell colSpan={5} className="py-10 text-center text-muted-foreground italic text-xs">
                           <div className="flex flex-col items-center gap-1.5">
                             <FileText className="size-4 opacity-30" />
                             <span>Nenhuma proposta em negociação encontrada.</span>
                           </div>
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
            </TabsContent>

            {/* Conteúdo: Jobs */}
            <TabsContent value="jobs" className="m-0 min-h-[500px] animate-reveal">
              <JobsBoard clientId={clientId} title="Jobs do Cliente" eyebrow="Gestão · Operação" />
            </TabsContent>

            {/* Conteúdo: Grid de Lançamento */}
            {(client as any)?.has_launch_grid && (
              <TabsContent value="grid" className="m-0 min-h-[500px] animate-reveal">
                <LaunchGridSection clientId={clientId} clientName={client.name || client.company || "Cliente"} />
              </TabsContent>
            )}

            {/* Conteúdo: Calendário Editorial */}
            {(client as any)?.has_editorial_calendar && (
              <TabsContent value="editorial" className="m-0 min-h-[500px] animate-reveal">
                <ClientEditorialSection
                  clientId={clientId}
                  clientName={client.company || client.name || "Cliente"}
                  clientLogoUrl={(client as any)?.logo_url ?? null}
                />
              </TabsContent>
            )}



            {/* Conteúdo: Financeiro */}
            <TabsContent value="financeiro" className="m-0 animate-reveal">
               <div className="bg-card border border-border/60 rounded-lg overflow-hidden shadow-xs">
                 <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-muted/20">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono-kasa uppercase text-muted-foreground tracking-wider font-semibold">Situação das cobranças:</span>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-kasa uppercase tracking-wider font-semibold border",
                          client?.financial_collection_status === 'active'
                            ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5"
                            : "border-amber-500/20 text-amber-500 bg-amber-500/5"
                        )}>
                          {client?.financial_collection_status === 'active' ? 'Ativas' : 'Suspensas'}
                        </span>
                      </div>
                      {suspendedRevenue > 0 && (
                        <div className="text-[10px] font-mono-kasa tabular-nums font-semibold text-amber-500 uppercase tracking-tight">
                          Total Suspenso: {brl(suspendedRevenue)}
                        </div>
                      )}
                    </div>

                    <FinancialCollectionToggle clientId={clientId} currentStatus={client?.financial_collection_status} />
                  </div>

                  <div className="space-y-4">
                    {/* Seção 1: Lançamentos Operacionais (Ativos) */}
                    <div>
                      <div className="px-4 py-2 bg-muted/10 border-b border-border/60">
                        <h4 className="text-[10px] font-mono-kasa font-semibold uppercase tracking-wider text-muted-foreground">Cobranças Ativas / Histórico</h4>
                      </div>
                      <Table>
                        <TableHeader className="bg-muted/20">
                          <TableRow className="border-border/60">
                            <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-muted-foreground">Vencimento</TableHead>
                            <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-muted-foreground">Descrição</TableHead>
                            <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-right text-muted-foreground">Valor</TableHead>
                            <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 text-center text-muted-foreground">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                          {transactions
                            .filter(t => client?.financial_collection_status === 'active' || t.status === 'paid')
                            .map(t => (
                            <TableRow key={t.id} className="border-border/60 hover:bg-muted/10 transition-colors">
                              <TableCell className="text-xs font-mono-kasa text-muted-foreground py-2.5">
                                {new Date(t.due_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-medium text-xs py-2.5 text-foreground">{t.description}</TableCell>
                              <TableCell className={`text-right text-xs font-mono-kasa tabular-nums font-semibold py-2.5 ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {t.type === 'income' ? '+' : '-'} {brl(Number(t.amount))}
                              </TableCell>
                              <TableCell className="text-center py-2.5">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-kasa uppercase tracking-wider font-semibold border",
                                  t.status === 'paid'
                                    ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5"
                                    : "border-border/60 text-muted-foreground bg-muted/20"
                                )}>
                                  {t.status === 'paid' ? 'Liquidado' : t.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {transactions.filter(t => client?.financial_collection_status === 'active' || t.status === 'paid').length === 0 && (
                            <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground italic text-xs">Nenhum lançamento ativo ou histórico pago.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Seção 2: Cobranças Suspensas (Apenas se o cliente estiver suspenso e houver itens pendentes) */}
                    {client?.financial_collection_status === 'suspended' && transactions.some(t => t.status !== 'paid') && (
                      <div className="border-t border-amber-500/20 bg-amber-500/[0.02]">
                        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
                          <h4 className="text-[10px] font-mono-kasa font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Cobranças Suspensas</h4>
                          <span className="text-[10px] font-mono-kasa tabular-nums font-semibold text-amber-600 dark:text-amber-400">{brl(suspendedRevenue)}</span>
                        </div>
                        <Table>
                          <TableBody className="divide-y divide-border/60">
                            {transactions
                              .filter(t => t.status !== 'paid')
                              .map(t => (
                              <TableRow key={t.id} className="opacity-60 bg-amber-500/[0.01] border-border/60">
                                <TableCell className="text-xs font-mono-kasa py-2.5 w-[120px]">
                                  {new Date(t.due_date).toLocaleDateString()}
                                  <div className="text-[9px] font-mono-kasa font-bold text-amber-500 uppercase mt-0.5">Suspensa</div>
                                </TableCell>
                                <TableCell className="font-medium text-xs py-2.5 text-foreground">{t.description}</TableCell>
                                <TableCell className="text-right text-xs font-mono-kasa tabular-nums font-semibold text-amber-500/80 w-[150px] py-2.5">
                                  {brl(Number(t.amount))}
                                </TableCell>
                                <TableCell className="text-center py-2.5 w-[100px]">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-kasa uppercase tracking-wider font-semibold border border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                                    {t.status}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
            </TabsContent>

            <TabsContent value="dmes" className="m-0 animate-reveal">
              <ClientDmesTab clientId={clientId} />
            </TabsContent>

            <TabsContent value="servicos" className="m-0 animate-reveal">
              <ClientServicesManager clientId={clientId} />
            </TabsContent>

            <TabsContent value="onboarding" className="m-0 animate-reveal">
              <ClientOnboardingPanel clientId={clientId} />
            </TabsContent>

            <TabsContent value="apresentacoes" className="m-0 animate-reveal">
              <ClientPresentationsPanel clientId={clientId} />
            </TabsContent>




            <TabsContent value="timeline" className="m-0 animate-reveal">
              <div className="max-w-3xl">
                <UnifiedTimelineTab events={unifiedEvents} />
              </div>
            </TabsContent>

          </div>
        </div>
      </Tabs>
    </div>
  );
}

function UnifiedTimelineTab({ events }: { events: ReturnType<typeof buildUnifiedEvents> }) {
  const [filter, setFilter] = useState<string>("all");
  return <ClientUnifiedTimeline events={events} filter={filter} onFilterChange={setFilter} />;
}


function QuickStatCard({ title, value, isText = false }: { title: string, value: any, icon?: any, color?: string, isText?: boolean }) {
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3.5">
      <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
        {title}
      </span>
      <div className={cn(
        "mt-1 font-mono-kasa text-xl font-bold text-foreground tabular-nums",
        !isText && "tracking-tight"
      )}>
        {value}
      </div>
    </div>
  );
}

function ClientDmesTab({ clientId }: { clientId: string }) {
  const { data: dmes = [], isLoading } = useQuery({
    queryKey: ["extra_demands", { clientId }],
    queryFn: () => fetchExtraDemands({ clientId }),
  });

  function copy(token: string) {
    navigator.clipboard.writeText(getDmePublicUrl(token));
    toast.success("Link de aprovação copiado!");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold">Demandas Extras</h3>
          <p className="text-xs text-muted-foreground">Solicitações fora do escopo do contrato. Cada aprovação gera lançamento financeiro automático.</p>
        </div>
        <Link to="/dmes" search={{ clientId }}>
          <Button size="sm" className="gap-2"><Plus className="size-3.5" /> Nova DME</Button>
        </Link>
      </div>

      {isLoading ? (
        <CardListSkeleton count={3} />
      ) : dmes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Sparkles className="size-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma demanda extra registrada para este cliente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Demanda</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dmes.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.number_display}</TableCell>
                  <TableCell>
                    <div className="font-medium">{d.title}</div>
                    {d.description && <div className="text-xs text-muted-foreground line-clamp-1">{d.description}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.contracts?.title || "Avulsa"}</TableCell>
                  <TableCell className="text-right font-mono">{brl(Number(d.value))}</TableCell>
                  <TableCell className="text-sm">{d.due_date ? new Date(d.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      d.status === "approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      d.status === "rejected" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {d.public_token && (
                      <Button size="icon" variant="ghost" onClick={() => copy(d.public_token)} title="Copiar link público">
                        <LinkIcon className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function FinancialCollectionToggle({ clientId, currentStatus }: { clientId: string; currentStatus?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const qc = useQueryClient();
  const isSuspended = currentStatus === 'suspended';

  const mutation = useMutation({
    mutationFn: async () => {
      const nextStatus = isSuspended ? 'active' : 'suspended';
      const patch = {
        financial_collection_status: nextStatus as any,
        financial_collection_date: nextStatus === 'suspended' ? new Date().toISOString() : null,
        financial_collection_reason: nextStatus === 'suspended' ? reason : null,
      };
      const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      toast.success(isSuspended ? "Cobranças reativadas" : "Cobranças suspensas");
      setOpen(false);
      setReason("");
    }
  });

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className={cn(
          "h-8 rounded-full text-[10px] font-bold uppercase tracking-widest px-4",
          isSuspended ? "hover:bg-emerald-500/10 hover:text-emerald-500" : "hover:bg-amber-500/10 hover:text-amber-500"
        )}
        onClick={() => setOpen(true)}
      >
        {isSuspended ? "Reativar cobranças" : "Suspender cobranças"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isSuspended ? "Reativar cobranças?" : "Suspender cobranças?"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-foreground/60 leading-relaxed">
              {isSuspended 
                ? "Os lançamentos financeiros deste cliente voltarão a participar dos recebíveis operacionais e indicadores globais."
                : "Os lançamentos deste cliente não serão excluídos nem cancelados. Eles continuarão no histórico financeiro, mas deixarão de ser considerados nos recebíveis operacionais."}
            </p>
            
            {!isSuspended && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono-kasa uppercase text-foreground/40 font-bold">Motivo da suspensão (opcional)</label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cliente inadimplente">Cliente inadimplente</SelectItem>
                    <SelectItem value="Cliente não responde">Cliente não responde</SelectItem>
                    <SelectItem value="Cobrança interrompida">Cobrança interrompida</SelectItem>
                    <SelectItem value="Contrato encerrado">Contrato encerrado</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button 
              className={cn("rounded-xl", isSuspended ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600")}
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Processando..." : (isSuspended ? "Reativar cobranças" : "Suspender cobranças")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

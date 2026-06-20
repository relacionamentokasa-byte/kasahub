import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { 
  ArrowLeft, Mail, Phone, Building2, 
  Wallet, FileText, FolderKanban, Activity, 
  TrendingUp, Handshake, CheckSquare, Loader2,
  FileSignature, Sparkles, Link as LinkIcon, Plus, Rocket
} from "lucide-react";
import { ClientOnboardingPanel } from "@/components/onboarding/ClientOnboardingPanel";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { JobsBoard } from "@/components/jobs/JobsBoard";
import { ClientTimeline } from "@/components/clients/ClientTimeline";
import { ClientKpiHeader } from "@/components/clients/ClientKpiHeader";
import { ClientUnifiedTimeline, buildUnifiedEvents } from "@/components/clients/ClientUnifiedTimeline";
import { ClientServicesManager } from "@/components/clients/ClientServicesManager";
import { brl } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { fetchProposals } from "@/lib/crm-api";
import { fetchTransactions, fetchContracts } from "@/lib/finance-api";
import { fetchProjects, fetchExtraDemands, getDmePublicUrl } from "@/lib/ops-api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


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

  const { data: transactions = [] } = useQuery({ 
    queryKey: ["client-transactions", clientId], 
    queryFn: () => fetchTransactions({ clientId }),
    enabled: !!client
  });

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


  if (clientLoading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] space-y-4">
      <div className="relative">
        <Loader2 className="size-12 animate-spin text-primary/20" />
        <Building2 className="size-6 text-primary/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-bold font-mono-kasa uppercase tracking-widest animate-pulse text-primary/60">Carregando Perfil</p>
        <p className="text-[10px] text-foreground/30 font-medium">Sincronizando dados 360 do cliente...</p>
      </div>
    </div>
  );

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
    .filter(t => t.type === "income" && t.status === "pending")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const todayIso = new Date().toISOString().slice(0, 10);
  const mrr = contracts
    .filter((c: any) => c.status === "active")
    .reduce((sum: number, c: any) => sum + Number(c.monthly_value || 0), 0);
  const overdueIncomeCount = transactions.filter(
    (t: any) => (t.type === "income" || t.kind === "income") && t.status === "pending" && t.due_date && t.due_date < todayIso,
  ).length;
  const paidIncomeCount = transactions.filter((t: any) => (t.type === "income" || t.kind === "income") && t.status === "paid").length;
  const pendingIncomeCount = transactions.filter((t: any) => (t.type === "income" || t.kind === "income") && t.status === "pending").length;
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

  const unifiedEvents = useMemo(
    () => buildUnifiedEvents({ proposals, contracts, projects, jobs, dmes, transactions, onboardings }),
    [proposals, contracts, projects, jobs, dmes, transactions, onboardings],
  );



  return (
    <div className="flex flex-col h-full bg-background/50 animate-reveal">
      {/* Header / Resumo Rápido */}
      <div className="px-6 lg:px-10 pt-8 pb-6 border-b border-border bg-surface">
        <div className="max-w-[1600px] mx-auto">
          <Link to="/clientes" className="inline-flex items-center gap-2 text-xs text-foreground/40 hover:text-primary transition-colors mb-6 group">
            <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" /> Voltar para lista
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="size-16 lg:size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl lg:text-3xl font-bold shadow-sm">
                {client?.logo_url ? (
                  <img src={client?.logo_url} alt={client?.name} className="size-full object-cover rounded-2xl" />
                ) : (
                  (client?.company || client?.name)?.[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-words">
                    {client?.company || client?.name}
                  </h1>
                  <Badge variant="outline" className={`rounded-full uppercase tracking-widest text-[10px] border-2 ${
                    client?.status === 'active' ? 'border-green-500/20 text-green-500 bg-green-500/5' : 
                    client?.status === 'paused' ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' : 
                    'border-foreground/10 text-foreground/40'
                  }`}>
                    {client?.status === 'active' ? 'Ativo' : client?.status === 'paused' ? 'Pausado' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-foreground/50 font-medium">
                  {client?.email && <span className="inline-flex items-center gap-2"><Mail className="size-3.5 text-primary/40" />{client?.email}</span>}
                  {client?.phone && <span className="inline-flex items-center gap-2"><Phone className="size-3.5 text-primary/40" />{client?.phone}</span>}
                  {client?.document && <span className="inline-flex items-center gap-2"><Building2 className="size-3.5 text-primary/40" />{client?.document}</span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block border-r border-border pr-5">
                 <p className="text-[10px] font-mono-kasa uppercase text-foreground/30 leading-none">Receita Total</p>
                 <p className="text-lg font-bold text-emerald-500 mt-1">{brl(totalRevenue)}</p>
               </div>
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-mono-kasa uppercase text-foreground/30 leading-none">A Receber</p>
                 <p className="text-lg font-bold text-blue-500 mt-1">{brl(pendingRevenue)}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação 360 */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <div className="bg-surface border-b border-border sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
            <TabsList className="bg-transparent border-0 h-auto p-0 gap-8 overflow-x-auto justify-start no-scrollbar">
              {[
                { v: "overview", label: "Resumo", icon: Activity },
                { v: "contratos", label: "Contratos", icon: FileSignature },
                { v: "propostas", label: "Propostas", icon: FileText },
                { v: "projetos", label: "Projetos", icon: FolderKanban },
                { v: "jobs", label: "Jobs", icon: CheckSquare },
                { v: "financeiro", label: "Financeiro", icon: Wallet },
                { v: "dmes", label: "Demandas Extras", icon: Sparkles },
                { v: "servicos", label: "Serviços", icon: Handshake },
                { v: "onboarding", label: "Onboarding", icon: Rocket },
                { v: "timeline", label: "Linha do Tempo", icon: TrendingUp },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.v}
                  value={tab.v}
                  className="relative data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-0 py-5 text-xs font-bold uppercase tracking-widest gap-2 transition-all hover:text-foreground/80"
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                  {tab.v === "contratos" && contracts.length > 0 && (
                    <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white">
                      {contracts.length}
                    </span>
                  )}
                  {tab.v === "propostas" && proposals.filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status)).length > 0 && (
                    <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                      {proposals.filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status)).length}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8">
            
            {/* Conteúdo: Resumo */}
            <TabsContent value="overview" className="m-0 space-y-8 animate-reveal">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickStatCard title="Propostas" value={proposals.filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status)).length} icon={FileText} color="text-amber-500" />
                <QuickStatCard title="Contratos Ativos" value={contracts.filter(c => c.status === 'active').length} icon={FileSignature} color="text-emerald-500" />
                <QuickStatCard title="Projetos Ativos" value={projects.filter(p => p.status === 'active').length} icon={FolderKanban} color="text-purple-500" />
                <QuickStatCard title="Receita Paga" value={brl(totalRevenue)} icon={Wallet} color="text-emerald-500" isText />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-surface border-border overflow-hidden">
                  <CardHeader className="border-b border-border bg-muted/20">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <FolderKanban className="size-4 text-primary" /> Projetos em Andamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {projects.slice(0, 5).map(project => (
                        <div key={project.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{project.name}</p>
                            <p className="text-[10px] text-foreground/40 font-mono-kasa uppercase mt-0.5">Criado em {new Date(project.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline" className="rounded-full text-[9px] uppercase tracking-tighter">
                            {project.status}
                          </Badge>
                        </div>
                      ))}
                      {projects.length === 0 && <p className="text-sm text-foreground/30 italic text-center py-12">Nenhum projeto vinculado.</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-surface border-border overflow-hidden flex flex-col">
                  <CardHeader className="border-b border-border bg-muted/20">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" /> Histórico Recente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 overflow-y-auto">
                    <ClientTimeline clientId={clientId} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Conteúdo: Contratos (Propostas Aprovadas) */}
            <TabsContent value="contratos" className="m-0 space-y-6 animate-reveal">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contracts.map(contract => (
                  <Card key={contract.id} className="bg-surface border-border hover:border-primary/40 transition-all group">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className={cn(
                          "rounded-full text-[9px] uppercase tracking-wider",
                          contract.status === 'active' ? "border-green-500/20 text-green-500 bg-green-500/5" : "text-foreground/40"
                        )}>
                          {contract.status === 'active' ? 'Contrato Ativo' : contract.status}
                        </Badge>
                        <FileSignature className="size-4 text-foreground/20 group-hover:text-primary transition-colors" />
                      </div>
                      <h4 className="font-bold text-sm mb-1">{contract.title}</h4>
                      <p className="text-[10px] text-foreground/40 font-mono-kasa uppercase mb-4">Início: {new Date(contract.start_date).toLocaleDateString()}</p>
                      
                      <div className="space-y-3 pt-4 border-t border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase text-foreground/40 font-medium tracking-wider">Fee Mensal (MRR)</span>
                          <span className="text-xs font-bold text-emerald-500">{brl(Number(contract.monthly_value))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase text-foreground/40 font-medium tracking-wider">Duração</span>
                          <span className="text-xs font-bold">{(contract as any).installments_count ? `${(contract as any).installments_count} meses` : 'Recorrente'}</span>
                        </div>
                        
                        <Button asChild variant="outline" size="sm" className="w-full mt-2 rounded-xl text-[10px] uppercase font-bold tracking-widest gap-2 h-9">
                          <Link to={`/propostas/${contract.proposal_id}`}>
                            <FileText className="size-3" /> Detalhes do Contrato
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {contracts.length === 0 && (
                  <div className="col-span-full h-48 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-foreground/30 space-y-3">
                    <FileSignature className="size-8 opacity-20" />
                    <div className="text-center">
                      <p className="text-sm font-bold">Nenhum contrato ativo</p>
                      <p className="text-[10px] uppercase mt-1">Aprove uma proposta para gerar o contrato</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Conteúdo: Propostas */}
            <TabsContent value="propostas" className="m-0 animate-reveal">
               <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                 <Table>
                   <TableHeader className="bg-muted/30">
                     <TableRow>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4">Proposta</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4">Data</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4 text-right">Valor Total</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4 text-center">Status</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4 text-center">Ação</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {proposals
                       .filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status))
                       .map(p => (
                        <TableRow key={p.id} className="group">
                          <TableCell className="font-medium text-sm py-4">{p.title}</TableCell>
                          <TableCell className="text-xs text-foreground/40 py-4">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right text-sm py-4">{brl(p.total || 0)}</TableCell>
                          <TableCell className="text-center py-4">
                            <Badge variant="outline" className={cn(
                              "rounded-full text-[9px] uppercase tracking-widest",
                              p.status === 'draft' ? "border-amber-500/20 text-amber-500 bg-amber-500/5" : "border-foreground/10 text-foreground/40"
                            )}>
                              {p.status === 'draft' ? 'Rascunho' : p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-4">
                             <Button asChild variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest rounded-lg">
                               <Link to={`/propostas/${p.id}`}>Editar</Link>
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                     {proposals.filter(p => ['Rascunho', 'Enviada', 'Aguardando Assinatura', 'draft', 'sent', 'waiting_signature'].includes(p.status)).length === 0 && (
                       <TableRow>
                         <TableCell colSpan={5} className="h-32 text-center text-foreground/30 italic">
                           <div className="flex flex-col items-center gap-2">
                             <FileText className="size-5 opacity-20" />
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

            {/* Conteúdo: Financeiro */}
            <TabsContent value="financeiro" className="m-0 animate-reveal">
               <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                 <Table>
                   <TableHeader className="bg-muted/30">
                     <TableRow>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4">Vencimento</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4">Descrição</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4 text-right">Valor</TableHead>
                       <TableHead className="font-mono-kasa text-[10px] uppercase py-4 text-center">Status</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {transactions.map(t => (
                       <TableRow key={t.id}>
                         <TableCell className="text-sm py-4">{new Date(t.due_date).toLocaleDateString()}</TableCell>
                         <TableCell className="font-medium text-sm py-4">{t.description}</TableCell>
                         <TableCell className={`text-right text-sm py-4 font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                           {t.type === 'income' ? '+' : '-'} {brl(Number(t.amount))}
                         </TableCell>
                         <TableCell className="text-center py-4">
                           <Badge variant="outline" className={`rounded-full text-[10px] uppercase tracking-widest ${t.status === 'paid' ? 'border-emerald-500/20 text-green-500 bg-green-500/5' : 'text-foreground/40'}`}>
                             {t.status === 'paid' ? 'Liquidado' : t.status}
                           </Badge>
                         </TableCell>
                       </TableRow>
                     ))}
                     {transactions.length === 0 && <TableRow><TableCell colSpan={4} className="h-32 text-center text-foreground/30 italic">Nenhum lançamento financeiro.</TableCell></TableRow>}
                   </TableBody>
                 </Table>
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


            <TabsContent value="timeline" className="m-0 animate-reveal">
              <div className="max-w-3xl">
                <ClientTimeline clientId={clientId} />
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function QuickStatCard({ title, value, icon: Icon, color, isText = false }: { title: string, value: any, icon: any, color: string, isText?: boolean }) {
  return (
    <Card className="bg-surface border-border shadow-sm hover:border-primary/20 transition-colors">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`size-10 rounded-xl bg-background border border-border flex items-center justify-center ${color}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[10px] font-mono-kasa uppercase text-foreground/30 leading-none mb-1">{title}</p>
          <h3 className="text-xl font-bold tracking-tight">{value}</h3>
        </div>
      </CardContent>
    </Card>
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
        <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
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

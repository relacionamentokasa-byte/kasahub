import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Compass,
  LayoutGrid,
  Plus,
  Target,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientStrategicMap } from "@/components/clients/ClientStrategicMap";
import { StorageImage } from "@/components/ui/storage-image";
import { fetchClients, fetchProjects } from "@/lib/ops-api";
import {
  createStrategicPlan,
  fetchStrategicMap,
  getPlanningRange,
  planningMonthsInRange,
  strategicActionJobForMonth,
  strategicMapQueryKey,
  type StrategicActionJob,
  type StrategicNode,
} from "@/lib/strategic-plans-api";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Client = {
  id: string;
  name: string | null;
  company: string | null;
  logo_url?: string | null;
  status?: string | null;
};

type StrategicJob = {
  id: string;
  title: string;
  status?: string | null;
  done_at?: string | null;
  project_id?: string | null;
};

type WorkspaceProps = {
  clientId?: string;
  onClientChange: (clientId?: string) => void;
};

type MonthlyFocus = {
  nodeId: string;
  planningMonth: string;
};

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function clientLabel(client: Client) {
  return client.company?.trim() || client.name?.trim() || "Cliente sem nome";
}

function planningMonths(node: StrategicNode) {
  return planningMonthsInRange(node.metadata);
}

function planningMonth(node: StrategicNode) {
  return getPlanningRange(node.metadata)?.start ?? null;
}

function formatPlanningRange(node: StrategicNode) {
  const range = getPlanningRange(node.metadata);
  if (!range) return "Período não definido";
  const format = (value: string) => new Date(`${value}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return range.start === range.end ? format(range.start) : `${format(range.start)} até ${format(range.end)}`;
}

function actionExecution(
  node: StrategicNode,
  planningMonth: string,
  jobs: StrategicJob[],
  projects: Array<{ id: string; name: string }>,
  actionJobs: StrategicActionJob[],
) {
  const monthlyExecution = strategicActionJobForMonth(node, planningMonth, actionJobs);
  const project = monthlyExecution?.project_id
    ? projects.find((item) => item.id === monthlyExecution.project_id)
    : null;
  const projectJobs = project ? jobs.filter((item) => item.project_id === project.id) : [];
  const job = monthlyExecution?.job_id ? jobs.find((item) => item.id === monthlyExecution.job_id) : null;

  if (project) {
    const completed = projectJobs.filter((item) => item.done_at || item.status === "done" || item.status === "completed").length;
    const inProgress = projectJobs.some((item) => item.status === "in_progress");
    return {
      detail: `${project.name} · ${projectJobs.length} ${projectJobs.length === 1 ? "entrega" : "entregas"}`,
      status: projectJobs.length > 0 && completed === projectJobs.length ? "Concluído" : inProgress ? "Em andamento" : "Planejado",
      className: projectJobs.length > 0 && completed === projectJobs.length
        ? "text-emerald-700 dark:text-emerald-300"
        : inProgress
          ? "text-amber-700 dark:text-amber-300"
          : "text-muted-foreground",
    };
  }

  if (job) {
    const status = job.done_at || job.status === "done" || job.status === "completed"
      ? "Concluído"
      : job.status === "in_progress" ? "Em andamento" : "Planejado";
    return { detail: `Job: ${job.title}`, status, className: "text-muted-foreground" };
  }

  return { detail: null, status: "Sem execução", className: "text-muted-foreground" };
}

export function StrategicMapWorkspace({ clientId, onClientChange }: WorkspaceProps) {
  const queryClient = useQueryClient();
  const [clientSearch, setClientSearch] = useState("");
  const [monthlyFocus, setMonthlyFocus] = useState<MonthlyFocus | null>(null);

  const focusMonthlyAction = (nodeId: string, planningMonth: string) => {
    setMonthlyFocus({ nodeId, planningMonth });
    requestAnimationFrame(() => {
      document.getElementById("strategic-map-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const clearMonthlyFocus = () => setMonthlyFocus(null);

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
    staleTime: 5 * 60 * 1000,
  });
  const clients = ((clientsQuery.data ?? []) as Client[]).filter((client) => client.status === "active");
  const selectedClient = clients.find((client) => client.id === clientId);
  const visibleClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients.slice(0, 12);
    return clients
      .filter((client) => `${client.company ?? ""} ${client.name ?? ""}`.toLowerCase().includes(query))
      .slice(0, 12);
  }, [clients, clientSearch]);

  const selectedClientIsInactive = Boolean(clientId) && !selectedClient && !clientsQuery.isLoading;

  const mapQuery = useQuery({
    queryKey: clientId ? strategicMapQueryKey(clientId) : ["strategic-map", "empty"],
    queryFn: () => fetchStrategicMap(clientId!),
    enabled: !!clientId,
  });
  const projectsQuery = useQuery({
    queryKey: ["strategic-projects", clientId],
    queryFn: () => fetchProjects({ clientId: clientId! }),
    enabled: !!clientId,
  });
  const jobsQuery = useQuery({
    queryKey: ["strategic-jobs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, done_at, project_id, client_id")
        .eq("client_id", clientId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

  const createPlanMutation = useMutation({
    mutationFn: () => createStrategicPlan({ client_id: clientId!, title: "Plano estratégico", main_goal: "" }),
    onSuccess: (plan) => {
      queryClient.setQueryData(strategicMapQueryKey(clientId!), { plan, nodes: [], edges: [], actionJobs: [] });
      toast.success("Plano estratégico iniciado");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o plano"),
  });

  const map = mapQuery.data;
  const nodes = map?.nodes ?? [];
  const actionJobs = map?.actionJobs ?? [];
  const actions = nodes.filter((node) => node.type === "action");
  const scheduledActions = actions.filter((node) => planningMonths(node).length > 0);
  const unscheduledActions = actions.filter((node) => planningMonths(node).length === 0);
  const objective = nodes.find((node) => node.type === "objective");
  const directions = nodes.filter((node) => node.type === "direction");
  const currentYear = new Date().getFullYear();
  const actionYear = planningMonth(actions[0] ?? ({} as StrategicNode))?.slice(0, 4) ?? String(currentYear);

  if (!clientId) {
    return (
      <div className="min-h-[calc(100vh-7rem)] space-y-8 px-4 py-6 sm:px-6 lg:px-10">
        <header className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono-kasa uppercase tracking-[0.16em] text-primary">
            <Compass className="size-3.5" /> Estratégia · Carteira
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">Pare de começar pelo job.</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Escolha um cliente para entender o destino, decidir as direções e transformar prioridades em trabalho visível para toda a equipe.
          </p>
        </header>

        <Card className="max-w-3xl border-border/70 bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><UserRound className="size-5" /></div>
            <div><h2 className="font-display text-lg font-semibold">Em qual cliente vamos pensar?</h2><p className="text-xs text-muted-foreground">A seleção fica no link para você voltar direto a este plano.</p></div>
          </div>
          <Input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Buscar cliente ou empresa..." className="mb-3" />
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleClients.map((client) => (
              <button key={client.id} type="button" onClick={() => onClientChange(client.id)} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5">
                <ClientAvatar client={client} size="size-9" />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{clientLabel(client)}</span><span className="block text-[10px] text-muted-foreground">{client.status === "active" ? "Cliente ativo" : "Carteira"}</span></span>
                <ArrowRight className="ml-auto size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          {clientsQuery.isLoading && <p className="py-6 text-center text-xs text-muted-foreground">Carregando clientes...</p>}
          {!clientsQuery.isLoading && visibleClients.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nenhum cliente encontrado.</p>}
        </Card>
      </div>
    );
  }

  if (selectedClientIsInactive) {
    return (
      <div className="m-6 max-w-xl rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <p className="text-sm font-medium">Este cliente não está ativo.</p>
        <p className="mt-1 text-xs text-muted-foreground">A central estratégica mostra somente a carteira ativa.</p>
        <Button className="mt-4" variant="outline" onClick={() => onClientChange(undefined)}>Escolher cliente ativo</Button>
      </div>
    );
  }

  if (!selectedClient) {
    return <div className="p-8 text-sm text-destructive">Cliente não encontrado. Escolha outro cliente para abrir a estratégia.</div>;
  }

  if (mapQuery.isLoading || projectsQuery.isLoading || jobsQuery.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Abrindo sala de estratégia...</div>;
  }

  if (mapQuery.error) {
    return <div className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{mapQuery.error instanceof Error ? mapQuery.error.message : "Não foi possível carregar o plano estratégico."}</div>;
  }

  if (!map?.plan) {
    return (
      <div className="min-h-[calc(100vh-7rem)] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-border/70 bg-card p-8 shadow-sm sm:p-12">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Compass className="size-6" /></div>
          <p className="mb-2 text-[10px] font-mono-kasa uppercase tracking-[0.16em] text-primary">Cliente em foco · {clientLabel(selectedClient)}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Ainda não existe um plano para este cliente.</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Crie o espaço onde a equipe vai registrar o objetivo, organizar escolhas e transformar o que importa em ações no ano.</p>
          <div className="mt-7 flex flex-wrap gap-2"><Button onClick={() => createPlanMutation.mutate()} disabled={createPlanMutation.isPending}><Plus className="mr-2 size-4" /> Iniciar planejamento</Button><Button asChild variant="outline"><Link to="/clientes/$clientId" params={{ clientId }}><ArrowRight className="mr-2 size-4" /> Ver cliente 360</Link></Button></div>
        </div>
      </div>
    );
  }

  const year = Number(actionYear);
  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() + 1 : null;
  return (
    <div className="min-h-[calc(100vh-7rem)] space-y-5 px-4 py-5 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-5 border-b border-border/60 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-kasa uppercase tracking-[0.15em] text-primary"><Compass className="size-3.5" /> Sala de estratégia <span className="text-muted-foreground">/</span> {clientLabel(selectedClient)}</div>
          <div className="flex items-center gap-3"><ClientAvatar client={selectedClient} size="size-12" /><h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">O que precisa acontecer para este cliente avançar?</h1></div>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Aqui a equipe decide antes de executar. O mapa organiza o pensamento; o grid mostra o trabalho que ganhou prioridade.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link to="/clientes/$clientId" params={{ clientId }}><UserRound className="mr-1.5 size-3.5" /> Cliente 360</Link></Button><Button asChild variant="outline" size="sm"><Link to="/jobs" search={{ clientId } as any}><LayoutGrid className="mr-1.5 size-3.5" /> Jobs deste cliente</Link></Button></div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Objetivo definido" value={objective ? "Sim" : "Ainda não"} icon={Target} tone={objective ? "text-blue-600" : "text-amber-600"} />
        <Metric label="Direções escolhidas" value={String(directions.length)} icon={ArrowRight} tone="text-orange-600" />
        <Metric label="Ações no ano" value={String(scheduledActions.length)} icon={CalendarDays} tone="text-teal-600" />
        <Metric label="Sem período" value={String(unscheduledActions.length)} icon={Check} tone={unscheduledActions.length ? "text-amber-600" : "text-muted-foreground"} />
      </div>

      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><h2 className="font-display text-xl font-semibold">Roadmap estratégico</h2><Badge variant="outline">{year}</Badge></div><p className="mt-1 max-w-2xl text-xs text-muted-foreground">A duração mostra a intenção. Cada ponto abaixo mostra o que foi ou não executado naquele mês.</p></div><ClientPicker clients={clients} selectedClient={selectedClient} onChange={onClientChange} /></div>
        <div className="overflow-x-auto pb-3">
          <div className="min-w-[1500px]">
            <div className="grid grid-cols-[260px_repeat(12,minmax(100px,1fr))] gap-x-2 border-b border-border/60 pb-2">
              <div className="flex items-end px-2 text-[9px] font-mono-kasa uppercase tracking-[0.16em] text-muted-foreground">Ações prioritárias</div>
              {monthNames.map((month, index) => { const monthNumber = index + 1; const isCurrentMonth = currentMonth === monthNumber; return <div key={month} className={cn("relative px-2 text-center", isCurrentMonth && "text-primary")}><span className="text-[10px] font-semibold">{month.slice(0, 3)}</span><span className="mt-0.5 block text-[9px] font-mono-kasa text-muted-foreground">{String(monthNumber).padStart(2, "0")}</span>{isCurrentMonth && <span className="absolute -bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />}</div>; })}
            </div>
            <div className="mb-3 grid grid-cols-[260px_repeat(12,minmax(100px,1fr))] gap-x-2 pt-2 text-[8px] font-mono-kasa uppercase tracking-[0.16em] text-muted-foreground/70"><div /><div className="col-span-3 border-l border-border/40 pl-2">1º trimestre</div><div className="col-span-3 border-l border-border/40 pl-2">2º trimestre</div><div className="col-span-3 border-l border-border/40 pl-2">3º trimestre</div><div className="col-span-3 border-l border-border/40 pl-2">4º trimestre</div></div>
            <div className="space-y-3">
              {scheduledActions.length ? scheduledActions.map((node) => <div key={node.id} className="grid grid-cols-[260px_repeat(12,minmax(100px,1fr))] gap-x-2 rounded-xl border border-border/50 bg-muted/[0.12] p-2">
                <div className="flex min-w-0 flex-col justify-center px-2"><span className="mb-1 flex items-center gap-1.5 text-[8px] font-mono-kasa uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300"><span className="size-1.5 rounded-full bg-teal-500" /> Movimento estratégico</span><p className="break-words text-[13px] font-semibold leading-snug text-foreground">{node.title}</p><p className="mt-1 text-[9px] text-muted-foreground">{formatPlanningRange(node)}</p></div>
                {Array.from({ length: 12 }, (_, index) => { const planningMonth = `${year}-${String(index + 1).padStart(2, "0")}`; const inRange = planningMonths(node).includes(planningMonth); const execution = actionExecution(node, planningMonth, (jobsQuery.data ?? []) as StrategicJob[], (projectsQuery.data ?? []) as Array<{ id: string; name: string }>, actionJobs); const isFocused = monthlyFocus?.nodeId === node.id && monthlyFocus.planningMonth === planningMonth; return <div key={planningMonth} className={cn("relative flex min-h-[92px] items-center justify-center border-l border-border/35 px-1", inRange && "bg-teal-500/[0.035]")}><span className={cn("absolute inset-y-1 left-0 w-px", inRange ? "bg-teal-500/45" : "bg-border/25")} />{inRange ? <button type="button" onClick={() => focusMonthlyAction(node.id, planningMonth)} className={cn("group relative z-[1] flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors hover:bg-teal-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", isFocused && "bg-primary/10 ring-2 ring-primary/40")}><span className={cn("flex size-7 items-center justify-center rounded-full border-2 bg-background text-[9px] font-bold", execution.detail ? execution.status === "Concluído" ? "border-emerald-500 text-emerald-600" : execution.status === "Em andamento" ? "border-amber-500 text-amber-600" : "border-teal-500 text-teal-600" : "border-dashed border-muted-foreground/40 text-muted-foreground/50")}>{execution.detail ? <Check className="size-3" /> : <span>·</span>}</span><span className="max-w-[92px] break-words text-[9px] leading-tight text-muted-foreground group-hover:text-foreground">{execution.detail ? execution.detail.replace(/^Job: /, "") : "Adicionar job"}</span></button> : <span className="size-1 rounded-full bg-border/50" />}</div>; })}
              </div>) : <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma ação com período definido ainda. Use o mapa para criar o primeiro movimento.</div>}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3"><span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">A definir</span>{unscheduledActions.length ? unscheduledActions.map((node) => <span key={node.id} className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-[10px]">{node.title}</span>) : <span className="text-xs text-muted-foreground">Nenhuma ação aguardando data.</span>}</div>
      </section>

      <section id="strategic-map-editor" className="rounded-xl border border-border/70 bg-muted/10 p-3 sm:p-5"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-mono-kasa uppercase tracking-[0.15em] text-primary">Pensar e conectar</p><h2 className="font-display text-xl font-semibold">Mapa do cliente</h2></div><Badge variant="outline">{nodes.length} elementos</Badge></div><ClientStrategicMap clientId={clientId} clientName={clientLabel(selectedClient)} projects={(projectsQuery.data ?? []) as any} jobs={(jobsQuery.data ?? []) as any} showPlanningGrid={false} monthlyFocus={monthlyFocus} onMonthlyFocusHandled={clearMonthlyFocus} /></section>
    </div>
  );
}

function ClientAvatar({ client, size }: { client: Client; size: string }) {
  const label = clientLabel(client);
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted text-xs font-semibold", size)}>
      {client.logo_url ? <StorageImage src={client.logo_url} alt={label} className="size-full object-cover" /> : label.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Target; tone: string }) {
  return <Card className="flex items-center gap-3 border-border/70 p-4"><span className={cn("rounded-lg bg-muted p-2", tone)}><Icon className="size-4" /></span><span><span className="block text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">{label}</span><strong className="mt-1 block font-display text-xl">{value}</strong></span></Card>;
}

function ClientPicker({ clients, selectedClient, onChange }: { clients: Client[]; selectedClient: Client; onChange: (id: string) => void }) {
  return <select aria-label="Cliente em foco" value={selectedClient.id} onChange={(event) => onChange(event.target.value)} className="h-9 max-w-full rounded-md border border-input bg-background px-2 text-xs font-medium sm:w-56"><option value={selectedClient.id}>{clientLabel(selectedClient)}</option>{clients.filter((client) => client.id !== selectedClient.id).map((client) => <option key={client.id} value={client.id}>{clientLabel(client)}</option>)}</select>;
}

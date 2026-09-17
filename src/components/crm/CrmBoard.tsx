import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import {
  Plus,
  Search,
  MessageCircle,
  Trash2,
  LayoutGrid,
  Filter as FunnelIcon,
  FileText,
} from "lucide-react";
import {
  fetchStages,
  fetchLeads,
  moveLead,
  deleteLead,
  deleteLeadStage,
  formatCurrency,
  markLeadAsWon,
  markLeadAsLost,
  convertLeadToClient,
  type Lead,
  type Stage,
} from "@/lib/crm-api";
import { fetchProfiles } from "@/lib/profile-api";
import { fetchOpenTaskCounts, fetchNextTasksByLead, type NextLeadTask } from "@/lib/lead-tasks-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewLeadDialog } from "./NewLeadDialog";
import { LeadSheet } from "./LeadSheet";
import { CrmFunnel } from "./CrmFunnel";
import { LostLeadDialog } from "./LostLeadDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

type View = "kanban" | "funnel";
type StatusFilter = "all" | "stalled" | "with_tasks" | "overdue";

export function CrmBoard() {
  const qc = useQueryClient();
  const { data: stages = [] } = useQuery({ queryKey: ["crm", "stages"], queryFn: fetchStages });
  const { data: leads = [] } = useQuery({ queryKey: ["crm", "leads"], queryFn: fetchLeads });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const { data: taskCounts = {} } = useQuery({
    queryKey: ["crm", "task-counts"],
    queryFn: fetchOpenTaskCounts,
  });
  const { data: nextTasks = {} } = useQuery({
    queryKey: ["crm", "next-tasks"],
    queryFn: fetchNextTasksByLead,
  });

  const [view, setView] = useState<View>("kanban");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [newLeadStage, setNewLeadStage] = useState<Stage | null>(null);
  const [lostDialogLead, setLostDialogLead] = useState<Lead | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const wonStage = stages.find((s) => s.is_won);
  const lostStage = stages.find((s) => s.is_lost);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.source) set.add(l.source);
    return Array.from(set).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = leads;

    if (ownerFilter !== "all") {
      list = list.filter((l) =>
        ownerFilter === "unassigned" ? !l.owner_id : l.owner_id === ownerFilter,
      );
    }
    if (sourceFilter !== "all") {
      list = list.filter((l) => (l.source ?? "") === sourceFilter);
    }

    if (statusFilter === "stalled") {
      list = list.filter((l) => daysBetween(l.updated_at || l.created_at) >= 5);
    } else if (statusFilter === "with_tasks") {
      list = list.filter((l) => (taskCounts[l.id] ?? 0) > 0);
    } else if (statusFilter === "overdue") {
      list = list.filter((l) => {
        const nt = nextTasks[l.id];
        if (!nt?.due_date) return false;
        return new Date(nt.due_date).getTime() < Date.now();
      });
    }

    if (!q) return list;
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q),
    );
  }, [leads, query, ownerFilter, sourceFilter, statusFilter, taskCounts, nextTasks]);

  const byStage = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const s of stages) m.set(s.id, []);
    for (const l of filtered) {
      if (l.stage_id && m.has(l.stage_id)) m.get(l.stage_id)!.push(l);
    }
    return m;
  }, [stages, filtered]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonStages = new Set(stages.filter((s) => s.is_won).map((s) => s.id));
    const lostStages = new Set(stages.filter((s) => s.is_lost).map((s) => s.id));
    const monthLeads = leads.filter((l) => new Date(l.created_at) >= start);
    const wonAll = leads.filter((l) => l.stage_id && wonStages.has(l.stage_id));
    const wonMonth = wonAll.filter((l) => l.won_at && new Date(l.won_at) >= start);
    const wonValueMonth = wonMonth.reduce((a, l) => a + Number(l.value), 0);
    const pipelineLeads = leads.filter((l) => l.stage_id && !wonStages.has(l.stage_id) && !lostStages.has(l.stage_id));
    const pipelineValue = pipelineLeads.reduce((a, l) => a + Number(l.value), 0);
    const finishedLeads = leads.filter((l) => l.stage_id && (wonStages.has(l.stage_id) || lostStages.has(l.stage_id)));
    const convRate =
      finishedLeads.length > 0 ? Math.round((wonAll.length / finishedLeads.length) * 100) : (leads.length > 0 ? Math.round((wonAll.length / leads.length) * 100) : 0);
    const stalledCount = pipelineLeads.filter((l) => daysBetween(l.updated_at || l.created_at) >= 5).length;

    return {
      monthLeads: monthLeads.length,
      totalActive: pipelineLeads.length,
      convRate,
      wonValueMonth,
      pipelineValue,
      stalledCount,
    };
  }, [leads, stages]);

  const moveMut = useMutation({
    mutationFn: async ({ id, stageId, stage }: { id: string; stageId: string; stage: Stage }) => {
      const extras = stage.is_won ? { won_at: new Date().toISOString() } : { won_at: null };
      return moveLead(id, stageId, extras);
    },
    onMutate: async ({ id, stageId }) => {
      await qc.cancelQueries({ queryKey: ["crm", "leads"] });
      const prev = qc.getQueryData<Lead[]>(["crm", "leads"]);
      qc.setQueryData<Lead[]>(["crm", "leads"], (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, stage_id: stageId } : l)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["crm", "leads"], ctx.prev);
      toast.error("Não foi possível mover a oportunidade");
    },
    onSuccess: (_, { stage }) => {
      if (stage.is_won) toast.success("🎉 Oportunidade fechada! Gere a proposta na aba Propostas.");
    },
  });

  const winMut = useMutation({
    mutationFn: (leadId: string) => {
      if (!wonStage) throw new Error("Nenhuma etapa de Ganho configurada");
      return markLeadAsWon(leadId, wonStage.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("🎉 Oportunidade ganha com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loseMut = useMutation({
    mutationFn: ({ leadId, reason }: { leadId: string; reason: string }) => {
      if (!lostStage) throw new Error("Nenhuma etapa de Perda configurada");
      return markLeadAsLost(leadId, lostStage.id, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      setLostDialogLead(null);
      toast.info("Oportunidade marcada como perdida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    const id = String(e.active.id);
    if (!overId) return;
    const stage = stages.find((s) => s.id === overId);
    const lead = leads.find((l) => l.id === id);
    if (!stage || !lead || lead.stage_id === overId) return;
    moveMut.mutate({ id, stageId: overId, stage });
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-4 flex flex-col gap-3.5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-widest font-semibold">
              Pipeline Comercial
            </span>
            <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mt-0.5">
              Oportunidades
            </h1>
          </div>

          <div className="flex bg-muted/40 border border-border rounded-lg p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                view === "kanban"
                  ? "bg-card text-foreground shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-3" /> <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setView("funnel")}
              className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                view === "funnel"
                  ? "bg-card text-foreground shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FunnelIcon className="size-3" /> <span className="hidden sm:inline">Funil</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar oportunidade…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-8 w-full bg-card border-border rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-card border border-border/80 px-2.5 h-8 rounded-lg shadow-2xs">
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-foreground/80 cursor-pointer font-medium max-w-[120px] truncate"
              >
                <option value="all">Responsável</option>
                <option value="unassigned">Sem responsável</option>
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name || p.full_name || "—"}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden md:flex items-center gap-1.5 bg-card border border-border/80 px-2.5 h-8 rounded-lg shadow-2xs">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-foreground/80 cursor-pointer font-medium"
              >
                <option value="all">Origem (todas)</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={() => setNewLeadStage(stages[0] ?? null)}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium h-8 px-3.5 text-xs gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="size-3.5" /> Nova oportunidade
          </Button>
        </div>
      </div>

      {/* KPIs Grid Compacto 2x2 no Mobile e 4 cols no Desktop */}
      <div className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
            Novas (Mês)
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2 flex-wrap">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {kpis.monthLeads}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa">
              / {kpis.totalActive} ativas
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
            Pipeline em Aberto
          </span>
          <div className="mt-0.5 sm:mt-1 font-mono-kasa text-sm sm:text-xl font-bold text-foreground tabular-nums truncate">
            {formatCurrency(kpis.pipelineValue)}
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
            Ganho no Mês
          </span>
          <div className="mt-0.5 sm:mt-1 font-mono-kasa text-sm sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
            {formatCurrency(kpis.wonValueMonth)}
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
            Conversão
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2 flex-wrap">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {kpis.convRate}%
            </span>
            {kpis.stalledCount > 0 && (
              <span className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 font-mono-kasa font-medium">
                ({kpis.stalledCount} &gt;5d)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="px-4 sm:px-6 lg:px-10 pb-3 flex items-center gap-1.5 border-b border-border/40">
        <button
          onClick={() => setStatusFilter("all")}
          className={cn(
            "h-7 px-2.5 rounded text-xs font-medium transition-colors",
            statusFilter === "all"
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Todas ({leads.length})
        </button>
        <button
          onClick={() => setStatusFilter("stalled")}
          className={cn(
            "h-7 px-2.5 rounded text-xs font-medium transition-colors",
            statusFilter === "stalled"
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Paradas (+5d)
        </button>
        <button
          onClick={() => setStatusFilter("with_tasks")}
          className={cn(
            "h-7 px-2.5 rounded text-xs font-medium transition-colors",
            statusFilter === "with_tasks"
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Com Tarefas
        </button>
        <button
          onClick={() => setStatusFilter("overdue")}
          className={cn(
            "h-7 px-2.5 rounded text-xs font-medium transition-colors",
            statusFilter === "overdue"
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Atrasadas
        </button>

        {(statusFilter !== "all" || ownerFilter !== "all" || sourceFilter !== "all" || query) && (
          <button
            onClick={() => {
              setStatusFilter("all");
              setOwnerFilter("all");
              setSourceFilter("all");
              setQuery("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground ml-auto cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {view === "kanban" ? (
        <div className="flex-1 overflow-x-auto px-4 sm:px-6 lg:px-10 pb-10">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-4 min-w-max h-full">
              {stages.map((stage) => {
                const cards = byStage.get(stage.id) ?? [];
                const total = cards.reduce((acc, l) => acc + Number(l.value), 0);
                return (
                  <Column
                    key={stage.id}
                    stage={stage}
                    total={total}
                    count={cards.length}
                    pipelineTotal={kpis.pipelineValue}
                    onAdd={() => setNewLeadStage(stage)}
                  >
                    {cards.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        stage={stage}
                        dueTasks={taskCounts[lead.id] ?? 0}
                        nextTask={nextTasks[lead.id]}
                        profiles={profiles as any}
                        onClick={() => setOpenLead(lead)}
                        onWin={() => winMut.mutate(lead.id)}
                        onLose={() => setLostDialogLead(lead)}
                      />
                    ))}
                  </Column>
                );
              })}
            </div>
            <DragOverlay>
              {activeLead ? <LeadCardInner lead={activeLead} dragging stage={stages.find((s) => s.id === activeLead.stage_id)} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 px-4 sm:px-6 lg:px-10 pb-10">
          <CrmFunnel stages={stages} leads={filtered} onOpenLead={setOpenLead} />
        </div>
      )}

      {newLeadStage && (
        <NewLeadDialog
          stage={newLeadStage}
          onOpenChange={(o) => !o && setNewLeadStage(null)}
        />
      )}
      <LeadSheet lead={openLead} stages={stages} onClose={() => setOpenLead(null)} />

      {lostDialogLead && (
        <LostLeadDialog
          open={!!lostDialogLead}
          onOpenChange={(o) => !o && setLostDialogLead(null)}
          leadName={lostDialogLead.name}
          onConfirm={(reason) => loseMut.mutate({ leadId: lostDialogLead.id, reason })}
          isLoading={loseMut.isPending}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border/70 rounded-xl px-4 py-3 transition-all duration-150 hover:border-foreground/20">
      <span className="text-[11px] font-medium text-muted-foreground block truncate">
        {label}
      </span>
      <div className="font-mono-kasa font-bold text-lg lg:text-xl text-foreground tabular-nums tracking-tight mt-1">
        {value}
      </div>
    </div>
  );
}

function Column({
  stage,
  total,
  count,
  onAdd,
  children,
}: {
  stage: Stage;
  total: number;
  count: number;
  pipelineTotal?: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const delStageMut = useMutation({
    mutationFn: () => deleteLeadStage(stage.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "stages"] });
      toast.success("Etapa removida");
    },
    onError: (_e: Error) => toast.error("Não é possível excluir uma etapa que contém oportunidades."),
  });

  return (
    <div className="w-[300px] shrink-0 flex flex-col group/col">
      <div className="flex items-center justify-between mb-2.5 px-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-2.5 rounded-full shrink-0 shadow-xs"
            style={{ background: stage.color || "currentColor" }}
          />
          <span className="font-semibold text-xs text-foreground uppercase tracking-wider truncate">
            {stage.name}
          </span>
          <span className="text-[11px] font-mono-kasa font-semibold text-muted-foreground bg-background/80 border border-border/60 px-1.5 py-0.5 rounded-md tabular-nums leading-none">
            {count}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-mono-kasa font-medium text-foreground/80 tabular-nums">
            {formatCurrency(total)}
          </span>
          <button
            onClick={() => {
              if (confirm(`Remover a etapa "${stage.name}"?`)) delStageMut.mutate();
            }}
            className="size-5 rounded hover:bg-destructive/10 grid place-items-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/col:opacity-100 transition"
            aria-label="Excluir etapa"
          >
            <Trash2 className="size-3" />
          </button>
          <button
            onClick={onAdd}
            className="size-5 rounded hover:bg-background border border-transparent hover:border-border/60 grid place-items-center text-muted-foreground hover:text-foreground transition"
            aria-label={`Adicionar em ${stage.name}`}
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border p-2.5 space-y-2.5 transition-colors min-h-[480px] shadow-2xs ${
          isOver
            ? "border-primary/50 bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/10"
            : "border-slate-200/90 dark:border-border/80 bg-slate-100/70 dark:bg-muted/20"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

type ProfileLite = { id: string; display_name?: string | null; full_name?: string | null; avatar_url?: string | null };

function LeadCard({
  lead,
  stage,
  dueTasks = 0,
  nextTask,
  profiles = [],
  onClick,
  onWin,
  onLose,
}: {
  lead: Lead;
  stage: Stage;
  dueTasks?: number;
  nextTask?: NextLeadTask;
  profiles?: ProfileLite[];
  onClick: () => void;
  onWin: () => void;
  onLose: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  const qc = useQueryClient();
  const delMut = useMutation({
    mutationFn: () => deleteLead(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Oportunidade removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={`relative group ${isDragging ? "opacity-30" : ""}`}>
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={onClick}
        className="cursor-grab active:cursor-grabbing"
      >
        <LeadCardInner
          lead={lead}
          dueTasks={dueTasks}
          nextTask={nextTask}
          profiles={profiles}
          stage={stage}
          onWin={!stage.is_won ? onWin : undefined}
          onLose={!stage.is_lost ? onLose : undefined}
        />
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Remover oportunidade "${lead.name}"?`)) delMut.mutate();
        }}
        className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition"
        aria-label="Excluir oportunidade"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function daysBetween(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function formatDueLabel(due: string): { label: string; tone: "overdue" | "today" | "soon" | "later" } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(due);
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diff = Math.round((targetDay.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `atrasada ${Math.abs(diff)}d`, tone: "overdue" };
  if (diff === 0) return { label: "hoje", tone: "today" };
  if (diff === 1) return { label: "amanhã", tone: "soon" };
  if (diff <= 7) return { label: `em ${diff}d`, tone: "soon" };
  return { label: target.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), tone: "later" };
}

const TASK_TYPE_ICON: Record<string, string> = {
  call: "📞",
  whatsapp: "💬",
  email: "✉️",
  meeting: "📅",
  follow_up: "🔁",
  other: "•",
};

function LeadCardInner({
  lead,
  dragging,
  dueTasks = 0,
  nextTask,
  profiles = [],
}: {
  lead: Lead;
  dragging?: boolean;
  dueTasks?: number;
  nextTask?: NextLeadTask;
  profiles?: ProfileLite[];
  stage?: Stage;
  onWin?: () => void;
  onLose?: () => void;
}) {
  const navigate = useNavigate();
  const days = daysBetween(lead.updated_at || lead.created_at);
  const isStalled = days >= 5;

  const responsibleId = nextTask?.assigned_to ?? lead.owner_id ?? null;
  const responsible = responsibleId ? profiles.find((p) => p.id === responsibleId) : null;
  const responsibleName = responsible?.display_name || responsible?.full_name || null;
  const initials = (responsibleName ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const due = nextTask?.due_date ? formatDueLabel(nextTask.due_date) : null;
  const isOverdue = due?.tone === "overdue";

  return (
    <div
      className={cn(
        "bg-card border border-border/90 rounded-xl p-3.5 hover:border-foreground/35 shadow-xs hover:shadow-sm transition-all relative group/card",
        dragging && "shadow-xl rotate-1 scale-[1.02] border-foreground/50",
        isStalled ? "border-amber-500/50 bg-amber-500/[0.03]" : ""
      )}
    >
      {/* Top Header: Title & Value */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-xs text-foreground truncate leading-snug tracking-tight">
            {lead.name}
          </div>
          {lead.company && lead.company !== lead.name && (
            <div className="text-[11px] text-muted-foreground truncate font-normal mt-0.5">
              {lead.company}
            </div>
          )}
        </div>
        {Number(lead.value) > 0 && (
          <span className="font-mono-kasa font-bold text-xs text-foreground tabular-nums shrink-0">
            {formatCurrency(Number(lead.value))}
          </span>
        )}
      </div>

      {/* Lost Reason if present */}
      {lead.lost_reason && (
        <div className="mt-1.5 text-[10px] text-destructive truncate">
          Motivo: {lead.lost_reason}
        </div>
      )}

      {/* Next Step / Follow-up pill */}
      {nextTask && (
        <div className="mt-2 flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate font-normal">
            {nextTask.title}
          </span>
          {due && (
            <span
              className={cn(
                "text-[10px] font-mono-kasa shrink-0",
                isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
              )}
            >
              {due.label}
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Metadata, Inactivity & Actions */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40 text-[10px]">
        <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
          {lead.source && (
            <span className="truncate">
              {lead.source}
            </span>
          )}
          {lead.source && isStalled && <span>•</span>}
          {isStalled && (
            <span className="text-amber-600 dark:text-amber-400 font-mono-kasa">
              {days}d sem contato
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {responsible && (
            <div
              className="flex items-center"
              title={`Responsável: ${responsibleName}`}
            >
              {responsible.avatar_url ? (
                <img
                  src={responsible.avatar_url}
                  alt={responsibleName ?? ""}
                  className="size-4 rounded-full object-cover border border-border/60"
                />
              ) : (
                <div className="size-4 rounded-full bg-muted text-muted-foreground text-[8px] font-bold grid place-items-center border border-border/60">
                  {initials || "?"}
                </div>
              )}
            </div>
          )}

          {lead.phone && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const phone = lead.phone?.replace(/\D/g, "");
                if (phone) window.open(`https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}`, "_blank");
              }}
              className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              title="Abrir WhatsApp"
            >
              <MessageCircle className="size-3" />
            </button>
          )}

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              navigate({ to: "/propostas", search: { lead_id: lead.id } as any });
            }}
            className="text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Ver propostas"
          >
            <FileText className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Search, Trash2, AlertTriangle, Users } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  fetchJobStages,
  fetchJobs,
  moveJob,
  deleteJob,
  deleteJobStage,
  priorityColor,
  priorityLabel,
  JOB_STATUS_LABELS,
  type Job,
  type JobStage,
} from "@/lib/ops-api";
import { getJobTypeLabel } from "@/lib/job-types";
import { fetchProfiles } from "@/lib/profile-api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewJobDialog } from "./NewJobDialog";
import { JobSheet } from "./JobSheet";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export const JOBS_QUERY_KEY = (filters: any) => ["jobs", filters];

export function JobsBoard({
  projectId,
  clientId,
  serviceId,
  title = "Tarefas",
  eyebrow = "Operação · Tarefas",
  showPeriodFilter = false,
}: {
  projectId?: string;
  clientId?: string;
  serviceId?: string;
  title?: string;
  eyebrow?: string;
  showPeriodFilter?: boolean;
}) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<string>("all");
  const filters = useMemo(() => ({ projectId, clientId, serviceId, period }), [projectId, clientId, serviceId, period]);
  const queryKey = useMemo(() => JOBS_QUERY_KEY(filters), [filters]);
  const { data: stages = [] } = useQuery({ queryKey: ["job-stages"], queryFn: fetchJobStages });
  const { data: jobs = [] } = useQuery({ queryKey, queryFn: () => fetchJobs(filters) });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  useEffect(() => {
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          qc.invalidateQueries({ queryKey: ["jobs"] });
          qc.refetchQueries({ queryKey: ["jobs"], type: 'active' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: availablePeriods = [] } = useQuery({
    queryKey: ["available-periods", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase.from("jobs").select("period").eq("project_id", projectId).not("period", "is", null);
      const unique = Array.from(new Set(data?.map(d => d.period))).filter(Boolean).sort().reverse();
      return unique as string[];
    },
    enabled: !!projectId && showPeriodFilter
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const openJob = useMemo(() => jobs.find(j => j.id === openId) || null, [jobs, openId]);
  const [newStage, setNewStage] = useState<JobStage | null>(null);
  const [query, setQuery] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => 
      j.title.toLowerCase().includes(q) || 
      (j as any).clients?.name?.toLowerCase().includes(q) ||
      (j as any).clients?.company?.toLowerCase().includes(q) ||
      (j as any).projects?.name?.toLowerCase().includes(q)
    );
  }, [jobs, query]);

  const byStage = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const s of stages) m.set(s.id, []);
    for (const j of filtered) if (j.stage_id && m.has(j.stage_id)) m.get(j.stage_id)!.push(j);
    return m;
  }, [stages, filtered]);

  const moveMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: JobStage }) =>
      moveJob(id, stage.id, { done_at: stage.is_done ? new Date().toISOString() : null }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<Job[]>(queryKey);
      qc.setQueryData<Job[]>(queryKey, (old) =>
        (old ?? []).map((j) => (j.id === id ? { ...j, stage_id: stage.id, done_at: stage.is_done ? new Date().toISOString() : j.done_at } : j)),
      );
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error("Não foi possível mover a tarefa");
    },
  });

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const stage = stages.find((s) => s.id === overId);
    const job = jobs.find((j) => j.id === e.active.id);
    if (!stage || !job || job.stage_id === overId) return;
    moveMut.mutate({ id: String(e.active.id), stage });
  }

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-primary text-[10px] uppercase font-bold tracking-wider">
            Operação · Jobs
          </span>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1">
            Jobs
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {showPeriodFilter && (
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-40 h-11 sm:h-10 bg-surface border-border">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Períodos</SelectItem>
                {availablePeriods.map(p => {
                  const [year, month] = p.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  const label = format(date, "MMMM yyyy", { locale: ptBR });
                  return <SelectItem key={p} value={p}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 sm:flex-none">
            <Search className="size-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar Job…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-11 sm:h-10 w-full sm:w-64 bg-surface border-border"
            />
          </div>
          <Button
            onClick={() => setNewStage(stages[0] ?? null)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-11 sm:h-10 px-5 gap-2"
          >
            <Plus className="size-4 shrink-0" /> Novo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-6 lg:px-10 pb-10 scroll-smooth snap-x">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-w-max h-full">
            {stages.map((stage) => {
              const cards = byStage.get(stage.id) ?? [];
              return (
                <Column key={stage.id} stage={stage} count={cards.length} onAdd={() => setNewStage(stage)}>
                  {cards.map((j) => (
                    <JobCard 
                      key={j.id} 
                      job={j} 
                      profiles={profiles} 
                      onClick={() => setOpenId(j.id)}
                      queryKey={queryKey}
                    />
                  ))}
                </Column>
              );
            })}
          </div>
          <DragOverlay>{activeJob ? <JobCardInner job={activeJob} profiles={profiles} dragging /> : null}</DragOverlay>
        </DndContext>
      </div>

      <NewJobDialog
        stage={newStage}
        open={!!newStage}
        onOpenChange={(o) => !o && setNewStage(null)}
        defaultProjectId={projectId}
        defaultClientId={clientId}
        defaultPeriod={period !== 'all' ? period : undefined}
      />
      <JobSheet job={openJob} stages={stages} onClose={() => setOpenId(null)} />
    </div>
  );
}

function Column({
  stage,
  count,
  onAdd,
  children,
}: {
  stage: JobStage;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const delStageMut = useMutation({
    mutationFn: () => deleteJobStage(stage.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-stages"] });
      toast.success("Coluna removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="w-[280px] sm:w-[300px] shrink-0 flex flex-col snap-center group/col">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: stage.color }} />
          <span className="font-display font-semibold text-sm tracking-tight">{stage.name}</span>
          <span className="text-[10px] text-foreground/40">{count}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (confirm(`Remover a coluna "${stage.name}"?`)) delStageMut.mutate();
            }}
            className="size-6 rounded-md hover:bg-destructive/10 grid place-items-center text-foreground/20 hover:text-destructive opacity-0 group-hover/col:opacity-100 transition"
            aria-label="Excluir coluna"
          >
            <Trash2 className="size-3" />
          </button>
          <button
            onClick={onAdd}
            className="size-6 rounded-md hover:bg-surface-elevated grid place-items-center text-foreground/50 hover:text-primary transition"
            aria-label={`Adicionar em ${stage.name}`}
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border border-dashed p-2 space-y-2 transition-colors ${
          isOver ? "border-primary/60 bg-primary/5" : "border-border/60 bg-surface/40"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function JobCard({ job, profiles, onClick, queryKey }: { job: Job; profiles: any[]; onClick: () => void; queryKey: any[] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const qc = useQueryClient();
  
  const isOptimistic = job.id.startsWith('temp-');

  const delMut = useMutation({
    mutationFn: () => deleteJob(job.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<Job[]>(queryKey);
      qc.setQueryData<Job[]>(queryKey, (old) => (old ?? []).filter((j) => j.id !== job.id));
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job removido");
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(e.message);
    },
  });
  return (
    <div className={`relative group ${isDragging ? "opacity-30" : ""} ${isOptimistic ? "opacity-60" : ""}`}>
      <div
        ref={setNodeRef}
        {...(isOptimistic ? {} : listeners)}
        {...(isOptimistic ? {} : attributes)}
        onClick={() => !isOptimistic && onClick()}
        className={isOptimistic ? "cursor-wait" : "cursor-grab active:cursor-grabbing"}
      >
        <JobCardInner job={job} profiles={profiles} />
      </div>
      {!isOptimistic && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remover "${job.title}"?`)) delMut.mutate();
          }}
          className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-destructive opacity-40 group-hover:opacity-100 hover:bg-destructive/10 transition"
          aria-label="Excluir tarefa"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function JobCardInner({ job, profiles = [], dragging }: { job: Job; profiles?: any[]; dragging?: boolean }) {
  const progress = (job as any).progress_percentage || 0;
  const totalSteps = (job as any).total_steps || 0;
  const completedSteps = (job as any).completed_steps || 0;
  const mainRespId = (job as any).main_responsible_id || job.assignee_id;
  const mainResp = profiles.find(p => p.id === mainRespId);
  const teamInvolved = (job as any).team_involved || [];

  return (
    <div
      className={`bg-surface-elevated border border-border rounded-lg p-3 hover:border-primary/50 transition ${
        dragging ? "shadow-2xl rotate-1" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span
              className="size-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: priorityColor(job.priority) }}
            />
            <div className="min-w-0">
              <div className="font-semibold text-sm leading-snug truncate">{job.title}</div>
              <div className="text-[9px] text-foreground/40 mt-0.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">

                  {(job as any).client_id && (
                    <span className="text-[8px] px-1 bg-primary/5 rounded border border-primary/10 truncate max-w-[100px]">
                      Cliente: {(job as any).clients?.company || (job as any).clients?.name || "..."}
                    </span>
                  )}
                </div>
                {job.project_id && (
                  <div className="flex items-center gap-1 truncate text-[8px] opacity-70">
                    <span className="shrink-0">•</span>
                    <span className="truncate">{(job as any).projects?.name || `Projeto #${job.project_id.slice(0, 4)}`}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-mono-kasa text-foreground/50">
            <span>{totalSteps > 0 ? `${completedSteps}/${totalSteps} Etapas` : "Progresso"}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            {/* Responsável Principal */}
            {mainResp && (
              <div 
                className="size-6 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0 ring-2 ring-surface"
                title={`Responsável: ${mainResp.display_name || mainResp.full_name}`}
              >
                {mainResp.avatar_url ? (
                  <img src={mainResp.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-[8px] font-bold text-primary">
                    {(mainResp.display_name || mainResp.full_name || "M").split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </span>
                )}
              </div>
            )}
            
            {/* Equipe Envolvida */}
            {teamInvolved.length > 0 && (
              <div className="flex -space-x-2">
                {teamInvolved.slice(0, 2).map((member: any, idx: number) => {
                  const p = profiles.find(pr => pr.id === member.user_id);
                  if (!p) return null;
                  return (
                    <div 
                      key={idx}
                      className="size-5 rounded-full bg-surface-elevated border border-border overflow-hidden flex items-center justify-center shrink-0"
                      title={`${p.display_name || p.full_name} (${member.role || 'Membro'})`}
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="text-[7px] font-bold text-foreground/50">
                          {(p.display_name || p.full_name || "M").split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {teamInvolved.length > 2 && (
                  <div className="size-5 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-[7px] font-bold text-foreground/40">
                    +{teamInvolved.length - 2}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {job.due_date && (
              <div className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted/30",
                new Date(job.due_date) < new Date() && !job.done_at ? "text-rose-500 bg-rose-500/10" : "text-foreground/40"
              )}>
                {format(new Date(job.due_date), "dd/MM")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

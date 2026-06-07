import { useMemo, useState } from "react";
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

export function JobsBoard({
  projectId,
  clientId,
  title = "Tarefas",
  eyebrow = "Operação · Tarefas",
  showPeriodFilter = false,
}: {
  projectId?: string;
  clientId?: string;
  title?: string;
  eyebrow?: string;
  showPeriodFilter?: boolean;
}) {
  const qc = useQueryClient();
  const { data: stages = [] } = useQuery({ queryKey: ["job-stages"], queryFn: fetchJobStages });
  const [period, setPeriod] = useState<string>("all");
  const filters = { projectId, clientId, period };
  const queryKey = ["jobs", filters];
  const { data: jobs = [] } = useQuery({ queryKey, queryFn: () => fetchJobs(filters) });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

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
  const [open, setOpen] = useState<Job | null>(null);
  const [newStage, setNewStage] = useState<JobStage | null>(null);
  const [query, setQuery] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => j.title.toLowerCase().includes(q));
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
        (old ?? []).map((j) => (j.id === id ? { ...j, stage_id: stage.id } : j)),
      );
      return { prev };
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
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="text-primary text-[10px] capitalize">
            Operação · Jobs
          </span>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1">
            Jobs
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {showPeriodFilter && (
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 h-10 bg-surface border-border">
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
          <div className="relative">
            <Search className="size-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar Job…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 w-64 bg-surface border-border"
            />
          </div>
          <Button
            onClick={() => setNewStage(stages[0] ?? null)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-10 px-5 gap-2"
          >
            <Plus className="size-4" /> Novo Job
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
                    <JobCard key={j.id} job={j} profiles={profiles} onClick={() => setOpen(j)} />
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
      <JobSheet job={open} stages={stages} onClose={() => setOpen(null)} />
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
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div className="w-[280px] sm:w-[300px] shrink-0 flex flex-col snap-center">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: stage.color }} />
          <span className="font-display font-semibold text-sm tracking-tight">{stage.name}</span>
          <span className="text-[10px] text-foreground/40">{count}</span>
        </div>
        <button
          onClick={onAdd}
          className="size-6 rounded-md hover:bg-surface-elevated grid place-items-center text-foreground/50 hover:text-primary transition"
          aria-label={`Adicionar em ${stage.name}`}
        >
          <Plus className="size-3.5" />
        </button>
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

function JobCard({ job, profiles, onClick }: { job: Job; profiles: any[]; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const qc = useQueryClient();
  const delMut = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job removido");
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
        <JobCardInner job={job} profiles={profiles} />
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Remover "${job.title}"?`)) delMut.mutate();
        }}
        className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition"
        aria-label="Excluir tarefa"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function JobCardInner({ job, profiles = [], dragging }: { job: Job; profiles?: any[]; dragging?: boolean }) {
  return (
    <div
      className={`bg-surface-elevated border border-border rounded-lg p-3 hover:border-primary/50 transition ${
        dragging ? "shadow-2xl rotate-1" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className="size-1.5 rounded-full mt-1.5 shrink-0"
          style={{ background: priorityColor(job.priority) }}
          title={priorityLabel(job.priority)}
        />
        <div className="min-w-0 flex-1 pr-6">
          <div className="font-semibold text-sm leading-snug">{job.title}</div>
          <div className="mt-0.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/70">
              {getJobTypeLabel((job as any).job_type)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            {job.due_date && (
              <div className={cn(
                "text-[10px] capitalize font-bold",
                new Date(job.due_date) < new Date() && !job.done_at ? "text-rose-500 animate-pulse" : "text-foreground/40"
              )}>
                {format(new Date(job.due_date), "dd MMM")}
              </div>
            )}
            {(() => {
              const respId = (job as any).responsible_id || job.assignee_id;
              if (!respId) return null;
              const profile = profiles.find(p => p.id === respId);
              if (!profile) return null;
              const name = profile.display_name || profile.full_name || "Membro";
              return (
                <div 
                  className="size-5 rounded-full bg-primary/10 border border-border/40 overflow-hidden flex items-center justify-center shrink-0"
                  title={`Responsável: ${name}`}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-bold text-primary">
                      {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  )}
                </div>
              );
            })()}
            {/* Status Indicator */}
            <div 
              className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-1"
              style={ (job as any).status ? { backgroundColor: `${JOB_STATUS_LABELS[(job as any).status]?.color}15`, color: JOB_STATUS_LABELS[(job as any).status]?.color } : {} }
            >
              {(job as any).last_activity_at && differenceInDays(new Date(), new Date((job as any).last_activity_at)) >= 5 && !job.done_at && (
                <AlertTriangle className="size-2 text-amber-500 animate-bounce" />
              )}
              { (job as any).status ? JOB_STATUS_LABELS[(job as any).status]?.label : 'Pendentes' }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

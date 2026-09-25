import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { Plus, Search, Trash2, Users, Copy, X, Filter, Check, FolderKanban, Building2, LayoutGrid, ListFilter, ArrowUpDown, Calendar, Clock, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import {
  fetchJobStages,
  fetchJobs,
  moveJob,
  deleteJob,
  duplicateJob,
  deleteJobStage,
  priorityColor,
  priorityLabel,
  fetchClients,
  JOB_STATUS_LABELS,
  type Job,
  type JobStage,
} from "@/lib/ops-api";
import { fetchProfiles } from "@/lib/profile-api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewJobDialog } from "./NewJobDialog";
import { JobSheet } from "./JobSheet";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { StorageImage } from "@/components/ui/storage-image";


export const JOBS_QUERY_KEY = (filters: any) => ["jobs", filters];

export function JobsBoard({
  projectId,
  clientId,
  serviceId,
  title = "Gestão de Jobs",
  eyebrow = "Operação · Jobs",
  showPeriodFilter = false,
  initialOpenId,
  initialOpenNew,
  initialClientId,
  initialLaunchProductId,
  initialTitle,
  initialDescription,
  initialDueDate,
  initialEditorialPostId,
  initialCoverUrl,
  onCloseNew,
}: {
  projectId?: string;
  clientId?: string;
  serviceId?: string;
  title?: string;
  eyebrow?: string;
  showPeriodFilter?: boolean;
  initialOpenId?: string;
  initialOpenNew?: boolean | string;
  initialClientId?: string;
  initialLaunchProductId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialDueDate?: string;
  initialEditorialPostId?: string;
  initialCoverUrl?: string;
  onCloseNew?: () => void;
}) {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [sortField, setSortField] = useState<"due_date" | "title" | "client" | "priority" | "stage">("due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [period, setPeriod] = useState<string>("all");
  const [responsibleId, setResponsibleId] = useState<string>("all");
  const [clientFilterId, setClientFilterId] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [teamFilter, setTeamFilter] = useState<string[]>([]);

  const filters = useMemo(() => ({ projectId, clientId, serviceId, period }), [projectId, clientId, serviceId, period]);
  const queryKey = useMemo(() => JOBS_QUERY_KEY(filters), [filters]);
  
  const { data: stages = [] } = useQuery({ queryKey: ["job-stages"], queryFn: fetchJobStages });
  const { data: jobs = [] } = useQuery({ queryKey, queryFn: () => fetchJobs(filters) });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-filter"], queryFn: fetchClients });

  useEffect(() => {
    const channel = supabase
      .channel('jobs-realtime-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          console.log("Mudança em tempo real detectada em jobs:", payload);
          qc.invalidateQueries({ queryKey: ["jobs"] });
          // Se for mudança de etapa, atualizar também as etapas (pode ter triggers de automação)
          qc.invalidateQueries({ queryKey: ["job-stages"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_checklist' },
        (payload) => {
          console.log("Mudança em tempo real detectada em checklist:", payload);
          qc.invalidateQueries({ queryKey: ["jobs"] }); // Refetch jobs para atualizar progresso visual
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

  const jobIds = useMemo(() => jobs.map((j) => j.id), [jobs]);

  // Consulta checklists de todos os jobs para identificar a equipe e o responsável pela etapa atual
  const { data: allChecklists = [] } = useQuery({
    queryKey: ["all-job-checklists", jobIds],
    queryFn: async () => {
      if (jobIds.length === 0) return [];
      const { data, error } = await supabase
        .from("job_checklist")
        .select("id, job_id, done, order_index, responsible_id")
        .in("job_id", jobIds)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: jobIds.length > 0,
  });

  const { nextResponsibleMap, teamFromChecklistMap } = useMemo(() => {
    const nextResp = new Map<string, string>();
    const teamMap = new Map<string, string[]>();

    for (const item of allChecklists) {
      if (!item.job_id) continue;

      // Equipe envolvida no checklist
      if (item.responsible_id) {
        const existing = teamMap.get(item.job_id) || [];
        if (!existing.includes(item.responsible_id)) {
          existing.push(item.responsible_id);
          teamMap.set(item.job_id, existing);
        }
      }

      // Responsável pela próxima etapa pendente ("em ação")
      if (!item.done && item.responsible_id && !nextResp.has(item.job_id)) {
        nextResp.set(item.job_id, item.responsible_id);
      }
    }

    return { nextResponsibleMap: nextResp, teamFromChecklistMap: teamMap };
  }, [allChecklists]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  useEffect(() => { if (initialOpenId) setOpenId(initialOpenId); }, [initialOpenId]);
  const openJob = useMemo(() => jobs.find(j => j.id === openId) || null, [jobs, openId]);
  const [newStage, setNewStage] = useState<JobStage | null>(null);
  const [query, setQuery] = useState("");

  

  // Auto-abre o dialog "Novo Job" quando vier via ?new=true
  useEffect(() => {
    const isNew = initialOpenNew === true || initialOpenNew === "true" || initialOpenNew === "1";
    if (isNew && stages.length > 0) {
      if (!newStage) {
        console.log("[JobsBoard] Abrindo modal de Novo Job via parâmetros de URL. Props:", {
          initialTitle,
          initialDescription,
          initialDueDate,
          initialClientId,
          initialEditorialPostId
        });
        setNewStage(stages[0]);
      }
    } else if (!isNew && newStage) {
      setNewStage(null);
    }
  }, [initialOpenNew, stages, initialTitle, initialDescription, initialDueDate, initialClientId, initialEditorialPostId]);


  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => {
    // Se não houver jobs, retorna array vazio
    if (!jobs || jobs.length === 0) return [];
    
    // Se não houver critérios de filtro ativos, retorna todos os jobs
    const hasActiveFilters = 
      query.trim() !== "" || 
      (responsibleId && responsibleId !== "all") || 
      (clientFilterId && clientFilterId !== "all") || 
      (priorityFilter && priorityFilter !== "all") || 
      (statusFilter && statusFilter !== "all") || 
      (teamFilter && teamFilter.length > 0);

    if (!hasActiveFilters) return jobs;

    let result = [...jobs];
    
    // Filtro por texto (Case-insensitive)
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((j) => {
        const titleMatch = j.title?.toLowerCase().includes(q);
        const clientNameMatch = (j as any).clients?.name?.toLowerCase().includes(q);
        const clientCompanyMatch = (j as any).clients?.company?.toLowerCase().includes(q);
        const projectNameMatch = (j as any).projects?.name?.toLowerCase().includes(q);
        
        return titleMatch || clientNameMatch || clientCompanyMatch || projectNameMatch;
      });
    }

    // Helper: coleta todos os user_ids envolvidos no job (responsável, assignee, team_involved legado e checklist)
    const collectJobUserIds = (j: any): Set<string> => {
      const ids = new Set<string>();
      if (j.main_responsible_id) ids.add(j.main_responsible_id);
      if (j.assignee_id) ids.add(j.assignee_id);
      const legacy = j.team_involved || [];
      legacy.forEach((m: any) => {
        const id = m?.user_id || m;
        if (id && typeof id === "string") ids.add(id);
      });
      const fromChecklist = teamFromChecklistMap.get(j.id) || [];
      fromChecklist.forEach((id) => ids.add(id));
      return ids;
    };

    // Filtro por Responsável Principal (apenas main_responsible_id / assignee_id)
    if (responsibleId && responsibleId !== "all") {
      result = result.filter((j) => {
        const mainRespId = (j as any).main_responsible_id || j.assignee_id;
        return mainRespId === responsibleId;
      });
    }

    // Filtro por Equipe Envolvida (qualquer envolvido: responsável, checklist ou team_involved)
    if (teamFilter && teamFilter.length > 0) {
      result = result.filter((j) => {
        const ids = collectJobUserIds(j);
        return teamFilter.some((userId) => ids.has(userId));
      });
    }

    // Filtro por Cliente
    if (clientFilterId && clientFilterId !== "all") {
      result = result.filter((j) => j.client_id === clientFilterId);
    }

    // Filtro por Prioridade
    if (priorityFilter && priorityFilter !== "all") {
      result = result.filter((j) => j.priority === priorityFilter);
    }

    // Filtro por Status
    if (statusFilter === "active") {
      // Esconde jobs concluídos (com done_at ou status "done") — padrão do board
      result = result.filter((j: any) => !j.done_at && j.status !== "done");
    } else if (statusFilter === "done") {
      result = result.filter((j: any) => !!j.done_at || j.status === "done");
    } else if (statusFilter && statusFilter !== "all") {
      result = result.filter((j) => j.status === statusFilter);
    }

    return result;
  }, [jobs, query, responsibleId, teamFilter, clientFilterId, priorityFilter, statusFilter, teamFromChecklistMap]);

  const clearFilters = () => {
    setQuery("");
    setResponsibleId("all");
    setClientFilterId("all");
    setPeriod("all");
    setPriorityFilter("all");
    setStatusFilter("active");
    setTeamFilter([]);
  };

  const activeFiltersCount = [
    query !== "",
    responsibleId !== "all",
    clientFilterId !== "all",
    period !== "all",
    priorityFilter !== "all",
    statusFilter !== "all" && statusFilter !== "active",
    teamFilter.length > 0
  ].filter(Boolean).length;

  const toggleTeamMember = (id: string) => {
    setTeamFilter(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

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

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;

  const byStage = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const s of stages) m.set(s.id, []);
    for (const j of filtered) if (j.stage_id && m.has(j.stage_id)) m.get(j.stage_id)!.push(j);
    // Ordena cada coluna por data de entrega (cronológica, mais próxima primeiro; sem data ao final)
    for (const [k, list] of m) {
      list.sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        return da - db;
      });
      m.set(k, list);
    }
    return m;
  }, [stages, filtered]);

  // Flat ordered list of visible jobs (column order, then due_date within column)
  const flatJobs = useMemo(() => {
    const arr: Job[] = [];
    for (const s of stages) {
      const list = byStage.get(s.id) ?? [];
      arr.push(...list);
    }
    return arr;
  }, [stages, byStage]);

  // Sorted list specifically for the Table view
  const tableJobs = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === "due_date") {
        const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        comparison = da - db;
      } else if (sortField === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortField === "client") {
        const ca = (a as any).clients?.company || (a as any).clients?.name || "";
        const cb = (b as any).clients?.company || (b as any).clients?.name || "";
        comparison = ca.localeCompare(cb);
      } else if (sortField === "priority") {
        const priorityOrder: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
        comparison = (priorityOrder[b.priority || "normal"] || 0) - (priorityOrder[a.priority || "normal"] || 0);
      } else if (sortField === "stage") {
        const stageIdxA = stages.findIndex((s) => s.id === a.stage_id);
        const stageIdxB = stages.findIndex((s) => s.id === b.stage_id);
        comparison = stageIdxA - stageIdxB;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return list;
  }, [filtered, sortField, sortDirection, stages]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Keyboard shortcuts: J/K navigate, E/Enter edit, C comment
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (openId) return; // não interfere com sheet aberto
      if (flatJobs.length === 0) return;
      const key = e.key.toLowerCase();
      if (key !== "j" && key !== "k" && key !== "c" && key !== "e" && e.key !== "Enter") return;

      const currentIdx = focusedId ? flatJobs.findIndex(j => j.id === focusedId) : -1;

      if (key === "j") {
        e.preventDefault();
        const next = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, flatJobs.length - 1);
        setFocusedId(flatJobs[next].id);
      } else if (key === "k") {
        e.preventDefault();
        const prev = currentIdx <= 0 ? 0 : currentIdx - 1;
        setFocusedId(flatJobs[prev].id);
      } else if (key === "e" || e.key === "Enter") {
        if (focusedId) { e.preventDefault(); setOpenId(focusedId); }
      } else if (key === "c") {
        if (focusedId) { e.preventDefault(); setOpenId(focusedId); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flatJobs, focusedId, openId]);

  // Scroll focused card into view
  useEffect(() => {
    if (!focusedId) return;
    const el = document.querySelector(`[data-job-id="${focusedId}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [focusedId]);

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

  return (

    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block font-medium">
            {eyebrow}
          </span>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mt-0.5">
            {title}
          </h1>
        </div>

        <NewJobDialog
          stage={newStage}
          open={!!newStage}
          onOpenChange={(o) => {
            if (!o) {
              setNewStage(null);
              onCloseNew?.();
            }
          }}
          defaultClientId={initialClientId}
          defaultTitle={initialTitle}
          defaultDescription={initialDescription}
          defaultDueDate={initialDueDate}
          defaultLaunchProductId={initialLaunchProductId}
          defaultEditorialPostId={initialEditorialPostId}
          defaultCoverUrl={initialCoverUrl}
          onCreated={(j) => {
            setNewStage(null);
            onCloseNew?.();
            setOpenId(j.id);
          }}
        />

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Toggle de Visualização (Kanban / Tabela) */}
          <div className="flex items-center p-0.5 rounded-md border border-border/60 bg-muted/20">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-kasa rounded transition-colors",
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Visualização em Quadro Kanban"
            >
              <LayoutGrid className="size-3.5" />
              <span>Quadro</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-kasa rounded transition-colors",
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Visualização em Lista / Tabela"
            >
              <ListFilter className="size-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 sm:px-2.5 gap-1.5 text-xs font-mono-kasa text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-md"
              >
                <X className="size-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}

            {/* Central de Filtros */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 sm:px-3 gap-1.5 text-xs font-mono-kasa border-border/60 bg-card hover:bg-muted/20 rounded-md"
                >
                  <Filter className="size-3.5" />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-mono-kasa">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-96 p-4 bg-card border-border/60 shadow-xl rounded-lg" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <h3 className="font-display font-semibold text-xs text-foreground uppercase tracking-wider font-mono-kasa">Filtros Avançados</h3>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-6 text-[10px] font-mono-kasa text-muted-foreground hover:text-foreground p-0"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Busca */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">Busca</label>
                      <div className="relative">
                        <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <Input
                          placeholder="Buscar por nome..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          className="pl-8 h-8 text-xs bg-muted/20 border-border/60 rounded-md"
                        />
                      </div>
                    </div>

                    {/* Responsável Principal */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">Responsável Principal</label>
                      <Select value={responsibleId} onValueChange={setResponsibleId}>
                        <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60 rounded-md">
                          <SelectValue placeholder="Selecione um responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">Todos Responsáveis</SelectItem>
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.display_name || p.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Equipe Envolvida */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">Equipe Envolvida</label>
                      <div className="max-h-32 overflow-y-auto border border-border/60 rounded-md bg-muted/10 p-1.5 space-y-0.5 custom-scrollbar">
                        {profiles.map(p => {
                          const isSelected = teamFilter.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 transition cursor-pointer"
                              onClick={() => toggleTeamMember(p.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleTeamMember(p.id)}
                                className="size-3.5"
                              />
                              <Avatar className="size-4">
                                <AvatarImage src={p.avatar_url || ''} />
                                <AvatarFallback className="text-[8px] bg-muted text-muted-foreground font-mono-kasa">
                                  {(p.display_name || p.full_name || '?').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate flex-1">{p.display_name || p.full_name}</span>
                              {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">Cliente</label>
                      <Select value={clientFilterId} onValueChange={setClientFilterId}>
                        <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60 rounded-md">
                          <SelectValue placeholder="Filtrar por cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">Todos os Clientes</SelectItem>
                          {clients.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.company || c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Prioridade */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">Prioridade</label>
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60 rounded-md">
                          <SelectValue placeholder="Prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs font-mono-kasa">Todas</SelectItem>
                          <SelectItem value="high" className="text-xs font-mono-kasa">Alta</SelectItem>
                          <SelectItem value="normal" className="text-xs font-mono-kasa">Normal</SelectItem>
                          <SelectItem value="low" className="text-xs font-mono-kasa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60 rounded-md">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs font-mono-kasa">Ativos (esconde concluídos)</SelectItem>
                          <SelectItem value="all" className="text-xs font-mono-kasa">Todos</SelectItem>
                          <SelectItem value="done" className="text-xs font-mono-kasa">Concluídos</SelectItem>
                          {Object.entries(JOB_STATUS_LABELS).map(([key, value]) => (
                            <SelectItem key={key} value={key} className="text-xs font-mono-kasa">
                              {value.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Período */}
                    {showPeriodFilter && (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">Período</label>
                        <Select value={period} onValueChange={setPeriod}>
                          <SelectTrigger className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60 rounded-md">
                            <SelectValue placeholder="Período" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs font-mono-kasa">Todos os Períodos</SelectItem>
                            {availablePeriods.map(p => {
                              const [year, month] = p.split('-');
                              const date = new Date(parseInt(year), parseInt(month) - 1);
                              const label = format(date, "MMMM yyyy", { locale: ptBR });
                              return <SelectItem key={p} value={p} className="text-xs font-mono-kasa">{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              onClick={() => setNewStage(stages[0] || null)}
              className="h-8 px-2.5 sm:px-3 gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-mono-kasa text-xs font-medium rounded-md shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>Novo Job</span>
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto px-4 sm:px-6 lg:px-10 pb-10 scroll-smooth snap-x">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-3 sm:gap-4 min-w-max h-full">
              {stages.map((stage) => {
                const cards = byStage.get(stage.id) ?? [];
                return (
                  <Column key={stage.id} stage={stage} count={cards.length} onAdd={() => setNewStage(stage)}>
                    {cards.map((j: Job) => (
                      <JobCard
                        key={j.id}
                        job={j}
                        profiles={profiles}
                        nextResponsibleMap={nextResponsibleMap}
                        onClick={() => { setFocusedId(j.id); setOpenId(j.id); }}
                        queryKey={queryKey}
                        focused={focusedId === j.id}
                      />
                    ))}
                  </Column>
                );
              })}
            </div>
            <DragOverlay>{activeJob ? <JobCardInner job={activeJob} profiles={profiles} nextResponsibleMap={nextResponsibleMap} dragging /> : null}</DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-10 space-y-3">
          {/* Visualização de Lista para Mobile (Cards Touch Otimizados) */}
          <div className="md:hidden space-y-2.5">
            {tableJobs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-mono-kasa text-xs bg-card border border-border/60 rounded-xl p-6">
                Nenhum job encontrado para os filtros selecionados.
              </div>
            ) : (
              tableJobs.map((j) => {
                const stage = stages.find((s) => s.id === j.stage_id);
                const mainRespId = (j as any).main_responsible_id || j.assignee_id;
                const mainResp = profiles.find((p) => p.id === mainRespId);
                const ballPersonId = nextResponsibleMap.get(j.id);
                const ballPerson = ballPersonId ? profiles.find((p) => p.id === ballPersonId) : null;
                const isDone = !!j.done_at || j.status === "done";
                const progress = (j as any).progress_percentage || 0;
                const totalSteps = (j as any).total_steps || 0;
                const completedSteps = (j as any).completed_steps || 0;

                const due = j.due_date ? new Date(j.due_date).getTime() : null;
                const now = Date.now();
                const daysLeft = due ? Math.ceil((due - now) / 86400000) : null;
                const isOverdue = due ? due < now && !isDone : false;
                const coverUrl = (j as any).editorial_posts?.cover_url || (j as any).cover_url;

                return (
                  <div
                    key={j.id}
                    onClick={() => {
                      setFocusedId(j.id);
                      setOpenId(j.id);
                    }}
                    className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-border transition-all active:scale-[0.99] shadow-xs flex flex-col gap-2.5 cursor-pointer overflow-hidden"
                    style={{ borderLeft: `3px solid ${priorityColor(j.priority)}` }}
                  >
                    {coverUrl && (
                      <div className="-mx-3.5 -mt-3.5 mb-1 aspect-[21/9] w-[calc(100%+1.75rem)] overflow-hidden border-b border-border/40 relative bg-muted/20">
                        <StorageImage
                          src={coverUrl}
                          alt={j.title}
                          className="size-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-xs leading-snug text-foreground block truncate">
                          {j.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono-kasa text-muted-foreground">
                          <span className="truncate max-w-[160px] text-foreground/80 font-medium">
                            {(j as any).clients?.company || (j as any).clients?.name || "Sem Cliente"}
                          </span>
                          {(j as any).projects?.name && (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="truncate max-w-[120px] text-[10px]">
                                {(j as any).projects.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {stage && (
                        <span
                          className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono-kasa border inline-flex items-center gap-1"
                          style={{
                            background: `${stage.color || "#6b7280"}15`,
                            color: stage.color || "#6b7280",
                            borderColor: `${stage.color || "#6b7280"}30`,
                          }}
                        >
                          <span
                            className="size-1.5 rounded-full shrink-0"
                            style={{ background: stage.color || "#6b7280" }}
                          />
                          {stage.name}
                        </span>
                      )}
                    </div>

                    {totalSteps > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono-kasa tabular-nums text-muted-foreground">
                          <span>{completedSteps}/{totalSteps} etapas</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1 bg-muted/40" />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] font-mono-kasa">
                      {/* Responsáveis */}
                      <div className="flex items-center gap-1.5">
                        {mainResp ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Avatar className="size-4 shrink-0">
                              <AvatarImage src={mainResp.avatar_url || ""} />
                              <AvatarFallback className="text-[8px] font-mono-kasa">
                                {(mainResp.display_name || mainResp.full_name || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[90px] text-foreground font-medium text-[10px]">
                              {(mainResp.display_name || mainResp.full_name || "").split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60">—</span>
                        )}

                        {ballPerson && ballPersonId !== mainRespId && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] text-muted-foreground/40 leading-none select-none">→</span>
                            <Avatar className="size-3.5 shrink-0 border border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20">
                              <AvatarImage src={ballPerson.avatar_url || ""} />
                              <AvatarFallback className="text-[7px] font-mono-kasa font-medium text-amber-600 dark:text-amber-400">
                                {(ballPerson.display_name || ballPerson.full_name || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>

                      {/* Prazo */}
                      {j.due_date ? (
                        <span
                          className={cn(
                            "text-[10px] font-mono-kasa tabular-nums px-1.5 py-0.5 rounded border inline-block",
                            isDone
                              ? "text-muted-foreground border-border/40 bg-muted/10"
                              : isOverdue
                              ? "text-rose-500 border-rose-500/30 bg-rose-500/10 font-semibold"
                              : "text-muted-foreground border-border/60 bg-muted/20"
                          )}
                        >
                          {isDone
                            ? "Concluído"
                            : isOverdue
                            ? `Atrasado ${Math.abs(daysLeft!)}d`
                            : daysLeft === 0
                            ? "Hoje"
                            : `${daysLeft}d restantes`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">—</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tabela Completa (Apenas Desktop / md+) */}
          <div className="hidden md:block border border-border/60 rounded-lg bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground select-none">
                    <th className="py-2.5 px-3 font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort("title")}>
                      <div className="flex items-center gap-1">
                        <span>Job / Tarefa</span>
                        <ArrowUpDown className="size-2.5" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort("client")}>
                      <div className="flex items-center gap-1">
                        <span>Cliente / Projeto</span>
                        <ArrowUpDown className="size-2.5" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort("stage")}>
                      <div className="flex items-center gap-1">
                        <span>Etapa</span>
                        <ArrowUpDown className="size-2.5" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort("priority")}>
                      <div className="flex items-center gap-1">
                        <span>Prioridade</span>
                        <ArrowUpDown className="size-2.5" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Responsável</th>
                    <th className="py-2.5 px-3 font-semibold">Progresso</th>
                    <th className="py-2.5 px-3 font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort("due_date")}>
                      <div className="flex items-center gap-1">
                        <span>Prazo</span>
                        <ArrowUpDown className="size-2.5" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-sans">
                  {tableJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground font-mono-kasa text-xs">
                        Nenhum job encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    tableJobs.map((j) => {
                      const stage = stages.find((s) => s.id === j.stage_id);
                      const mainRespId = (j as any).main_responsible_id || j.assignee_id;
                      const mainResp = profiles.find((p) => p.id === mainRespId);
                      const ballPersonId = nextResponsibleMap.get(j.id);
                      const ballPerson = ballPersonId ? profiles.find((p) => p.id === ballPersonId) : null;
                      const isDone = !!j.done_at || j.status === "done";
                      const progress = (j as any).progress_percentage || 0;
                      const totalSteps = (j as any).total_steps || 0;
                      const completedSteps = (j as any).completed_steps || 0;

                      // Deadline calculation
                      const due = j.due_date ? new Date(j.due_date).getTime() : null;
                      const now = Date.now();
                      const daysLeft = due ? Math.ceil((due - now) / 86400000) : null;
                      const isOverdue = due ? due < now && !isDone : false;

                      // Thumbnail/Capa do job
                      const scriptRow = Array.isArray((j as any).scripts) ? (j as any).scripts[0] : (j as any).scripts;
                      const scriptImage = scriptRow?.script_scenes?.find((s: any) => !!s.reference_image_url)?.reference_image_url;

                      const coverUrl =
                        ((j as any).custom_fields as any)?.cover_url ||
                        (j as any).editorial_posts?.cover_url ||
                        (j as any).launch_grid_products?.image_url ||
                        scriptImage ||
                        (Array.isArray((j as any).job_attachments)
                          ? (j as any).job_attachments.find(
                              (att: any) =>
                                att.file_type?.startsWith("image/") ||
                                /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.file_url || "")
                            )?.file_url
                          : null);

                      return (
                        <tr
                          key={j.id}
                          onClick={() => {
                            setFocusedId(j.id);
                            setOpenId(j.id);
                          }}
                          className="hover:bg-muted/20 cursor-pointer transition-colors group"
                        >
                          {/* Title */}
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            <div className="flex items-center gap-2.5 min-w-0 max-w-[280px] lg:max-w-xs">
                              {coverUrl ? (
                                <div className="size-8 rounded overflow-hidden shrink-0 border border-border/60 bg-muted/30">
                                  <StorageImage
                                    src={coverUrl}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span
                                  className="size-2 rounded-full shrink-0"
                                  style={{ background: priorityColor(j.priority) }}
                                />
                              )}
                              <span className="truncate group-hover:underline">{j.title}</span>
                            </div>
                          </td>

                          {/* Client / Project */}
                          <td className="py-2.5 px-3 text-muted-foreground">
                            <div className="flex flex-col min-w-0 max-w-[200px]">
                              <span className="truncate text-foreground font-medium text-[11px]">
                                {(j as any).clients?.company || (j as any).clients?.name || "—"}
                              </span>
                              {(j as any).projects?.name && (
                                <span className="truncate text-[10px] text-muted-foreground font-mono-kasa">
                                  {(j as any).projects.name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Stage */}
                          <td className="py-2.5 px-3">
                            {stage ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono-kasa border"
                                style={{
                                  background: `${stage.color || "#6b7280"}15`,
                                  color: stage.color || "#6b7280",
                                  borderColor: `${stage.color || "#6b7280"}30`,
                                }}
                              >
                                <span
                                  className="size-1.5 rounded-full shrink-0"
                                  style={{ background: stage.color || "#6b7280" }}
                                />
                                {stage.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-mono-kasa">—</span>
                            )}
                          </td>

                          {/* Priority */}
                          <td className="py-2.5 px-3">
                            <span
                              className="text-[10px] font-mono-kasa font-medium uppercase tracking-wider"
                              style={{ color: priorityColor(j.priority) }}
                            >
                              {priorityLabel(j.priority)}
                            </span>
                          </td>

                          {/* Assignee */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono-kasa">
                              {/* Dono Principal */}
                              {mainResp ? (
                                <div className="flex items-center gap-1.5 min-w-0" title={`Dono do Job: ${mainResp.display_name || mainResp.full_name}`}>
                                  <Avatar className="size-4 shrink-0">
                                    <AvatarImage src={mainResp.avatar_url || ""} />
                                    <AvatarFallback className="text-[8px] font-mono-kasa">
                                      {(mainResp.display_name || mainResp.full_name || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-[100px] text-foreground font-medium">
                                    {(mainResp.display_name || mainResp.full_name || "").split(" ")[0]}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-mono-kasa text-muted-foreground/60">—</span>
                              )}

                              {/* Mini-Avatar Conectado da etapa atual */}
                              {ballPerson && ballPersonId !== mainRespId && (
                                <div
                                  className="flex items-center gap-1 shrink-0"
                                  title={`Dono: ${mainResp?.display_name || mainResp?.full_name} → Etapa atual com: ${ballPerson.display_name || ballPerson.full_name}`}
                                >
                                  <span className="text-[10px] text-muted-foreground/40 leading-none select-none">→</span>
                                  <Avatar className="size-3.5 shrink-0 border border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20">
                                    <AvatarImage src={ballPerson.avatar_url || ""} />
                                    <AvatarFallback className="text-[7px] font-mono-kasa font-medium text-amber-600 dark:text-amber-400">
                                      {(ballPerson.display_name || ballPerson.full_name || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Progress */}
                          <td className="py-2.5 px-3">
                            {totalSteps > 0 ? (
                              <div className="flex items-center gap-2 min-w-[90px]">
                                <Progress value={progress} className="h-1 flex-1 bg-muted/40" />
                                <span className="text-[10px] font-mono-kasa tabular-nums text-muted-foreground shrink-0">
                                  {completedSteps}/{totalSteps}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono-kasa text-muted-foreground/60">—</span>
                            )}
                          </td>

                          {/* Due Date */}
                          <td className="py-2.5 px-3">
                            {j.due_date ? (
                              <span
                                className={cn(
                                  "text-[10px] font-mono-kasa tabular-nums px-1.5 py-0.5 rounded border inline-block",
                                  isDone
                                    ? "text-muted-foreground border-border/40 bg-muted/10"
                                    : isOverdue
                                    ? "text-rose-500 border-rose-500/30 bg-rose-500/10 font-semibold"
                                    : "text-muted-foreground border-border/60 bg-muted/20"
                                )}
                              >
                                {isDone
                                  ? "Concluído"
                                  : isOverdue
                                  ? `Atrasado ${Math.abs(daysLeft!)}d`
                                  : daysLeft === 0
                                  ? "Hoje"
                                  : `${daysLeft}d restantes`}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono-kasa text-muted-foreground/60">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <NewJobDialog
        stage={newStage}
        open={!!newStage}
        onOpenChange={(o) => !o && setNewStage(null)}
        defaultProjectId={projectId}
        defaultClientId={clientId ?? initialClientId}
        defaultPeriod={period !== 'all' ? period : undefined}
        defaultLaunchProductId={initialLaunchProductId}
        lockLaunchProduct={!!initialLaunchProductId}
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
    <div className="w-[280px] sm:w-[310px] shrink-0 flex flex-col snap-center group/col">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2 rounded-full shrink-0" style={{ background: stage.color }} />
          <span className="font-medium text-xs tracking-tight text-foreground truncate">{stage.name}</span>
          <span className="text-[10px] font-mono-kasa tabular-nums px-1.5 py-0.2 rounded bg-muted/30 border border-border/60 text-muted-foreground">
            {count}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (confirm(`Remover a coluna "${stage.name}"?`)) delStageMut.mutate();
            }}
            className="size-6 rounded-md hover:bg-destructive/10 grid place-items-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/col:opacity-100 transition"
            aria-label="Excluir coluna"
          >
            <Trash2 className="size-3" />
          </button>
          <button
            onClick={onAdd}
            className="size-6 rounded-md hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition"
            aria-label={`Adicionar em ${stage.name}`}
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-lg border border-border/60 p-2 space-y-2 transition-colors min-h-[160px]",
          isOver ? "border-foreground/40 bg-muted/20" : "bg-muted/10"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function JobCard({ job, profiles, nextResponsibleMap, onClick, queryKey, focused }: { job: Job; profiles: any[]; nextResponsibleMap?: Map<string, string>; onClick: () => void; queryKey: any[]; focused?: boolean }) {
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
  const dupMut = useMutation({
    mutationFn: () => duplicateJob(job.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job duplicado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      data-job-id={job.id}
      className={cn(
        "relative group rounded-lg",
        isDragging ? "opacity-30" : "",
        isOptimistic ? "opacity-60" : "",
        focused ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      )}
    >
      <div
        ref={setNodeRef}
        {...(isOptimistic ? {} : listeners)}
        {...(isOptimistic ? {} : attributes)}
        onClick={() => !isOptimistic && onClick()}
        className={isOptimistic ? "cursor-wait" : "cursor-grab active:cursor-grabbing"}
      >
        <JobCardInner job={job} profiles={profiles} nextResponsibleMap={nextResponsibleMap} />
      </div>
      {!isOptimistic && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              dupMut.mutate();
            }}
            disabled={dupMut.isPending}
            className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors bg-background/80 backdrop-blur-xs shadow-xs"
            title="Duplicar tarefa"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remover "${job.title}"?`)) delMut.mutate();
            }}
            className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors bg-background/80 backdrop-blur-xs shadow-xs"
            title="Excluir tarefa"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function JobCardInner({ job, profiles = [], nextResponsibleMap, dragging }: { job: Job; profiles?: any[]; nextResponsibleMap?: Map<string, string>; dragging?: boolean }) {
  const navigate = useNavigate();
  const progress = (job as any).progress_percentage || 0;
  const totalSteps = (job as any).total_steps || 0;
  const completedSteps = (job as any).completed_steps || 0;
  const mainRespId = (job as any).main_responsible_id || job.assignee_id;
  const mainResp = profiles.find(p => p.id === mainRespId);
  const mainRespName = mainResp?.display_name || mainResp?.full_name;

  const ballPersonId = nextResponsibleMap?.get(job.id);
  const ballPerson = ballPersonId ? profiles.find(p => p.id === ballPersonId) : null;
  const ballPersonName = ballPerson?.display_name || ballPerson?.full_name;

  // Deadline health: based on remaining time vs total window (created_at -> due_date)
  const deadline = useMemo(() => {
    if (!job.due_date) return null;
    const due = new Date(job.due_date).getTime();
    const now = Date.now();
    const created = job.created_at ? new Date(job.created_at).getTime() : now - 7 * 86400000;
    const isDone = !!job.done_at;
    const msLeft = due - now;
    const daysLeft = Math.ceil(msLeft / 86400000);
    const total = Math.max(due - created, 86400000);
    const elapsed = Math.min(Math.max(now - created, 0), total);
    const usedPct = Math.round((elapsed / total) * 100);

    let color = "bg-emerald-500";
    let textColor = "text-emerald-600";
    let label = `${daysLeft}d restantes`;

    if (isDone) {
      color = "bg-emerald-500/40";
      textColor = "text-foreground/50";
      label = "Concluído";
    } else if (msLeft < 0) {
      color = "bg-rose-500";
      textColor = "text-rose-500";
      const overdue = Math.abs(daysLeft);
      label = overdue === 0 ? "Vence hoje" : `Atrasado ${overdue}d`;
    } else if (usedPct >= 75 || daysLeft <= 1) {
      color = "bg-rose-500";
      textColor = "text-rose-500";
    } else if (usedPct >= 50 || daysLeft <= 3) {
      color = "bg-amber-500";
      textColor = "text-amber-600";
    }
    return { color, textColor, label, usedPct: Math.min(usedPct, 100), isDone, isOverdue: msLeft < 0 && !isDone };
  }, [job.due_date, job.created_at, job.done_at]);


  const coverUrl = useMemo(() => {
    // 1. Capa explicitamente selecionada no Job (via custom_fields)
    const jobCustomCover = ((job as any).custom_fields as any)?.cover_url;
    if (jobCustomCover) return jobCustomCover;

    // 2. Capa direta de post editorial
    const editorialCover = (job as any).editorial_posts?.cover_url;
    if (editorialCover) return editorialCover;

    // 3. Imagem de produto do grid de lançamento
    const productCover = (job as any).launch_grid_products?.image_url;
    if (productCover) return productCover;

    // 4. Imagem de cena do roteiro (Script)
    const scripts = (job as any).scripts;
    const script = Array.isArray(scripts) ? scripts[0] : scripts;
    if (script?.script_scenes && Array.isArray(script.script_scenes)) {
      const sortedScenes = [...script.script_scenes].sort(
        (a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0)
      );
      const sceneWithImage = sortedScenes.find((s) => !!s.reference_image_url);
      if (sceneWithImage?.reference_image_url) return sceneWithImage.reference_image_url;
    }

    // 5. Primeiro anexo que seja imagem
    const attachments = (job as any).job_attachments;
    if (Array.isArray(attachments)) {
      const imgAtt = attachments.find(
        (att) =>
          att.file_type?.startsWith("image/") ||
          /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.file_url || "")
      );
      if (imgAtt?.file_url) return imgAtt.file_url;
    }

    return null;
  }, [job]);

  return (
    <div
      className={cn(
        "bg-card border border-border/60 rounded-lg p-3 hover:border-border transition relative overflow-hidden group/card shadow-xs",
        dragging ? "shadow-xl rotate-1 opacity-90" : ""
      )}
      style={{
        borderLeft: `3px solid ${priorityColor(job.priority)}`
      }}
    >
      {coverUrl && (
        <div className="relative -mx-3 -mt-3 mb-2.5 aspect-[16/9] overflow-hidden rounded-t-lg bg-muted/30 border-b border-border/40">
          <StorageImage
            src={coverUrl}
            alt={job.title}
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement)?.classList.add("hidden");
            }}
          />
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 w-full">
            <div className="font-semibold text-xs leading-snug truncate text-foreground group-hover/card:underline">
              {job.title}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {job.project_id && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted/30 text-muted-foreground border border-border/60 rounded text-[10px] font-mono-kasa max-w-full overflow-hidden">
                  <FolderKanban className="size-2.5 shrink-0" />
                  <span className="truncate">
                    {(job as any).projects?.name || "Projeto"}
                  </span>
                </div>
              )}

              <div
                data-testid="client-link"
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-mono-kasa transition-colors",
                  job.client_id ? "text-muted-foreground hover:text-foreground cursor-pointer" : "text-muted-foreground/60"
                )}
                onClick={(e) => {
                  if (job.client_id) {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate({
                      to: "/clientes/$clientId",
                      params: { clientId: job.client_id }
                    });
                  }
                }}
              >
                 {(job as any).clients?.logo_url ? (
                   <StorageImage
                     src={(job as any).clients.logo_url}
                     alt=""
                     className="size-3.5 shrink-0 rounded object-cover border border-border/40"
                   />
                 ) : (
                   <Building2 className="size-3 shrink-0 opacity-60" />
                 )}
                 <span className="truncate">
                   {(job as any).clients?.company || (job as any).clients?.name || "Sem Cliente"}
                 </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        {totalSteps > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono-kasa tabular-nums text-muted-foreground">
              <span>{completedSteps}/{totalSteps} etapas</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1 bg-muted/40" />
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/40 gap-2">
          {/* Responsável Principal e Etapa Atual conectada */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Dono / Responsável Principal */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={cn(
                  "size-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 border",
                  mainResp
                    ? "border-border/60 bg-muted/30"
                    : "border-dashed border-border/60 bg-muted/20"
                )}
                title={mainRespName ? `Dono do Job: ${mainRespName}` : "Sem dono definido"}
              >
                {mainResp ? (
                  mainResp.avatar_url ? (
                    <StorageImage src={mainResp.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-mono-kasa font-medium text-foreground">
                      {(mainRespName || "M").charAt(0).toUpperCase()}
                    </span>
                  )
                ) : (
                  <span className="text-[9px] font-mono-kasa text-muted-foreground">?</span>
                )}
              </div>
              {mainRespName && (
                <span className="text-[10px] font-mono-kasa text-muted-foreground truncate max-w-[85px]">
                  {mainRespName.split(" ")[0]}
                </span>
              )}
            </div>

            {/* Conector com responsável pela etapa atual */}
            {ballPerson && ballPersonId !== mainRespId && (
              <div
                className="flex items-center gap-1 shrink-0 text-muted-foreground/60"
                title={`Dono: ${mainRespName} → Etapa atual com: ${ballPersonName}`}
              >
                <span className="text-[10px] font-mono-kasa leading-none select-none text-muted-foreground/40">→</span>
                <div
                  className="size-4 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                >
                  {ballPerson.avatar_url ? (
                    <StorageImage src={ballPerson.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-[7px] font-mono-kasa font-medium text-amber-600 dark:text-amber-400">
                      {(ballPersonName || "A").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {deadline && (
              <span className={cn(
                "text-[10px] font-mono-kasa tabular-nums px-1.5 py-0.5 rounded border whitespace-nowrap",
                deadline.isOverdue
                  ? "text-rose-500 border-rose-500/30 bg-rose-500/10 font-semibold"
                  : "text-muted-foreground border-border/60 bg-muted/20"
              )}>
                {deadline.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Compass,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  LayoutGrid,
  Link2,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NewJobDialog } from "@/components/jobs/NewJobDialog";
import { createProject, fetchJobStages, type JobStage } from "@/lib/ops-api";
import {
  createStrategicEdge,
  createStrategicNode,
  deleteStrategicEdge,
  deleteStrategicNode,
  fetchStrategicMap,
  updateStrategicNode,
  updateStrategicPlan,
  getPlanningRange,
  planningMonthPattern,
  planningMonthsInRange,
  strategicActionJobForMonth,
  upsertStrategicActionJob,
  type StrategicActionJob,
  type StrategicNode,
  type StrategicNodeType,
} from "@/lib/strategic-plans-api";
import { toast } from "sonner";

type Project = { id: string; name: string; status?: string | null };
type Job = { id: string; title: string; status?: string | null; done_at?: string | null; project_id?: string | null; client_id?: string | null };

function actionExecution(
  node: StrategicNode,
  planningMonth: string,
  jobs: Job[],
  projects: Project[],
  actionJobs: StrategicActionJob[],
) {
  const monthlyExecution = strategicActionJobForMonth(node, planningMonth, actionJobs);
  const project = monthlyExecution?.project_id
    ? projects.find((item) => item.id === monthlyExecution.project_id)
    : null;
  const projectJobs = project
    ? jobs.filter((job) => job.project_id === project.id)
    : [];
  const job = monthlyExecution?.job_id
    ? jobs.find((item) => item.id === monthlyExecution.job_id)
    : null;

  if (project) {
    const completed = projectJobs.filter(
      (item) => item.done_at || item.status === "done" || item.status === "completed",
    ).length;
    const inProgress = projectJobs.filter((item) => item.status === "in_progress").length;
    const status = projectJobs.length > 0 && completed === projectJobs.length
      ? "Concluído"
      : inProgress > 0
        ? "Em andamento"
        : "Planejado";
    return {
      detail: `${project.name} · ${projectJobs.length} ${projectJobs.length === 1 ? "entrega" : "entregas"}`,
      status,
      className: status === "Concluído"
        ? "text-emerald-700 dark:text-emerald-300"
        : status === "Em andamento"
          ? "text-amber-700 dark:text-amber-300"
          : "text-muted-foreground",
    };
  }

  if (job) {
    const status = job.done_at || job.status === "done" || job.status === "completed"
      ? "Concluído"
      : job.status === "in_progress"
        ? "Em andamento"
        : "Planejado";
    return { detail: `Job: ${job.title}`, status, className: "text-muted-foreground" };
  }

  return { detail: null, status: "Sem execução", className: "text-muted-foreground" };
}

const nodeTypes: Array<{ value: StrategicNodeType; label: string; accent: string; icon: typeof Target }> = [
  { value: "objective", label: "Objetivo", accent: "border-2 border-blue-700/80 bg-blue-600/15", icon: Target },
  { value: "evidence", label: "Evidência", accent: "border-sky-500/50 bg-sky-500/10", icon: Compass },
  { value: "idea", label: "Ideia", accent: "border-violet-500/50 bg-violet-500/10", icon: Sparkles },
  { value: "hypothesis", label: "Hipótese", accent: "border-amber-500/50 bg-amber-500/10", icon: Sparkles },
  { value: "direction", label: "Direção", accent: "border-2 border-orange-700/80 bg-orange-500/20", icon: ArrowRight },
  { value: "action", label: "Ação", accent: "border-2 border-teal-700/80 bg-teal-500/15", icon: Check },
  { value: "result", label: "Resultado", accent: "border-pink-500/50 bg-pink-500/10", icon: Check },
];

const planningMonths = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const getPlanningMonths = (node: StrategicNode) => planningMonthsInRange(node.metadata);

const getPlanningMonth = (node: StrategicNode) => getPlanningRange(node.metadata)?.start ?? null;

const getPlanningYear = (planningMonth: string | null) =>
  planningMonth ? Number(planningMonth.slice(0, 4)) : null;

const formatPlanningMonth = (value: string) =>
  new Date(`${value}-01T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

const formatPlanningRange = (node: StrategicNode) => {
  const range = getPlanningRange(node.metadata);
  if (!range) return null;
  if (range.start === range.end) return formatPlanningMonth(range.start);
  return `${formatPlanningMonth(range.start)} até ${formatPlanningMonth(range.end)}`;
};

const planningRangeFromValues = (start: string, end: string) => {
  if (!start && !end) return {};
  if (!start || !planningMonthPattern.test(start) || !end || !planningMonthPattern.test(end)) {
    throw new Error("Informe o início e o fim do período.");
  }
  if (start > end) throw new Error("O início não pode ser posterior ao fim.");
  return { planning_start: start, planning_end: end, planning_month: start };
};

const removePlanningRange = (metadata: Record<string, unknown>) => {
  const next = { ...metadata };
  delete next.planning_month;
  delete next.planning_start;
  delete next.planning_end;
  return next;
};

const setPlanningRange = (metadata: Record<string, unknown>, start: string, end: string) => ({
  ...metadata,
  ...planningRangeFromValues(start, end),
});

const getType = (type: StrategicNodeType) => nodeTypes.find((item) => item.value === type) ?? nodeTypes[1];

const getNodeRole = (type: StrategicNodeType) => {
  if (type === "objective") return "Destino · o resultado que precisa ser verdade";
  if (type === "direction") return "Escolha · o caminho que vai orientar as ações";
  if (type === "action") return "Trabalho · o próximo movimento concreto";
  return null;
};

const getNodePrompt = (type: StrategicNodeType) => {
  if (type === "objective") return "O que precisa ser verdade ao final?";
  if (type === "direction") return "Qual escolha vai orientar o que faremos?";
  if (type === "action") return "Qual é o próximo trabalho?";
  return null;
};

const getNodeTag = (type: StrategicNodeType) => {
  if (type === "objective") return "DESTINO";
  if (type === "direction") return "ESCOLHA";
  if (type === "action") return "TRABALHO";
  return null;
};

function distributePositions(count: number) {
  if (count <= 0) return [];
  if (count === 1) return [50];
  return Array.from({ length: count }, (_, index) => 12 + (index * 76) / (count - 1));
}

function buildStrategicLayout(
  nodes: StrategicNode[],
  edges: Array<{ source_node_id: string; target_node_id: string }>,
) {
  const positions: Record<string, { x: number; y: number }> = {};
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!byId.has(edge.source_node_id) || !byId.has(edge.target_node_id)) return;
    incoming.set(edge.target_node_id, [
      ...(incoming.get(edge.target_node_id) ?? []),
      edge.source_node_id,
    ]);
  });

  const stable = (left: StrategicNode, right: StrategicNode) =>
    left.sort_order - right.sort_order || left.id.localeCompare(right.id);
  const objectives = nodes.filter((node) => node.type === "objective").sort(stable);
  const directions = nodes.filter((node) => node.type === "direction").sort(stable);
  const actions = nodes.filter((node) => node.type === "action").sort(stable);
  const directionIds = new Set(directions.map((node) => node.id));
  const objectiveY = distributePositions(objectives.length);
  const directionY = distributePositions(directions.length);

  objectives.forEach((node, index) => {
    positions[node.id] = { x: 16, y: objectiveY[index] };
  });
  directions.forEach((node, index) => {
    positions[node.id] = { x: 43, y: directionY[index] };
  });

  const groupedActions = new Map<string, StrategicNode[]>();
  const unlinkedActions: StrategicNode[] = [];
  actions.forEach((node) => {
    const parentDirection = (incoming.get(node.id) ?? []).find((id) => directionIds.has(id));
    if (!parentDirection) {
      unlinkedActions.push(node);
      return;
    }
    groupedActions.set(parentDirection, [...(groupedActions.get(parentDirection) ?? []), node]);
  });

  directions.forEach((direction) => {
    const children = groupedActions.get(direction.id) ?? [];
    const y = children.length ? distributePositions(children.length) : [positions[direction.id].y];
    children.forEach((node, index) => {
      positions[node.id] = { x: 72, y: y[index] };
    });
  });
  unlinkedActions.forEach((node, index) => {
    positions[node.id] = { x: 72, y: distributePositions(unlinkedActions.length)[index] };
  });

  const auxiliary = nodes
    .filter((node) => !positions[node.id])
    .sort(stable);
  auxiliary.forEach((node, index) => {
    positions[node.id] = {
      x: 16 + (index % 3) * 28,
      y: 88 - Math.floor(index / 3) * 12,
    };
  });

  return positions;
}

function descendantsFrom(
  rootId: string,
  edges: Array<{ source_node_id: string; target_node_id: string }>,
) {
  return descendantsUntil([rootId], edges);
}

function descendantsUntil(
  rootIds: string[],
  edges: Array<{ source_node_id: string; target_node_id: string }>,
  stopIds = new Set<string>(),
) {
  const descendants = new Set<string>();
  const queue = rootIds.flatMap((rootId) =>
    edges
      .filter((edge) => edge.source_node_id === rootId)
      .map((edge) => edge.target_node_id),
  );
  while (queue.length) {
    const nodeId = queue.shift();
    if (!nodeId || descendants.has(nodeId)) continue;
    descendants.add(nodeId);
    if (stopIds.has(nodeId)) continue;
    edges
      .filter((edge) => edge.source_node_id === nodeId)
      .forEach((edge) => queue.push(edge.target_node_id));
  }
  return descendants;
}

function unionSets(...sets: Set<string>[]) {
  return sets.reduce((result, set) => {
    set.forEach((value) => result.add(value));
    return result;
  }, new Set<string>());
}

interface Props {
  clientId: string;
  clientName: string;
  projects: Project[];
  jobs: Job[];
  showPlanningGrid?: boolean;
  monthlyFocus?: {
    nodeId: string;
    planningMonth: string;
  } | null;
  onMonthlyFocusHandled?: () => void;
}

export function ClientStrategicMap({
  clientId,
  clientName,
  projects,
  jobs,
  showPlanningGrid = true,
  monthlyFocus = null,
  onMonthlyFocusHandled,
}: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState<Partial<StrategicNode>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionMenuNodeId, setActionMenuNodeId] = useState<string | null>(null);
  const [collapsedObjectiveIds, setCollapsedObjectiveIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [collapsedDirectionIds, setCollapsedDirectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [organizing, setOrganizing] = useState(false);
  const [connectionDrag, setConnectionDrag] = useState<{
    sourceNodeId: string;
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);
  const [connectionTargetId, setConnectionTargetId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<Set<string>>(() => new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingEdgeId, setRemovingEdgeId] = useState<string | null>(null);
  const [transformingId, setTransformingId] = useState<string | null>(null);
  const [jobDialogActionId, setJobDialogActionId] = useState<string | null>(null);
  const [jobDialogProjectId, setJobDialogProjectId] = useState<string | null>(null);
  const [jobDialogPlanningMonth, setJobDialogPlanningMonth] = useState<string | null>(null);
  const [focusedMonthlyFocus, setFocusedMonthlyFocus] = useState<{ nodeId: string; planningMonth: string } | null>(null);
  const [positionOverrides, setPositionOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [planningYearOverride, setPlanningYearOverride] = useState<number | null>(null);
  const [nodeSize, setNodeSize] = useState({ width: 30, height: 15 });
  const dragPositionRef = useRef<Record<string, { x: number; y: number }>>({});
  const dragStartPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const dragStartPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragNodeIdsRef = useRef<Set<string>>(new Set());
  const selectionOnlyRef = useRef(false);
  const draggedRef = useRef(false);

  const mapQuery = useQuery({
    queryKey: ["strategic-map", clientId],
    queryFn: () => fetchStrategicMap(clientId),
  });
  const stagesQuery = useQuery<JobStage[]>({
    queryKey: ["job-stages"],
    queryFn: fetchJobStages,
    staleTime: 5 * 60 * 1000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["strategic-map", clientId] });
  const jobsForProject = (projectId?: string | null) =>
    jobs.filter((job) => !projectId || (job as Job & { project_id?: string | null }).project_id === projectId);
  const nodeMutation = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<StrategicNode> }) => updateStrategicNode(id, patch), onSuccess: refresh });
  const planMutation = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateStrategicPlan>[1] }) => updateStrategicPlan(id, patch), onSuccess: refresh });

  const nodes = mapQuery.data?.nodes ?? [];
  const edges = mapQuery.data?.edges ?? [];
  const actionJobs = mapQuery.data?.actionJobs ?? [];
  const directionIds = useMemo(
    () => new Set(nodes.filter((node) => node.type === "direction").map((node) => node.id)),
    [nodes],
  );
  const objectiveIds = useMemo(
    () => new Set(nodes.filter((node) => node.type === "objective").map((node) => node.id)),
    [nodes],
  );
  const hiddenNodeIds = useMemo(() => {
    const collapsedObjectiveDescendants = unionSets(
      ...[...collapsedObjectiveIds].map((objectiveId) => descendantsFrom(objectiveId, edges)),
    );
    const collapsedDirectionDescendants = unionSets(
      ...[...collapsedDirectionIds].map((directionId) => descendantsFrom(directionId, edges)),
    );
    const candidates = unionSets(collapsedObjectiveDescendants, collapsedDirectionDescendants);
    const incomingByNode = new Map<string, string[]>();

    edges.forEach((edge) => {
      incomingByNode.set(edge.target_node_id, [
        ...(incomingByNode.get(edge.target_node_id) ?? []),
        edge.source_node_id,
      ]);
    });

    const canReachExpandedRoot = (nodeId: string) => {
      const visited = new Set<string>();
      const queue = [nodeId];

      while (queue.length) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);

        if (objectiveIds.has(currentId)) {
          if (!collapsedObjectiveIds.has(currentId)) return true;
          continue;
        }

        if (directionIds.has(currentId) && collapsedDirectionIds.has(currentId)) {
          continue;
        }

        const parents = incomingByNode.get(currentId) ?? [];
        if (directionIds.has(currentId) && parents.length === 0) return true;
        parents.forEach((parentId) => queue.push(parentId));
      }

      return false;
    };

    const hidden = new Set<string>();
    candidates.forEach((nodeId) => {
      if (!canReachExpandedRoot(nodeId)) hidden.add(nodeId);
    });
    return hidden;
  }, [collapsedDirectionIds, collapsedObjectiveIds, directionIds, edges, objectiveIds]);
  const visibleNodes = useMemo(
    () => nodes.filter((node) => !hiddenNodeIds.has(node.id)),
    [hiddenNodeIds, nodes],
  );
  const visibleEdges = useMemo(
    () => edges.filter((edge) => !hiddenNodeIds.has(edge.source_node_id) && !hiddenNodeIds.has(edge.target_node_id)),
    [edges, hiddenNodeIds],
  );
  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const actionNodes = nodes.filter((node) => node.type === "action");
  const linkedCount = nodes.filter((node) => node.linked_job_id || node.linked_project_id).length;
  const plan = mapQuery.data?.plan;
  const selectedJobDialogAction = actionNodes.find((node) => node.id === jobDialogActionId) ?? null;
  const selectedJobDialogProject = selectedJobDialogAction?.linked_project_id
    ? projects.find((project) => project.id === selectedJobDialogAction.linked_project_id)
    : null;

  const linkAction = async (node: StrategicNode, patch: Partial<StrategicNode>) => {
    try {
      await nodeMutation.mutateAsync({ id: node.id, patch });
      const next = { ...node, ...patch };
      if (selectedId === node.id) setDraft(next);
      toast.success("Vínculo atualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o vínculo");
    }
  };

  const effectivePositions = useMemo(
    () =>
      Object.fromEntries(
        nodes.map((node) => [
          node.id,
          positionOverrides[node.id] ?? { x: node.position_x, y: node.position_y },
        ]),
      ) as Record<string, { x: number; y: number }>,
    [nodes, positionOverrides],
  );

  const selectedProject = selected?.linked_project_id ? projects.find((project) => project.id === selected.linked_project_id) : null;
  const selectedJob = selected?.linked_job_id ? jobs.find((job) => job.id === selected.linked_job_id) : null;
  const selectedRelations = selected
    ? edges
        .map((edge) => {
          if (edge.source_node_id === selected.id) {
            const target = nodes.find((node) => node.id === edge.target_node_id);
            return target ? { edge, direction: "leva para" as const, node: target } : null;
          }
          if (edge.target_node_id === selected.id) {
            const source = nodes.find((node) => node.id === edge.source_node_id);
            return source ? { edge, direction: "vem de" as const, node: source } : null;
          }
          return null;
        })
        .filter((relation): relation is NonNullable<typeof relation> => relation !== null)
    : [];
  const storedPlanningYears = actionNodes
    .flatMap((node) => getPlanningMonths(node).map((month) => getPlanningYear(month)))
    .filter((year): year is number => year !== null);
  const cyclePlanningYear = plan?.cycle_start ? Number(plan.cycle_start.slice(0, 4)) : null;
  const defaultPlanningYear = storedPlanningYears.length > 0
    ? Math.max(...storedPlanningYears)
    : cyclePlanningYear ?? new Date().getFullYear();
  const planningYear = planningYearOverride ?? defaultPlanningYear;
  const currentMonth = new Date().getFullYear() === planningYear ? new Date().getMonth() + 1 : null;
  const planningYears = Array.from(
    new Set([cyclePlanningYear, ...storedPlanningYears, planningYear].filter((year): year is number => year !== null)),
  ).sort((left, right) => left - right);
  const unscheduledActions = actionNodes.filter((node) => !getPlanningMonths(node).length);
  const actionsByMonth = planningMonths.map((_, index) => {
    const month = `${planningYear}-${String(index + 1).padStart(2, "0")}`;
    return actionNodes.filter((node) => getPlanningMonths(node).includes(month));
  });

  const savePlanningRange = async (node: StrategicNode, start: string, end: string) => {
    const previousMetadata = { ...node.metadata };
    let metadata: Record<string, unknown>;
    try {
      metadata = start || end ? setPlanningRange(node.metadata, start, end) : removePlanningRange(node.metadata);
      if (start) setPlanningYearOverride(Number(start.slice(0, 4)));
      else setPlanningYearOverride(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Informe um período válido");
      return;
    }

    queryClient.setQueryData(["strategic-map", clientId], (current: typeof mapQuery.data) =>
      current
        ? {
            ...current,
            nodes: current.nodes.map((item) => item.id === node.id ? { ...item, metadata } : item),
          }
        : current,
    );
    if (selectedId === node.id) setDraft((current) => ({ ...current, metadata }));

    try {
      await nodeMutation.mutateAsync({ id: node.id, patch: { metadata } });
      toast.success(start ? `Ação planejada de ${formatPlanningRange({ ...node, metadata })}` : "Ação retirada do planejamento mensal");
    } catch (error) {
      queryClient.setQueryData(["strategic-map", clientId], (current: typeof mapQuery.data) =>
        current
          ? {
              ...current,
              nodes: current.nodes.map((item) => item.id === node.id ? { ...item, metadata: previousMetadata } : item),
            }
          : current,
      );
      if (selectedId === node.id) setDraft((current) => ({ ...current, metadata: previousMetadata }));
      await refresh();
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o período do planejamento");
    }
  };

  const planningRangeFor = (node: StrategicNode) => {
    const metadata = selectedId === node.id
      ? ((draft.metadata ?? node.metadata) as Record<string, unknown>)
      : node.metadata;
    const legacy = typeof metadata.planning_month === "string" && planningMonthPattern.test(metadata.planning_month)
      ? metadata.planning_month
      : "";
    const start = typeof metadata.planning_start === "string" && planningMonthPattern.test(metadata.planning_start)
      ? metadata.planning_start
      : legacy;
    const end = typeof metadata.planning_end === "string" && planningMonthPattern.test(metadata.planning_end)
      ? metadata.planning_end
      : legacy || start;
    return { start, end };
  };

  const updateDraftPlanningRange = (field: "start" | "end", value: string) => {
    if (!selected) return;
    const currentMetadata = (draft.metadata ?? selected.metadata) as Record<string, unknown>;
    const current = getPlanningRange(currentMetadata);
    const next = field === "start"
      ? { start: value, end: current?.end ?? value }
      : { start: current?.start ?? value, end: value };
    const metadata = next.start && next.end && next.start <= next.end
      ? setPlanningRange(currentMetadata, next.start, next.end)
      : next.start || next.end
        ? { ...currentMetadata, planning_start: next.start, planning_end: next.end }
        : removePlanningRange(currentMetadata);
    setDraft((currentDraft) => ({ ...currentDraft, metadata }));
  };

  const clearDraftPlanningRange = () => {
    if (!selected) return;
    setDraft((currentDraft) => ({ ...currentDraft, metadata: removePlanningRange(selected.metadata) }));
    void savePlanningRange(selected, "", "");
  };

  const saveDraftPlanningRange = () => {
    if (!selected) return;
    const metadata = (draft.metadata ?? {}) as Record<string, unknown>;
    const start = typeof metadata.planning_start === "string" ? metadata.planning_start : typeof metadata.planning_month === "string" ? metadata.planning_month : "";
    const end = typeof metadata.planning_end === "string" ? metadata.planning_end : start;
    void savePlanningRange(selected, start, end);
  };

  useEffect(() => {
    const firstNode = canvasRef.current?.querySelector<HTMLElement>("[data-strategic-node]");
    if (!firstNode) return;
    const measure = () => {
      const rect = firstNode.getBoundingClientRect();
      const canvas = canvasRef.current?.getBoundingClientRect();
      if (!canvas || !rect.width || !rect.height) return;
      setNodeSize({ width: (rect.width / canvas.width) * 100, height: (rect.height / canvas.height) * 100 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(firstNode);
    return () => observer.disconnect();
  }, [nodes.length]);

  const edgeLines = useMemo(() => {
    const edgeKey = (edge: (typeof edges)[number]) => `${edge.source_node_id}:${edge.target_node_id}`;
    const outgoing = new Map<string, typeof visibleEdges>();
    const incoming = new Map<string, typeof visibleEdges>();
    visibleEdges.forEach((edge) => {
      outgoing.set(edge.source_node_id, [...(outgoing.get(edge.source_node_id) ?? []), edge]);
      incoming.set(edge.target_node_id, [...(incoming.get(edge.target_node_id) ?? []), edge]);
    });
    outgoing.forEach((items) => items.sort((a, b) => edgeKey(a).localeCompare(edgeKey(b))));
    incoming.forEach((items) => items.sort((a, b) => edgeKey(a).localeCompare(edgeKey(b))));

    return visibleEdges
      .map((edge) => {
        const source = effectivePositions[edge.source_node_id];
        const target = effectivePositions[edge.target_node_id];
        if (!source || !target) return null;
        const direction = target.x >= source.x ? 1 : -1;
        const sourceX = source.x + direction * nodeSize.width / 2;
        const targetX = target.x - direction * nodeSize.width / 2;
        const sourceGroup = outgoing.get(edge.source_node_id) ?? [];
        const targetGroup = incoming.get(edge.target_node_id) ?? [];
        const sourceLane = sourceGroup.indexOf(edge) - (sourceGroup.length - 1) / 2;
        const targetLane = targetGroup.indexOf(edge) - (targetGroup.length - 1) / 2;
        const laneOffset = Math.min(5, Math.max(1.5, Math.abs(target.y - source.y) * 0.04));
        const sourceY = source.y + sourceLane * laneOffset;
        const targetY = target.y + targetLane * laneOffset;
        const horizontalGap = Math.abs(targetX - sourceX);
        const lane = (sourceLane + targetLane) / 2;
        const bend = Math.max(8, Math.min(16, horizontalGap * 0.28));
        const midX = horizontalGap > bend * 2
          ? sourceX + direction * (horizontalGap / 2 + lane * 2)
          : sourceX + direction * bend;
        return {
          edge,
          source: { x: sourceX, y: sourceY },
          target: { x: targetX, y: targetY },
          midX,
        };
      })
      .filter(Boolean) as Array<{
      edge: (typeof edges)[number];
      source: { x: number; y: number };
      target: { x: number; y: number };
      midX: number;
    }>;
  }, [effectivePositions, nodeSize, visibleEdges]);

  const organizeMap = async () => {
    if (!nodes.length || organizing) return;
    setOrganizing(true);
    const nextPositions = buildStrategicLayout(nodes, edges);
    setPositionOverrides(nextPositions);
    try {
      await Promise.all(
        nodes.map((node) =>
          updateStrategicNode(node.id, {
            position_x: nextPositions[node.id].x,
            position_y: nextPositions[node.id].y,
          }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["strategic-map", clientId] });
      setPositionOverrides({});
      toast.success("Mapa organizado");
    } catch (error) {
      setPositionOverrides({});
      await refresh();
      toast.error(error instanceof Error ? error.message : "Não foi possível organizar o mapa");
    } finally {
      setOrganizing(false);
    }
  };

  const toggleDirectionCollapse = (directionId: string) => {
    setCollapsedDirectionIds((current) => {
      const next = new Set(current);
      if (next.has(directionId)) next.delete(directionId);
      else next.add(directionId);
      return next;
    });
  };

  const toggleObjectiveCollapse = (objectiveId: string) => {
    setCollapsedObjectiveIds((current) => {
      const next = new Set(current);
      if (next.has(objectiveId)) next.delete(objectiveId);
      else next.add(objectiveId);
      return next;
    });
  };

  useEffect(() => {
    setCollapsedDirectionIds((current) => {
      const next = new Set([...current].filter((id) => directionIds.has(id)));
      return next.size === current.size ? current : next;
    });
    setCollapsedObjectiveIds((current) => {
      const next = new Set([...current].filter((id) => objectiveIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [directionIds, objectiveIds]);

  useEffect(() => {
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => visibleNodes.some((node) => node.id === id)));
      return next.size === current.size ? current : next;
    });
    if (selectedId && hiddenNodeIds.has(selectedId)) {
      setDrawerOpen(false);
      setActionMenuNodeId(null);
    }
  }, [hiddenNodeIds, selectedId, visibleNodes]);

  useEffect(() => {
    if (!monthlyFocus || mapQuery.isLoading) return;
    const node = nodes.find((item) => item.id === monthlyFocus.nodeId);
    if (!node) return;
    selectNode(node);
    setFocusedMonthlyFocus(monthlyFocus);
    setDrawerOpen(true);
    requestAnimationFrame(() => {
      document.getElementById(`strategic-month-${monthlyFocus.nodeId}-${monthlyFocus.planningMonth}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    onMonthlyFocusHandled?.();
  }, [mapQuery.isLoading, monthlyFocus, nodes, onMonthlyFocusHandled]);

  const collapsedCountFor = (nodeId: string) =>
    [...descendantsFrom(nodeId, edges)].filter((descendantId) => hiddenNodeIds.has(descendantId)).length;

  const selectNode = (node: StrategicNode, additive = false) => {
    setSelectedId(node.id);
    setSelectedIds((current) => {
      if (!additive) return new Set([node.id]);
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    setDraft(node);
    setActionMenuNodeId(null);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedId(null);
    setDraft({});
    setDrawerOpen(false);
    setActionMenuNodeId(null);
  };

  const selectAllVisible = () => {
    const visibleIds = visibleNodes.map((node) => node.id);
    setSelectedIds(new Set(visibleIds));
    if (!selectedId && visibleIds[0]) {
      const firstVisible = visibleNodes[0];
      setSelectedId(firstVisible.id);
      setDraft(firstVisible);
    }
  };

  const saveSelected = async () => {
    if (!selected || !draft.title?.trim()) return;
    setSavingId(selected.id);
    try {
      await nodeMutation.mutateAsync({ id: selected.id, patch: draft });
      toast.success("Elemento salvo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o elemento");
    } finally {
      setSavingId(null);
    }
  };

  const addNode = async (type: StrategicNodeType = "idea") => {
    if (!plan) return;
    try {
      const node = await createStrategicNode({
        plan_id: plan.id,
        type,
        title: type === "objective" ? "Novo objetivo" : type === "direction" ? "Nova direção" : type === "action" ? "Nova ação" : "Nova ideia",
        description: "",
        position_x: 22 + (nodes.length % 4) * 19,
        position_y: 16 + (nodes.length % 3) * 25,
        sort_order: nodes.length,
        status: type === "objective" ? "active" : type === "action" ? "planned" : "draft",
      });
      await refresh();
      selectNode(node);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o elemento");
    }
  };

  const addActionForMonth = async (month?: string) => {
    if (!plan) return;
    try {
      const node = await createStrategicNode({
        plan_id: plan.id,
        type: "action",
        title: "Nova ação",
        description: "",
        position_x: 22 + (nodes.length % 4) * 19,
        position_y: 16 + (nodes.length % 3) * 25,
        sort_order: nodes.length,
        status: "planned",
        metadata: month ? { planning_month: `${planningYear}-${month}`, planning_start: `${planningYear}-${month}`, planning_end: `${planningYear}-${month}` } : {},
      });
      await refresh();
      selectNode(node);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a ação");
    }
  };

  const transformDirectionIntoAction = async () => {
    if (!selected || selected.type !== "direction" || !plan) return;
    setTransformingId(selected.id);
    try {
      const directionPosition = effectivePositions[selected.id] ?? {
        x: selected.position_x,
        y: selected.position_y,
      };
      const action = await createStrategicNode({
        plan_id: plan.id,
        type: "action",
        title: selected.title,
        description: selected.description ?? "",
        position_x: Math.min(92, directionPosition.x + 20),
        position_y: directionPosition.y,
        sort_order: nodes.length,
        status: "planned",
        metadata: {
          source_direction_id: selected.id,
        },
      });

      await createStrategicEdge({
        plan_id: plan.id,
        source_node_id: selected.id,
        target_node_id: action.id,
        relation: "leads_to",
        label: "vira ação",
      });

      await refresh();
      setSelectedId(action.id);
      setDraft(action);
      toast.success("Ação criada e conectada à direção");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transformar a direção em ação");
    } finally {
      setTransformingId(null);
    }
  };

  const getNodeCenter = (node: StrategicNode) => {
    const position = effectivePositions[node.id] ?? { x: node.position_x, y: node.position_y };
    return position;
  };

  const saveMonthlyExecution = async (
    node: StrategicNode,
    planningMonth: string,
    input: { jobId?: string | null; projectId?: string | null },
  ) => {
    const previousActionJobs = actionJobs;
    const optimisticJob: StrategicActionJob = {
      id: `optimistic-${node.id}-${planningMonth}`,
      strategic_node_id: node.id,
      planning_month: planningMonth,
      job_id: input.jobId ?? null,
      project_id: input.projectId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    queryClient.setQueryData(["strategic-map", clientId], (current: typeof mapQuery.data) =>
      current
        ? {
            ...current,
            actionJobs: [
              ...current.actionJobs.filter(
                (item) => !(item.strategic_node_id === node.id && item.planning_month === planningMonth),
              ),
              optimisticJob,
            ],
          }
        : current,
    );

    try {
      await upsertStrategicActionJob({
        strategic_node_id: node.id,
        planning_month: planningMonth,
        job_id: input.jobId ?? null,
        project_id: input.projectId ?? null,
      });
      await refresh();
      toast.success(`Execução de ${formatPlanningMonth(planningMonth)} atualizada`);
    } catch (error) {
      queryClient.setQueryData(["strategic-map", clientId], (current: typeof mapQuery.data) =>
        current ? { ...current, actionJobs: previousActionJobs } : current,
      );
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a execução mensal");
    }
  };

  const openDeliveryDialog = (node: StrategicNode, projectId?: string | null, planningMonth?: string) => {
    setJobDialogActionId(node.id);
    setJobDialogProjectId(projectId ?? null);
    setJobDialogPlanningMonth(planningMonth ?? null);
  };

  const createMonthlyCampaign = async (node: StrategicNode, planningMonth: string) => {
    try {
      const project = await createProject({
        name: `Calendário Editorial — ${formatPlanningMonth(planningMonth)}`,
        client_id: clientId,
        status: "active",
        type: "special",
      } as any);
      await saveMonthlyExecution(node, planningMonth, { projectId: project.id });
      queryClient.invalidateQueries({ queryKey: ["strategic-projects", clientId] });
      toast.success("Campanha criada. Agora adicione as entregas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a campanha");
    }
  };

  const removeConnection = async (edgeToRemove: (typeof edges)[number]) => {
    const previousEdges = edges;
    setRemovingEdgeId(edgeToRemove.id);
    queryClient.setQueryData(["strategic-map", clientId], (current: typeof mapQuery.data) =>
      current
        ? { ...current, edges: current.edges.filter((edge) => edge.id !== edgeToRemove.id) }
        : current,
    );

    try {
      await deleteStrategicEdge(edgeToRemove.id);
      await refresh();
      toast.success("Relação desconectada");
    } catch (error) {
      queryClient.setQueryData(["strategic-map", clientId], (current: typeof mapQuery.data) =>
        current ? { ...current, edges: previousEdges } : current,
      );
      toast.error(error instanceof Error ? error.message : "Não foi possível desconectar a relação");
    } finally {
      setRemovingEdgeId(null);
    }
  };

  const createConnection = async (sourceNodeId: string, targetNodeId: string) => {
    if (!plan || sourceNodeId === targetNodeId) {
      if (sourceNodeId === targetNodeId) toast.error("Escolha outro elemento para conectar");
      return;
    }

    if (edges.some((edge) => edge.source_node_id === sourceNodeId && edge.target_node_id === targetNodeId)) {
      toast.error("Essa conexão já existe");
      return;
    }

    try {
      await createStrategicEdge({
        plan_id: plan.id,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        relation: "supports",
        label: null,
      });
      await refresh();
      toast.success("Conexão criada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a conexão");
    }
  };

  const addContextualNode = async (parent: StrategicNode, type: "direction" | "action") => {
    if (!plan) return;

    const parentPosition = effectivePositions[parent.id] ?? {
      x: parent.position_x,
      y: parent.position_y,
    };
    const childPosition = {
      x: Math.min(88, parentPosition.x + 20),
      y: Math.max(12, Math.min(88, parentPosition.y + (type === "direction" ? -14 : 14))),
    };

    try {
      const child = await createStrategicNode({
        plan_id: plan.id,
        type,
        title: type === "direction" ? "Nova direção" : "Nova ação",
        description: "",
        position_x: childPosition.x,
        position_y: childPosition.y,
        sort_order: nodes.length,
        status: type === "action" ? "planned" : "draft",
        metadata: { parent_node_id: parent.id },
      });

      try {
        await createStrategicEdge({
          plan_id: plan.id,
          source_node_id: parent.id,
          target_node_id: child.id,
          relation: type === "direction" ? "leads_to" : "supports",
          label: type === "direction" ? "orienta" : "vira trabalho",
        });
      } catch (error) {
        await deleteStrategicNode(child.id);
        throw error;
      }

      await refresh();
      setActionMenuNodeId(null);
      selectNode(child);
      setDrawerOpen(true);
      toast.success(type === "direction" ? "Direção criada a partir do elemento" : "Ação criada a partir do elemento");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o elemento");
    }
  };

  const getCanvasPoint = (event: PointerEvent | React.PointerEvent, bounds: DOMRect) => ({
    x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
    y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
  });

  const getNodeAtPointer = (event: PointerEvent) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    return element?.closest<HTMLElement>("[data-strategic-node]")?.dataset.nodeId ?? null;
  };

  const handleConnectionStart = (event: React.PointerEvent, node: StrategicNode) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const center = getNodeCenter(node);
    const start = {
      x: Math.min(100, center.x + nodeSize.width / 2),
      y: center.y,
    };
    setConnectionDrag({ sourceNodeId: node.id, start, current: start });
    setConnectionTargetId(null);

    const move = (moveEvent: PointerEvent) => {
      const currentBounds = canvasRef.current?.getBoundingClientRect();
      if (!currentBounds) return;
      setConnectionDrag((current) => current ? { ...current, current: getCanvasPoint(moveEvent, currentBounds) } : current);
      setConnectionTargetId(getNodeAtPointer(moveEvent));
    };

    const end = async (endEvent: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      const targetNodeId = getNodeAtPointer(endEvent);
      setConnectionDrag(null);
      setConnectionTargetId(null);
      if (targetNodeId) await createConnection(node.id, targetNodeId);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };

  const handleDragStart = (event: React.PointerEvent, node: StrategicNode) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.metaKey || event.ctrlKey) {
      selectionOnlyRef.current = true;
      selectNode(node, true);
      return;
    }
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const nodeIds = selectedIds.has(node.id) ? new Set(selectedIds) : new Set([node.id]);
    const startPositions = Object.fromEntries(
      [...nodeIds].map((nodeId) => [nodeId, effectivePositions[nodeId]]),
    ) as Record<string, { x: number; y: number }>;
    const validNodeIds = new Set(
      [...nodeIds].filter((nodeId) => Boolean(startPositions[nodeId])),
    );
    if (!validNodeIds.size) return;

    if (!selectedIds.has(node.id) && !event.metaKey && !event.ctrlKey) {
      setSelectedIds(new Set([node.id]));
    }
    setSelectedId(node.id);
    setDraft(node);
    setActionMenuNodeId(null);
    dragStartPointerRef.current = { x: event.clientX, y: event.clientY };
    dragStartPositionsRef.current = Object.fromEntries(
      [...validNodeIds].map((nodeId) => [nodeId, startPositions[nodeId]]),
    );
    dragNodeIdsRef.current = validNodeIds;
    dragPositionRef.current = { ...dragStartPositionsRef.current };
    draggedRef.current = false;
    setDraggingIds(new Set(validNodeIds));

    const move = (moveEvent: PointerEvent) => {
      const currentBounds = canvasRef.current?.getBoundingClientRect();
      const startPointer = dragStartPointerRef.current;
      const start = dragStartPositionsRef.current;
      if (!currentBounds || !startPointer || !Object.keys(start).length) return;
      if (Math.abs(moveEvent.clientX - startPointer.x) > 3 || Math.abs(moveEvent.clientY - startPointer.y) > 3) {
        draggedRef.current = true;
      }

      const rawDelta = {
        x: ((moveEvent.clientX - startPointer.x) / currentBounds.width) * 100,
        y: ((moveEvent.clientY - startPointer.y) / currentBounds.height) * 100,
      };
      const startValues = Object.values(start);
      const minAllowedDeltaX = 8 - Math.min(...startValues.map((position) => position.x));
      const maxAllowedDeltaX = 92 - Math.max(...startValues.map((position) => position.x));
      const minAllowedDeltaY = 10 - Math.min(...startValues.map((position) => position.y));
      const maxAllowedDeltaY = 90 - Math.max(...startValues.map((position) => position.y));
      const delta = {
        x: Math.max(minAllowedDeltaX, Math.min(maxAllowedDeltaX, rawDelta.x)),
        y: Math.max(minAllowedDeltaY, Math.min(maxAllowedDeltaY, rawDelta.y)),
      };
      const positions = Object.fromEntries(
        Object.entries(start).map(([nodeId, position]) => [nodeId, {
          x: position.x + delta.x,
          y: position.y + delta.y,
        }]),
      ) as Record<string, { x: number; y: number }>;
      dragPositionRef.current = positions;
      setPositionOverrides((current) => ({ ...current, ...positions }));
      const activePosition = positions[node.id];
      if (activePosition) {
        setDraft((current) => ({
          ...current,
          position_x: activePosition.x,
          position_y: activePosition.y,
        }));
      }
    };
    const end = async () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      const positions = dragPositionRef.current;
      const nodeIdsToSave = new Set(dragNodeIdsRef.current);
      dragStartPointerRef.current = null;
      dragStartPositionsRef.current = {};
      dragNodeIdsRef.current = new Set();
      dragPositionRef.current = {};
      setDraggingIds(new Set());
      if (!draggedRef.current || !Object.keys(positions).length) return;
      try {
        await Promise.all(
          [...nodeIdsToSave].map((id) => {
            const position = positions[id];
            return position
              ? updateStrategicNode(id, {
                  position_x: position.x,
                  position_y: position.y,
                })
              : Promise.resolve();
          }),
        );
        setPositionOverrides((current) => {
          const next = { ...current };
          nodeIdsToSave.forEach((id) => delete next[id]);
          return next;
        });
        await refresh();
      } catch {
        setPositionOverrides((current) => {
          const next = { ...current };
          nodeIdsToSave.forEach((id) => delete next[id]);
          return next;
        });
        await refresh();
        toast.error("Não foi possível salvar a posição");
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };

  const removeNode = async (nodeToRemove?: StrategicNode) => {
    const removedNode = nodeToRemove ?? selected;
    if (!removedNode) return;
    const removedId = removedNode.id;
    setSelectedId(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(removedId);
      return next;
    });
    setDraft({});
    setActionMenuNodeId(null);
    setDrawerOpen(false);
    setPositionOverrides((current) => {
      const next = { ...current };
      delete next[removedId];
      return next;
    });

    queryClient.setQueryData(["strategic-map", clientId], (current: typeof mapQuery.data) =>
      current
        ? {
            ...current,
            nodes: current.nodes.filter((node) => node.id !== removedId),
            edges: current.edges.filter(
              (edge) => edge.source_node_id !== removedId && edge.target_node_id !== removedId,
            ),
          }
        : current,
    );

    try {
      await deleteStrategicNode(removedId);
      toast.success("Elemento removido");
    } catch (error) {
      await refresh();
      selectNode(removedNode);
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o elemento");
    }
  };

  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!selected || target?.closest("input, textarea, select, [contenteditable=\"true\"]")) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      event.preventDefault();
      void removeNode();
    };

    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [selected]);

  const handleNodeClick = (node: StrategicNode) => {
    if (selectionOnlyRef.current) {
      selectionOnlyRef.current = false;
      return;
    }
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    selectNode(node);
    setDrawerOpen(true);
  };

  if (mapQuery.isLoading) return <div className="flex min-h-[520px] items-center justify-center text-sm text-muted-foreground">Carregando mapa estratégico…</div>;
  if (mapQuery.error || !plan) {
    const message = mapQuery.error instanceof Error ? mapQuery.error.message : "Não foi possível carregar o mapa estratégico.";
    return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono-kasa uppercase tracking-wider text-primary"><Compass className="size-3.5" /> Mapa vivo do cliente</div>
          <Input value={plan.title} onChange={(event) => planMutation.mutate({ id: plan.id, patch: { title: event.target.value } })} className="h-8 max-w-xl border-0 bg-transparent px-0 font-display text-xl font-semibold shadow-none focus-visible:ring-0" />
          <p className="max-w-2xl text-xs text-muted-foreground">Ideias, evidências e decisões amadurecem aqui até virarem ação real para {clientName}.</p>
          <div className="flex flex-wrap gap-2 pt-2 text-[10px] font-mono-kasa text-muted-foreground"><Badge variant="outline">{nodes.length} elementos</Badge><Badge variant="outline">{actionNodes.length} ações</Badge><Badge variant="outline">{linkedCount} ligados à execução</Badge></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={nodes.length === 0 ? "default" : "outline"} onClick={() => void addNode("objective")}><Target className="mr-1.5 size-3.5" /> {nodes.length === 0 ? "Definir objetivo central" : "Adicionar objetivo"}</Button>
          {nodes.length > 0 && <Button size="sm" variant="outline" onClick={() => void organizeMap()} disabled={organizing}><LayoutGrid className="mr-1.5 size-3.5" /> {organizing ? "Organizando…" : "Organizar mapa"}</Button>}
          {nodes.length > 0 && <>
            <Button size="sm" variant="outline" onClick={selectAllVisible} disabled={selectedIds.size === visibleNodes.length}><Check className="mr-1.5 size-3.5" /> Selecionar todos</Button>
            {selectedIds.size > 0 && <Button size="sm" variant="ghost" onClick={clearSelection}>Limpar seleção ({selectedIds.size})</Button>}
          </>}
          {selected && <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}><Edit3 className="mr-1.5 size-3.5" /> Abrir detalhes</Button>}
          <span className="text-[10px] text-muted-foreground">Organize a estrutura quando quiser; depois ajuste os cards livremente. Use Ctrl/Cmd + clique para escolher vários cards.</span>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-auto rounded-lg border border-border/60">
          <div ref={canvasRef} onPointerDown={(event) => { if (event.target === event.currentTarget) clearSelection(); }} className="relative min-h-[1200px] min-w-[1500px] bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/.08),transparent_45%),linear-gradient(hsl(var(--border)/.16)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/.16)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px] md:min-h-[1350px] md:min-w-[1800px]">
          <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 space-y-3">
            <div>
              <p className="text-sm font-semibold">O que está acontecendo com {clientName}?</p>
              <p className="text-[11px] text-muted-foreground">Arraste os elementos, conecte ideias e escolha o que desce para o plano.</p>
            </div>
            <div className="flex max-w-3xl flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-card/90 px-3 py-2 text-[10px] shadow-sm backdrop-blur">
              {[['Objetivo', 'DESTINO · onde queremos chegar'], ['Direção', 'ESCOLHA · como vamos chegar'], ['Ação', 'TRABALHO · o que será feito'], ['Projeto ou Job', 'EXECUÇÃO · onde acontece'], ['Resultado', 'APRENDIZADO · o que aconteceu']].map(([label, help], index) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={cn('rounded-full px-2 py-1 font-medium', index === 0 ? 'bg-blue-600/15 text-blue-700 dark:text-blue-300' : index === 1 ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300' : index === 2 ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300' : 'bg-muted text-muted-foreground')}>{label}</span>
                  <span className="hidden text-muted-foreground sm:inline">{help}</span>
                  {index < 4 && <ArrowRight className="size-3 text-muted-foreground/60" />}
                </span>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 z-[1] size-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
            {edgeLines.map(({ edge, source, target, midX }) => {
              const incident = selectedIds.has(edge.source_node_id) || selectedIds.has(edge.target_node_id);
              return (
                <path
                  key={edge.id}
                  d={`M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`}
                  fill="none"
                  stroke="var(--primary)"
                  strokeOpacity={selectedIds.size > 0 ? (incident ? 0.78 : 0.2) : 0.42}
                  strokeWidth={incident ? 1.7 : 1.25}
                  strokeDasharray="2.2 2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-border/60 bg-card/90 px-2.5 py-1 text-[10px] font-mono-kasa text-muted-foreground shadow-sm backdrop-blur">
            {edges.length === 0 ? "Arraste uma bolinha para conectar" : `${edges.length} ${edges.length === 1 ? "conexão" : "conexões"}`}
          </div>
          {edges.length > edgeLines.length && <div className="absolute bottom-4 left-4 z-10 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-700 dark:text-amber-300">{edges.length - edgeLines.length} conexão(ões) aguardando os elementos de origem ou destino.</div>}
          {edges.length === 0 && nodes.length > 1 && <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/60 bg-card/90 px-3 py-2 text-[10px] text-muted-foreground shadow-sm">Use as bolinhas laterais para criar relações sem poluir o mapa.</div>}
          {connectionDrag && <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 z-[3] size-full overflow-visible" preserveAspectRatio="none" aria-hidden="true"><path d={`M ${connectionDrag.start.x} ${connectionDrag.start.y} C ${connectionDrag.start.x + 12} ${connectionDrag.start.y}, ${connectionDrag.current.x - 12} ${connectionDrag.current.y}, ${connectionDrag.current.x} ${connectionDrag.current.y}`} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="2.2 2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>}

          {nodes.length === 0 && <div className="absolute inset-0 flex items-center justify-center p-8 text-center"><div className="max-w-sm space-y-3"><Compass className="mx-auto size-9 text-primary/70" /><h3 className="font-display text-lg font-semibold">Comece pelo que importa</h3><p className="text-sm text-muted-foreground">Registre o objetivo do cliente ou uma evidência que sua equipe está percebendo.</p><Button size="sm" onClick={() => addNode("objective")}><Target className="mr-1.5 size-3.5" /> Criar objetivo central</Button></div></div>}

          {nodes.length > 0 && <button type="button" aria-label="Adicionar ideia solta" title="Adicionar ideia" onClick={() => void addNode()} className="absolute bottom-5 right-5 z-10 flex size-10 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"><Plus className="size-4" /></button>}
          {visibleNodes.map((node) => {
            const visual = getType(node.type);
            const Icon = visual.icon;
            const position = effectivePositions[node.id];
            const displayNode = position ? { ...node, position_x: position.x, position_y: position.y } : node;
            const nodeShape = node.type === "objective"
              ? "rounded-[28px] border-2 border-blue-600/70 bg-blue-50 dark:bg-blue-950 px-5 py-4 shadow-[0_12px_34px_-18px_hsl(221_83%_53%/.7)]"
              : node.type === "direction"
                ? "rounded-2xl border border-orange-500/60 bg-orange-50 dark:bg-orange-950 px-4 py-3 shadow-[0_10px_28px_-18px_hsl(24_95%_53%/.75)]"
                : node.type === "action"
                  ? "rounded-xl border border-teal-500/60 bg-teal-50 dark:bg-teal-950 px-4 py-3 shadow-[0_10px_28px_-18px_hsl(173_80%_40%/.75)]"
                  : node.type === "result"
                    ? "rounded-2xl border border-fuchsia-500/55 bg-fuchsia-50 dark:bg-fuchsia-950 px-4 py-3 shadow-[0_10px_28px_-18px_hsl(292_84%_61%/.65)]"
                    : "rounded-xl border border-slate-300/80 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 px-3 py-3 shadow-[0_8px_24px_-18px_hsl(var(--foreground)/.45)]";
            const nodeLabel = node.type === "objective" ? "Destino" : node.type === "direction" ? "Escolha" : node.type === "action" ? "Movimento" : node.type === "result" ? "Marco" : visual.label;
            return <div key={node.id} data-strategic-node data-node-id={node.id} style={{ left: `${displayNode.position_x}%`, top: `${displayNode.position_y}%` }} className={cn("group absolute z-[2] w-[min(270px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2", draggingIds.has(node.id) && "opacity-80", connectionTargetId === node.id && "z-[4] ring-2 ring-primary ring-offset-2 ring-offset-background")}>
              <button type="button" aria-label={`Abrir ${visual.label} ${node.title}`} onClick={() => void handleNodeClick(displayNode)} onPointerDown={(event) => handleDragStart(event, displayNode)} className={cn("relative w-full touch-none text-left transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-[1.03] focus-visible:outline-none", nodeShape, selectedIds.has(node.id) && "ring-2 ring-primary ring-offset-2 ring-offset-background", draggingIds.has(node.id) && "cursor-grabbing")}>
                <div className="mb-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[9px] font-mono-kasa uppercase tracking-[0.14em] text-muted-foreground"><Icon className="size-3" /> {nodeLabel}{getNodeTag(node.type) && <span className="rounded-full bg-background/65 px-1.5 py-0.5 text-[8px] font-semibold tracking-normal">{getNodeTag(node.type)}</span>}</span>{node.linked_job_id || node.linked_project_id ? <Link2 className="size-3 text-primary" /> : null}</div>
                <p className={cn("break-words font-semibold leading-snug", node.type === "objective" ? "text-sm" : "text-xs")}>{node.title}</p>
                {getNodePrompt(node.type) && <p className="mt-1.5 text-[9px] font-medium leading-snug text-foreground/65">{getNodePrompt(node.type)}</p>}
                {node.description && <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">{node.description}</p>}
                {node.type === "action" && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-[8px] font-medium text-teal-700 dark:text-teal-300"><CalendarDays className="size-3" /> Vai para o roadmap</span>}
              </button>
              <button type="button" aria-label={`Conectar a partir de ${node.title}`} title="Arraste para conectar" onPointerDown={(event) => handleConnectionStart(event, node)} className="absolute -right-2 top-1/2 flex size-5 -translate-y-1/2 touch-none items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="size-1.5 rounded-full bg-current" /></button>
              <span aria-hidden="true" className="absolute -left-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-muted-foreground/70 shadow-sm"><span className="size-1.5 rounded-full bg-background" /></span>
              <button type="button" aria-label={`Criar a partir de ${node.title}`} title="Criar próximo passo" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setActionMenuNodeId((current) => current === node.id ? null : node.id); setSelectedId(node.id); setDraft(node); }} className={cn("absolute -bottom-3 left-1/2 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", selectedId === node.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100")}><Plus className="size-3.5" /></button>
              {node.type === "objective" && <button type="button" aria-label={`${collapsedObjectiveIds.has(node.id) ? "Expandir" : "Recolher"} ramo do objetivo ${node.title}`} title={`${collapsedObjectiveIds.has(node.id) ? "Expandir" : "Recolher"} ramo do objetivo`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); toggleObjectiveCollapse(node.id); }} className="absolute -bottom-2 -left-2 flex size-6 items-center justify-center rounded-full border-2 border-background bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="sr-only">{collapsedObjectiveIds.has(node.id) ? "Expandir" : "Recolher"} ramo do objetivo</span>{collapsedObjectiveIds.has(node.id) ? <Eye className="size-3" /> : <EyeOff className="size-3" />}</button>}
              {node.type === "direction" && <button type="button" aria-label={`${collapsedDirectionIds.has(node.id) ? "Expandir" : "Recolher"} ramo de ${node.title}`} title={`${collapsedDirectionIds.has(node.id) ? "Expandir" : "Recolher"} ramo`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); toggleDirectionCollapse(node.id); }} className="absolute -bottom-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-background bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="sr-only">{collapsedDirectionIds.has(node.id) ? "Expandir" : "Recolher"} ramo</span>{collapsedDirectionIds.has(node.id) ? <Eye className="size-3" /> : <EyeOff className="size-3" />}</button>}
              {actionMenuNodeId === node.id && <div className="absolute left-1/2 top-full z-20 mt-2 flex -translate-x-1/2 gap-1.5 rounded-lg border border-border/70 bg-card p-1.5 shadow-xl" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => void addContextualNode(node, "direction")} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium text-orange-700 transition-colors hover:bg-orange-500/10 dark:text-orange-300"><ArrowRight className="size-3" /> Direção</button>
                <button type="button" onClick={() => void addContextualNode(node, "action")} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium text-teal-700 transition-colors hover:bg-teal-500/10 dark:text-teal-300"><Check className="size-3" /> Ação</button>
              </div>}
              {node.type === "objective" && collapsedObjectiveIds.has(node.id) && collapsedCountFor(node.id) > 0 && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border/70 bg-card px-2 py-1 text-[9px] text-muted-foreground shadow-sm">{collapsedCountFor(node.id)} itens recolhidos</span>}
              {node.type === "direction" && collapsedDirectionIds.has(node.id) && collapsedCountFor(node.id) > 0 && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border/70 bg-card px-2 py-1 text-[9px] text-muted-foreground shadow-sm">{collapsedCountFor(node.id)} itens recolhidos</span>}
              <button type="button" aria-label={`Excluir ${visual.label} ${node.title}`} title="Excluir card" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); void removeNode(node); }} className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-destructive/40 bg-background text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="size-3" /></button>
            </div>;
          })}
        </div>
        </div>

        <Sheet open={drawerOpen && Boolean(selected)} onOpenChange={(open) => { setDrawerOpen(open); if (!open) setActionMenuNodeId(null); }}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            {selected && <>
              <SheetHeader className="pr-8">
                <Badge variant="outline" className="mb-2 w-fit text-[9px] uppercase">{getType(selected.type).label}</Badge>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>{getNodeRole(selected.type) ?? "Contexto e próximos movimentos deste elemento."}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2"><label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Título</label><Input value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div>
                <div className="space-y-2"><label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Descrição</label><Textarea value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={4} /></div>
                <Button size="sm" onClick={() => void saveSelected()} disabled={savingId === selected.id}><Save className="mr-1.5 size-3.5" /> Salvar alterações</Button>
                {selected.type === "direction" && <div className="rounded-md border border-orange-600/30 bg-orange-500/10 p-3"><p className="text-[10px] font-mono-kasa uppercase tracking-wider text-orange-700 dark:text-orange-300">Escolha estratégica</p><p className="mt-1 text-xs font-medium">Esta não é a meta final.</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">É o caminho que vamos escolher para orientar várias ações.</p><Button size="sm" className="mt-3 w-full" onClick={() => void transformDirectionIntoAction()} disabled={transformingId === selected.id}><ArrowRight className="mr-1.5 size-3.5" /> {transformingId === selected.id ? "Criando trabalho…" : "Criar trabalho a partir desta escolha"}</Button></div>}
                {selected.type !== "action" && <div className="rounded-md border border-border/60 bg-muted/20 p-3"><p className="text-xs font-medium">O papel deste elemento</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{selected.type === "objective" ? "Objetivo é o destino: descreve o resultado observável que queremos alcançar." : selected.type === "direction" ? "Direção é a escolha estratégica que define como vamos buscar o objetivo." : "Este elemento ajuda a entender o contexto antes de virar uma ação planejada."}</p></div>}
                {selected.type === "action" && <div className="space-y-3 border-t border-border/60 pt-3"><div><p className="mb-1 text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Planejamento e execução</p><p className="text-[11px] leading-relaxed text-muted-foreground">A ação sai do raciocínio, entra no grid e pode virar projeto ou job.</p></div><div className="space-y-2"><div><label className="text-[10px] font-medium text-muted-foreground">Período do planejamento</label><p className="mt-1 text-[10px] text-muted-foreground">A mesma ação aparece em todos os meses entre o início e o fim.</p></div><div className="grid grid-cols-2 gap-2"><label className="space-y-1"><span className="text-[9px] text-muted-foreground">Início</span><Input type="month" value={planningRangeFor(selected).start} onChange={(event) => updateDraftPlanningRange("start", event.target.value)} /></label><label className="space-y-1"><span className="text-[9px] text-muted-foreground">Fim</span><Input type="month" value={planningRangeFor(selected).end} min={planningRangeFor(selected).start || undefined} onChange={(event) => updateDraftPlanningRange("end", event.target.value)} /></label></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={saveDraftPlanningRange}>Salvar período</Button>{(getPlanningMonths(selected).length > 0 || planningRangeFor(selected).start) && <Button size="sm" variant="ghost" onClick={clearDraftPlanningRange}>Limpar período</Button>}</div></div><div className="space-y-1.5"><label className="text-[10px] font-medium text-muted-foreground">Projeto</label><select className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={selected.linked_project_id ?? ""} onChange={(event) => void linkAction(selected, { linked_project_id: event.target.value || null, linked_job_id: event.target.value === selected.linked_project_id ? selected.linked_job_id : null })}><option value="">Sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>{getPlanningMonths(selected).length === 0 && <div className="space-y-1.5"><label className="text-[10px] font-medium text-muted-foreground">Job legado</label><select className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={selected.linked_job_id ?? ""} onChange={(event) => { const job = jobs.find((item) => item.id === event.target.value); void linkAction(selected, { linked_job_id: event.target.value || null, linked_project_id: job?.project_id ?? selected.linked_project_id ?? null }); }}><option value="">Sem job</option>{jobsForProject(selected.linked_project_id).map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>} {getPlanningMonths(selected).length > 0 && <p className="text-[10px] text-muted-foreground">Para ações com período, escolha o job dentro de cada mês na seção acima.</p>}<div className="flex flex-wrap gap-2">{selectedJob && <Button size="sm" variant="outline" onClick={() => navigate({ to: "/jobs", search: { openJobId: selectedJob.id } as any })}><ExternalLink className="mr-1.5 size-3.5" /> Abrir job legado</Button>}<Button size="sm" variant="outline" onClick={() => openDeliveryDialog(selected, selected.linked_project_id)} disabled={!stagesQuery.data?.length}><Plus className="mr-1.5 size-3.5" /> Adicionar entrega</Button></div>{getPlanningMonths(selected).length > 0 && <div className="space-y-2 rounded-md border border-teal-500/25 bg-teal-500/5 p-3"><div><p className="text-[10px] font-mono-kasa uppercase tracking-wider text-teal-700 dark:text-teal-300">Jobs por mês</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">A ação continua recorrente. Cada job abaixo pertence somente ao mês escolhido.</p></div><div className="space-y-2">{getPlanningMonths(selected).map((planningMonth) => { const monthlyLink = strategicActionJobForMonth(selected, planningMonth, actionJobs); const monthlyProject = monthlyLink?.project_id ? projects.find((project) => project.id === monthlyLink.project_id) : null; const monthlyJobs = monthlyProject ? jobsForProject(monthlyProject.id) : []; const selectedJobId = monthlyLink?.job_id ?? ""; return <div id={`strategic-month-${selected.id}-${planningMonth}`} key={planningMonth} className={cn("space-y-2 rounded-md p-1", focusedMonthlyFocus?.nodeId === selected.id && focusedMonthlyFocus.planningMonth === planningMonth && "bg-primary/10 ring-1 ring-primary/40")}><label className="text-[9px] font-medium text-muted-foreground">{formatPlanningMonth(planningMonth)}</label>{monthlyProject ? <><div className="rounded-md border border-border/60 bg-background px-2 py-2"><p className="text-[10px] font-medium">{monthlyProject.name}</p><p className="text-[9px] text-muted-foreground">{monthlyJobs.length} {monthlyJobs.length === 1 ? "entrega" : "entregas"}</p><div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="link" className="h-auto px-0 text-[10px]" onClick={() => navigate({ to: "/projetos/$projectId", params: { projectId: monthlyProject.id } })}>Abrir campanha</Button><Button type="button" size="sm" variant="link" className="h-auto px-0 text-[10px]" onClick={() => openDeliveryDialog(selected, monthlyProject.id, planningMonth)}>Adicionar entrega</Button></div></div><select className="h-8 w-full rounded-md border border-input bg-background px-2 text-[10px]" value={selectedJobId} onChange={(event) => void saveMonthlyExecution(selected, planningMonth, { jobId: event.target.value || null, projectId: monthlyProject.id })}><option value="">Sem job único</option>{monthlyJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></> : <div className="space-y-1.5"><Button type="button" size="sm" variant="outline" className="w-full text-[10px]" onClick={() => void createMonthlyCampaign(selected, planningMonth)}>Criar campanha/calendário</Button><Button type="button" size="sm" variant="ghost" className="w-full text-[10px]" onClick={() => openDeliveryDialog(selected, null, planningMonth)}>Criar job único</Button></div>}</div>; })}</div></div>}</div>}
                {selected.type !== "action" && <div className="border-t border-border/60 pt-3"><p className="mb-2 text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Execução</p>{selectedProject && <p className="text-xs">Projeto: <strong>{selectedProject.name}</strong></p>}{selectedJob && <p className="text-xs">Job: <strong>{selectedJob.title}</strong></p>}{!selectedProject && !selectedJob && <p className="text-xs text-muted-foreground">Ainda não ligado a projeto ou job.</p>}</div>}
                <div className="border-t border-border/60 pt-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Relações</p><span className="text-[10px] text-muted-foreground">{selectedRelations.length}</span></div>{selectedRelations.length > 0 ? <div className="space-y-2">{selectedRelations.map(({ edge, direction, node }) => <div key={edge.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 p-2"><div className="min-w-0"><p className="text-[9px] text-muted-foreground">{direction}</p><p className="break-words text-xs font-medium">{node.title}</p></div><Button type="button" variant="ghost" size="sm" className="shrink-0 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void removeConnection(edge)} disabled={removingEdgeId === edge.id}>Desconectar</Button></div>)}</div> : <p className="text-xs text-muted-foreground">Nenhuma relação conectada a este card.</p>}</div>
                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3"><Button variant="destructive" size="sm" onClick={() => void removeNode()}><Trash2 className="mr-1.5 size-3.5" /> Excluir card</Button><span className="text-right text-[10px] text-muted-foreground">Delete/Backspace exclui o selecionado</span></div>
              </div>
            </>}
          </SheetContent>
        </Sheet>
      </div>

      {showPlanningGrid && (
        <section className="rounded-lg border border-border/60 bg-card p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-sm font-semibold">Grid estratégico anual</h3><select aria-label="Ano do planejamento" className="h-7 rounded-md border border-input bg-background px-2 text-[10px] font-mono-kasa" value={planningYear} onChange={(event) => setPlanningYearOverride(Number(event.target.value))}>{planningYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></div><p className="mt-1 max-w-2xl text-xs text-muted-foreground">Aqui o planejamento acontece. Crie ações no mês certo ou organize as que ainda estão sem período; projetos e jobs são a execução real.</p></div><span className="text-[10px] font-mono-kasa text-muted-foreground">{actionNodes.length} {actionNodes.length === 1 ? "ação" : "ações"}</span></div>
          <div className="overflow-x-auto pb-3"><div className="min-w-[2400px]"><div className="mb-3 grid grid-cols-12 gap-3">{["1º trimestre", "2º trimestre", "3º trimestre", "4º trimestre"].map((quarter) => <div key={quarter} className="col-span-3 flex items-center gap-2 px-1 text-[9px] font-mono-kasa uppercase tracking-[0.18em] text-muted-foreground"><span className="h-px flex-1 bg-border/70" /><span>{quarter}</span><span className="h-px flex-1 bg-border/70" /></div>)}</div><div className="grid grid-cols-[repeat(12,minmax(180px,1fr))] gap-3">{actionsByMonth.map((monthActions, monthIndex) => { const month = String(monthIndex + 1).padStart(2, "0"); const isCurrentMonth = currentMonth === monthIndex + 1; return <div key={planningMonths[monthIndex]} className={cn("min-h-[190px] rounded-2xl border p-3 transition-colors", isCurrentMonth ? "border-primary/45 bg-primary/[0.04] shadow-sm" : monthIndex % 2 === 0 ? "border-border/70 bg-muted/[0.16]" : "border-border/45 bg-background/70")}><div className="mb-3 flex items-start justify-between gap-2 border-b border-border/50 pb-2.5"><div><p className={cn("text-[9px] font-mono-kasa uppercase tracking-[0.18em]", isCurrentMonth ? "text-primary" : "text-muted-foreground")}>{planningMonths[monthIndex]}</p><p className="mt-0.5 text-[10px] text-muted-foreground/70">{String(monthIndex + 1).padStart(2, "0")} · {monthActions.length} {monthActions.length === 1 ? "ação" : "ações"}</p></div><Button type="button" variant="ghost" size="icon" className="size-7 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label={`Adicionar ação em ${planningMonths[monthIndex]}`} title="Adicionar ação neste mês" onClick={() => void addActionForMonth(month)}><Plus className="size-3.5" /></Button></div><div className="space-y-2.5">{monthActions.map((node) => { const planningMonth = `${planningYear}-${month}`; const execution = actionExecution(node, planningMonth, jobs, projects, actionJobs); return <button key={node.id} type="button" onClick={() => { selectNode(node); setDrawerOpen(true); }} className="group relative w-full overflow-hidden rounded-xl border border-teal-500/25 bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-500/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="absolute inset-y-0 left-0 w-1 bg-teal-500" /><div className="pl-1.5"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[8px] font-mono-kasa font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Ação</span><ArrowRight className="size-3 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" /></div><p className="whitespace-normal break-words text-[13px] font-semibold leading-snug text-foreground">{node.title}</p><div className="mt-3 rounded-lg bg-muted/60 px-2 py-1.5"><p className="text-[8px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Execução do mês</p>{execution.detail ? <p className="mt-0.5 break-words text-[10px] font-medium text-foreground/85">{execution.detail}</p> : <p className="mt-0.5 text-[10px] font-medium text-primary">+ Adicionar job</p>}</div><span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[8px] font-medium", execution.status === "Concluído" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : execution.status === "Em andamento" ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border/70 bg-muted text-muted-foreground")}>{execution.status}</span></div></button>; })}{monthActions.length === 0 && <div className="flex min-h-[88px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-2 text-center"><CalendarDays className="mb-1 size-4 text-muted-foreground/35" /><p className="text-[9px] text-muted-foreground/60">Nenhuma ação planejada</p></div>}</div></div>; })}</div></div></div>
          <div className="mt-3 rounded-md border border-dashed border-border/70 bg-muted/10 p-3"><div className="mb-2 flex items-center justify-between gap-2"><div><span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Sem período</span><p className="mt-1 text-[10px] text-muted-foreground">Ações criadas a partir do mapa que ainda precisam de uma data.</p></div><div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground">{unscheduledActions.length}</span><Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => void addActionForMonth()}><Plus className="mr-1 size-3" /> Adicionar ação</Button></div></div>{unscheduledActions.length > 0 ? <div className="flex flex-wrap gap-2">{unscheduledActions.map((node) => { const project = node.linked_project_id ? projects.find((item) => item.id === node.linked_project_id) : null; const job = node.linked_job_id ? jobs.find((item) => item.id === node.linked_job_id) : null; return <button key={node.id} type="button" onClick={() => selectNode(node)} className="rounded border border-border/70 bg-background px-2.5 py-2 text-left text-[11px] transition-colors hover:border-primary/50"><span className="font-medium">{node.title}</span><span className="ml-2 text-[9px] text-muted-foreground">{job ? "Job ligado" : project ? "Projeto ligado" : "Definir mês"}</span></button>; })}</div> : <p className="text-[10px] text-muted-foreground">Nenhuma ação fora do calendário.</p>}</div>
        </section>
      )}

      {selectedJobDialogAction && stagesQuery.data?.[0] && <NewJobDialog stage={stagesQuery.data[0]} open={Boolean(jobDialogActionId)} onOpenChange={(open) => { if (!open) { setJobDialogActionId(null); setJobDialogProjectId(null); setJobDialogPlanningMonth(null); } }} defaultClientId={clientId} defaultProjectId={jobDialogProjectId ?? selectedJobDialogAction.linked_project_id ?? undefined} defaultStrategicNodeId={selectedJobDialogAction.id} defaultPlanningMonth={jobDialogPlanningMonth ?? undefined} defaultTitle={selectedJobDialogAction.title} defaultDescription={selectedJobDialogAction.description ?? undefined} onCreated={async (job) => { if (jobDialogPlanningMonth) { await saveMonthlyExecution(selectedJobDialogAction, jobDialogPlanningMonth, { jobId: job.id, projectId: job.project_id ?? jobDialogProjectId }); } else { await linkAction(selectedJobDialogAction, { linked_job_id: job.id, linked_project_id: job.project_id ?? selectedJobDialogAction.linked_project_id ?? null }); } setJobDialogActionId(null); setJobDialogProjectId(null); setJobDialogPlanningMonth(null); }} />}
    </div>
  );
}

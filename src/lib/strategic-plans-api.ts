import { supabase } from "@/integrations/supabase/client";

export type StrategicNodeType =
  | "objective"
  | "evidence"
  | "idea"
  | "hypothesis"
  | "direction"
  | "action"
  | "result";

export type StrategicNodeStatus = "draft" | "active" | "planned" | "done" | "archived";

export interface StrategicPlan {
  id: string;
  client_id: string;
  title: string;
  cycle_start: string | null;
  cycle_end: string | null;
  main_goal: string;
  status: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategicNode {
  id: string;
  plan_id: string;
  type: StrategicNodeType;
  title: string;
  description: string | null;
  color: string | null;
  position_x: number;
  position_y: number;
  sort_order: number;
  status: StrategicNodeStatus;
  linked_project_id: string | null;
  linked_job_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StrategicEdge {
  id: string;
  plan_id: string;
  source_node_id: string;
  target_node_id: string;
  relation: string;
  label: string | null;
  created_at: string;
}

export interface StrategicActionJob {
  id: string;
  strategic_node_id: string;
  planning_month: string;
  job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategicMapData {
  plan: StrategicPlan | null;
  nodes: StrategicNode[];
  edges: StrategicEdge[];
  actionJobs: StrategicActionJob[];
}

export const strategicMapQueryKey = (clientId: string) => ["strategic-map", clientId] as const;

export const planningMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getPlanningRange(metadata: Record<string, unknown> | null | undefined) {
  const legacy = typeof metadata?.planning_month === "string" && planningMonthPattern.test(metadata.planning_month)
    ? metadata.planning_month
    : null;
  const start = typeof metadata?.planning_start === "string" && planningMonthPattern.test(metadata.planning_start)
    ? metadata.planning_start
    : legacy;
  const end = typeof metadata?.planning_end === "string" && planningMonthPattern.test(metadata.planning_end)
    ? metadata.planning_end
    : legacy;

  if (!start || !end || start > end) return null;
  return { start, end };
}

export function planningMonthsInRange(metadata: Record<string, unknown> | null | undefined) {
  const range = getPlanningRange(metadata);
  if (!range) return [];

  const months: string[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    months.push(cursor);
    const [year, month] = cursor.split("-").map(Number);
    const next = new Date(year, month, 1);
    cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  return months;
}

export function strategicActionJobForMonth(
  node: Pick<StrategicNode, "id" | "type" | "linked_job_id" | "metadata">,
  planningMonth: string,
  actionJobs: StrategicActionJob[],
) {
  if (node.type !== "action") return null;

  const monthlyJobs = actionJobs.filter((item) => item.strategic_node_id === node.id);
  const monthlyJob = monthlyJobs.find((item) => item.planning_month === planningMonth);
  if (monthlyJob) return monthlyJob;
  if (monthlyJobs.length > 0) return null;

  const range = getPlanningRange(node.metadata);
  return node.linked_job_id && range?.start === planningMonth
    ? { strategic_node_id: node.id, planning_month: planningMonth, job_id: node.linked_job_id }
    : null;
}

function assertPlanningMonth(planningMonth: string) {
  if (!planningMonthPattern.test(planningMonth)) {
    throw new Error("O mês da execução precisa estar no formato AAAA-MM.");
  }
}

const db = supabase as any;

function strategicSchemaError(error: { code?: string; message?: string }) {
  return new Error(
    error.code === "42P01" || error.code === "PGRST205"
      ? "O banco ainda não recebeu a estrutura do Mapa Estratégico. Publique as migrations 20261117210000_create_client_strategic_map.sql e 20261121120000_create_strategic_action_jobs.sql no Supabase/Lovable."
      : error.message ?? "Não foi possível acessar o Mapa Estratégico.",
  );
}

/** Read-only: opening the workspace must never create a plan implicitly. */
export async function fetchStrategicMap(clientId: string): Promise<StrategicMapData> {
  const { data: plan, error: planError } = await db
    .from("strategic_plans")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (planError) throw strategicSchemaError(planError);
  if (!plan) return { plan: null, nodes: [], edges: [], actionJobs: [] };

  const { data: nodes, error: nodesError } = await db
    .from("strategic_nodes")
    .select("*")
    .eq("plan_id", plan.id)
    .order("sort_order", { ascending: true });
  if (nodesError) throw nodesError;

  const actionNodeIds = (nodes ?? [])
    .filter((node: { type: string }) => node.type === "action")
    .map((node: { id: string }) => node.id);
  const [
    { data: edges, error: edgesError },
    { data: actionJobs, error: actionJobsError },
  ] = await Promise.all([
    db.from("strategic_edges").select("*").eq("plan_id", plan.id),
    actionNodeIds.length
      ? db.from("strategic_action_jobs").select("*").in("strategic_node_id", actionNodeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (edgesError) throw edgesError;
  if (actionJobsError && actionJobsError.code !== "42P01" && actionJobsError.code !== "PGRST205") {
    throw actionJobsError;
  }

  return {
    plan: plan as StrategicPlan,
    nodes: (nodes ?? []) as StrategicNode[],
    edges: (edges ?? []) as StrategicEdge[],
    actionJobs: (actionJobs ?? []) as StrategicActionJob[],
  };
}

export async function createStrategicPlan(input: Pick<StrategicPlan, "client_id"> & Partial<Pick<StrategicPlan, "title" | "main_goal" | "cycle_start" | "cycle_end">>) {
  const { data, error } = await db
    .from("strategic_plans")
    .insert({
      client_id: input.client_id,
      title: input.title ?? "Plano estratégico",
      main_goal: input.main_goal ?? "",
      cycle_start: input.cycle_start ?? null,
      cycle_end: input.cycle_end ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as StrategicPlan;
}

export async function updateStrategicPlan(id: string, patch: Partial<Pick<StrategicPlan, "title" | "main_goal" | "cycle_start" | "cycle_end">>) {
  const { data, error } = await db.from("strategic_plans").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as StrategicPlan;
}

export async function createStrategicNode(input: {
  plan_id: string;
  type: StrategicNodeType;
  title: string;
  description?: string | null;
  color?: string | null;
  position_x?: number;
  position_y?: number;
  sort_order?: number;
  status?: StrategicNodeStatus;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await db.from("strategic_nodes").insert(input).select("*").single();
  if (error) throw error;
  return data as StrategicNode;
}

export async function updateStrategicNode(id: string, patch: Partial<StrategicNode>) {
  const allowed = {
    type: patch.type,
    title: patch.title,
    description: patch.description,
    color: patch.color,
    position_x: patch.position_x,
    position_y: patch.position_y,
    sort_order: patch.sort_order,
    status: patch.status,
    linked_project_id: patch.linked_project_id,
    linked_job_id: patch.linked_job_id,
    metadata: patch.metadata,
  };
  const cleanPatch = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
  const { data, error } = await db.from("strategic_nodes").update(cleanPatch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as StrategicNode;
}

export async function deleteStrategicNode(id: string) {
  const { count, error } = await db
    .from("strategic_nodes")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw error;
  if (count !== 1) throw new Error("O elemento não foi removido. Verifique suas permissões no mapa estratégico.");
}

export async function createStrategicEdge(input: Omit<StrategicEdge, "id" | "created_at">) {
  const { data, error } = await db.from("strategic_edges").insert(input).select("*").single();
  if (error) throw error;
  return data as StrategicEdge;
}

export async function deleteStrategicEdge(id: string) {
  const { error } = await db.from("strategic_edges").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertStrategicActionJob(input: {
  strategic_node_id: string;
  planning_month: string;
  job_id: string | null;
}) {
  assertPlanningMonth(input.planning_month);
  const { data, error } = await db
    .from("strategic_action_jobs")
    .upsert(input, { onConflict: "strategic_node_id,planning_month" })
    .select("*")
    .single();

  if (error) throw strategicSchemaError(error);
  return data as StrategicActionJob;
}

export async function clearStrategicActionJob(nodeId: string, planningMonth: string) {
  return upsertStrategicActionJob({
    strategic_node_id: nodeId,
    planning_month: planningMonth,
    job_id: null,
  });
}

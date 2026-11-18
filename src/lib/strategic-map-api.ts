import { supabase } from "@/integrations/supabase/client";

export const NODE_TYPES = ["objective", "evidence", "idea", "hypothesis", "direction", "action", "result"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const NODE_LABELS: Record<NodeType, string> = {
  objective: "Objetivo", evidence: "Evidência", idea: "Ideia", hypothesis: "Hipótese",
  direction: "Direção", action: "Ação", result: "Resultado",
};

export interface StrategicNode {
  id: string; plan_id: string; type: NodeType; title: string; description: string | null;
  position_x: number; position_y: number;
}
export interface StrategicEdge { id: string; plan_id: string; source_node_id: string; target_node_id: string }

/** Busca (ou cria) o plano do cliente com nós e conexões. */
export async function fetchStrategicMap(clientId: string) {
  let { data: plan, error } = await supabase.from("strategic_plans").select("*")
    .eq("client_id", clientId).order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  if (!plan) {
    const ins = await supabase.from("strategic_plans").insert({ client_id: clientId }).select("*").single();
    if (ins.error) throw ins.error;
    plan = ins.data;
  }
  const [n, e] = await Promise.all([
    supabase.from("strategic_nodes").select("*").eq("plan_id", plan.id).order("sort_order"),
    supabase.from("strategic_edges").select("*").eq("plan_id", plan.id),
  ]);
  if (n.error) throw n.error;
  if (e.error) throw e.error;
  return { plan, nodes: (n.data ?? []) as StrategicNode[], edges: (e.data ?? []) as StrategicEdge[] };
}

export async function createNode(planId: string, type: NodeType, x: number, y: number) {
  const { data, error } = await supabase.from("strategic_nodes")
    .insert({ plan_id: planId, type, title: `Novo(a) ${NODE_LABELS[type].toLowerCase()}`, position_x: x, position_y: y })
    .select("*").single();
  if (error) throw error;
  return data as StrategicNode;
}

export async function updateNode(id: string, patch: Partial<Pick<StrategicNode, "title" | "position_x" | "position_y">>) {
  const { error } = await supabase.from("strategic_nodes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNode(id: string) {
  const { error } = await supabase.from("strategic_nodes").delete().eq("id", id);
  if (error) throw error;
}

export async function createEdge(planId: string, source: string, target: string) {
  const { data, error } = await supabase.from("strategic_edges")
    .insert({ plan_id: planId, source_node_id: source, target_node_id: target }).select("*").single();
  if (error) throw error;
  return data as StrategicEdge;
}

export async function deleteEdge(id: string) {
  const { error } = await supabase.from("strategic_edges").delete().eq("id", id);
  if (error) throw error;
}

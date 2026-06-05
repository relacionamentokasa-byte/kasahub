import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProposalEventType =
  | "created"
  | "edited"
  | "sent"
  | "viewed"
  | "approved"
  | "reopened"
  | "cancelled"
  | "rejected";

export type ProposalEvent = {
  id: string;
  proposal_id: string;
  type: ProposalEventType | string;
  actor_id: string | null;
  actor_name: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export async function recordProposalEvent(
  proposalId: string,
  type: ProposalEventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const actor_id = userData.user?.id ?? null;
  let actor_name: string | null =
    (userData.user?.user_metadata as Record<string, unknown> | null)?.["full_name"] as string | null ??
    (userData.user?.user_metadata as Record<string, unknown> | null)?.["name"] as string | null ??
    userData.user?.email ?? null;
  if (actor_id && !actor_name) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", actor_id)
      .maybeSingle();
    actor_name = prof?.display_name ?? prof?.full_name ?? null;
  }
  await supabase.from("proposal_events").insert({
    proposal_id: proposalId,
    type,
    actor_id,
    actor_name,
    payload: payload as never,
  });
}

export async function recordProposalEventAdmin(
  sb: SupabaseClient,
  proposalId: string,
  type: ProposalEventType,
  payload: Record<string, unknown> = {},
  actor: { id?: string | null; name?: string | null } = {},
): Promise<void> {
  await sb.from("proposal_events").insert({
    proposal_id: proposalId,
    type,
    actor_id: actor.id ?? null,
    actor_name: actor.name ?? null,
    payload: payload as never,
  });
}

export async function fetchProposalEvents(proposalId: string): Promise<ProposalEvent[]> {
  const { data, error } = await supabase
    .from("proposal_events")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProposalEvent[];
}

export const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: "Proposta criada", color: "text-foreground/70" },
  edited: { label: "Proposta editada", color: "text-foreground/70" },
  sent: { label: "Proposta enviada", color: "text-blue-300" },
  viewed: { label: "Proposta visualizada", color: "text-amber-300" },
  approved: { label: "Proposta aprovada", color: "text-green-300" },
  reopened: { label: "Proposta reaberta", color: "text-purple-300" },
  cancelled: { label: "Proposta cancelada", color: "text-red-300" },
  structure_removed: { label: "Estrutura removida", color: "text-gray-400" },
  rejected: { label: "Proposta recusada", color: "text-red-300" },
};

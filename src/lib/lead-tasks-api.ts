import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LeadTask = Database["public"]["Tables"]["lead_tasks"]["Row"];

export const CONTACT_STATUS_OPTIONS = [
  { value: "not_contacted", label: "Não contatado", color: "bg-foreground/10 text-foreground/70" },
  { value: "attempted", label: "Tentativa de contato", color: "bg-amber-500/15 text-amber-600" },
  { value: "contacted", label: "Contato estabelecido", color: "bg-sky-500/15 text-sky-600" },
  { value: "awaiting_response", label: "Aguardando retorno", color: "bg-purple-500/15 text-purple-600" },
  { value: "meeting_scheduled", label: "Reunião agendada", color: "bg-primary/15 text-primary" },
  { value: "no_response", label: "Sem retorno", color: "bg-destructive/15 text-destructive" },
] as const;

export type ContactStatus = (typeof CONTACT_STATUS_OPTIONS)[number]["value"];

export const TASK_TYPES = [
  { value: "follow_up", label: "Follow-up" },
  { value: "call", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "meeting", label: "Reunião" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Outra" },
] as const;

export async function fetchLeadTasks(leadId: string): Promise<LeadTask[]> {
  const { data, error } = await supabase
    .from("lead_tasks")
    .select("*")
    .eq("lead_id", leadId)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOpenTaskCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("lead_tasks")
    .select("lead_id, due_date, status")
    .eq("status", "pending");
  if (error) throw error;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const counts: Record<string, number> = {};
  for (const t of data ?? []) {
    if (!t.due_date) continue;
    if (new Date(t.due_date) <= today) {
      counts[t.lead_id] = (counts[t.lead_id] ?? 0) + 1;
    }
  }
  return counts;
}

export type NextLeadTask = Pick<
  LeadTask,
  "id" | "lead_id" | "title" | "type" | "due_date" | "assigned_to"
>;

export async function fetchNextTasksByLead(): Promise<Record<string, NextLeadTask>> {
  const { data, error } = await supabase
    .from("lead_tasks")
    .select("id, lead_id, title, type, due_date, assigned_to, status")
    .eq("status", "pending")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  const map: Record<string, NextLeadTask> = {};
  for (const t of data ?? []) {
    if (!map[t.lead_id]) {
      map[t.lead_id] = {
        id: t.id,
        lead_id: t.lead_id,
        title: t.title,
        type: t.type,
        due_date: t.due_date,
        assigned_to: t.assigned_to,
      };
    }
  }
  return map;
}

export async function createLeadTask(input: {
  lead_id: string;
  title: string;
  description?: string | null;
  type?: string;
  due_date?: string | null;
  assigned_to?: string | null;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("lead_tasks")
    .insert({
      lead_id: input.lead_id,
      title: input.title,
      description: input.description ?? null,
      type: input.type ?? "follow_up",
      due_date: input.due_date ?? null,
      assigned_to: input.assigned_to ?? userData.user?.id ?? null,
      created_by: userData.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLeadTask(
  id: string,
  patch: Partial<Database["public"]["Tables"]["lead_tasks"]["Update"]>,
) {
  const { data, error } = await supabase
    .from("lead_tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeLeadTask(id: string) {
  return updateLeadTask(id, {
    status: "done",
    completed_at: new Date().toISOString(),
  });
}

export async function deleteLeadTask(id: string) {
  const { error } = await supabase.from("lead_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function updateStageFollowUpDays(
  stageId: string,
  days: number | null,
) {
  const { error } = await supabase
    .from("lead_stages")
    .update({ follow_up_days: days })
    .eq("id", stageId);
  if (error) throw error;
}

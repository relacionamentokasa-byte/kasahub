/** Rules shared by notification routines: which CRM leads still deserve alerts. */
export interface LeadStatusShape {
  won_at: string | null;
  lost_reason: string | null;
  lead_stages: { is_won: boolean | null; is_lost: boolean | null } | null;
}

/** A lead is active when it exists, is not won/lost by stage, and has no won_at / lost_reason. */
export function isLeadActive(lead: LeadStatusShape | null | undefined): boolean {
  if (!lead) return false;
  if (lead.won_at) return false;
  if (lead.lost_reason && lead.lost_reason.trim() !== "") return false;
  if (lead.lead_stages?.is_won || lead.lead_stages?.is_lost) return false;
  return true;
}

/** Calendar day in São Paulo (YYYY-MM-DD), used for once-per-day dedupe keys. */
export function saoPauloDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

export const leadTaskDedupeKey = (taskId: string, day: string) => `lead_task:${taskId}:${day}`;
export const morningSummaryDedupeKey = (userId: string, day: string) => `morning_summary:${userId}:${day}`;

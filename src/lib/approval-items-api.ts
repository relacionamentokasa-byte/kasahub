import { supabase } from "@/integrations/supabase/client";

export type ApprovalContentType = "image" | "video" | "pdf" | "text";
export type ApprovalItemStatus = "pending" | "approved" | "rejected" | "archived";

export interface ApprovalItem {
  id: string;
  client_id: string;
  project_id: string | null;
  job_id: string | null;
  title: string;
  description: string | null;
  content_type: ApprovalContentType;
  content_url: string | null;
  content_text: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  status: ApprovalItemStatus;
  feedback: string | null;
  sent_for_approval_at: string;
  viewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const sb = supabase as any;

export async function createApprovalItem(input: {
  client_id: string;
  project_id?: string | null;
  job_id?: string | null;
  title: string;
  description?: string | null;
  content_type: ApprovalContentType;
  content_url?: string | null;
  content_text?: string | null;
  caption?: string | null;
  thumbnail_url?: string | null;
}): Promise<ApprovalItem> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await sb
    .from("approval_items")
    .insert({
      ...input,
      created_by: u.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ApprovalItem;
}

export async function listApprovalItems(filters?: {
  client_id?: string;
  status?: ApprovalItemStatus;
}): Promise<ApprovalItem[]> {
  let q = sb.from("approval_items").select("*").order("created_at", { ascending: false });
  if (filters?.client_id) q = q.eq("client_id", filters.client_id);
  if (filters?.status) q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ApprovalItem[];
}

export async function deleteApprovalItem(id: string) {
  const { error } = await sb.from("approval_items").delete().eq("id", id);
  if (error) throw error;
}

export async function archiveApprovalItem(id: string) {
  const { error } = await sb
    .from("approval_items")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function unarchiveApprovalItem(id: string) {
  const { error } = await sb
    .from("approval_items")
    .update({ status: "pending", archived_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function listJobApprovalItems(jobId: string): Promise<ApprovalItem[]> {
  const { data, error } = await sb
    .from("approval_items")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApprovalItem[];
}

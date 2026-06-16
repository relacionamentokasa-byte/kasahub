import { supabase } from "@/integrations/supabase/client";

export type ApprovalContentType = "image" | "video" | "pdf" | "text";
export type ApprovalItemStatus = "pending" | "approved" | "rejected" | "archived";
export type ApprovalFormat = "single" | "carousel" | "story";
export type SlideStatus = "pending" | "approved" | "rejected";

export interface ApprovalSlide {
  id: string;
  url: string;
  mime_type?: string | null;
  thumbnail_url?: string | null;
  kind?: "image" | "video";
}

export interface ApprovalItemComment {
  id: string;
  approval_item_id: string;
  slide_id: string | null;
  author_type: "client" | "team";
  author_name: string | null;
  author_id: string | null;
  body: string;
  is_change_request: boolean;
  created_at: string;
}

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
  format: ApprovalFormat;
  slides: ApprovalSlide[];
  slide_statuses: Record<string, SlideStatus>;
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
  format?: ApprovalFormat;
  slides?: ApprovalSlide[];
}): Promise<ApprovalItem> {
  const { data: u } = await supabase.auth.getUser();
  const payload: Record<string, unknown> = {
    ...input,
    format: input.format ?? "single",
    slides: input.slides ?? [],
    slide_statuses:
      input.format && input.format !== "single" && input.slides?.length
        ? Object.fromEntries(input.slides.map((s) => [s.id, "pending"]))
        : {},
    created_by: u.user?.id ?? null,
  };
  const { data, error } = await sb.from("approval_items").insert(payload).select().single();
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

export async function listApprovalItemComments(itemId: string): Promise<ApprovalItemComment[]> {
  const { data, error } = await sb
    .from("approval_item_comments")
    .select("*")
    .eq("approval_item_id", itemId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ApprovalItemComment[];
}

export async function addTeamComment(input: {
  approval_item_id: string;
  body: string;
  slide_id?: string | null;
}): Promise<ApprovalItemComment> {
  const { data: u } = await supabase.auth.getUser();
  const { data: prof } = u.user
    ? await sb.from("profiles").select("display_name, full_name").eq("id", u.user.id).maybeSingle()
    : { data: null };
  const { data, error } = await sb
    .from("approval_item_comments")
    .insert({
      approval_item_id: input.approval_item_id,
      slide_id: input.slide_id ?? null,
      author_type: "team",
      author_id: u.user?.id ?? null,
      author_name: prof?.display_name || prof?.full_name || "Time",
      body: input.body,
      is_change_request: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ApprovalItemComment;
}

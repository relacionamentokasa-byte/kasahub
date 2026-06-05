import { supabase } from "@/integrations/supabase/client";

export type ApprovalStatus = "draft" | "pending" | "changes_requested" | "approved" | "published";
export type ApprovalKind = "post" | "reel" | "story" | "carousel" | "video" | "art";

export interface Approval {
  id: string;
  client_id: string;
  project_id: string | null;
  job_id: string | null;
  title: string;
  caption: string | null;
  kind: ApprovalKind;
  status: ApprovalStatus;
  current_version: number;
  cover_url: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAsset {
  id: string;
  approval_id: string;
  version: number;
  url: string;
  mime_type: string | null;
  position: number;
  created_by: string;
  created_at: string;
}

export interface ApprovalComment {
  id: string;
  approval_id: string;
  author_id: string;
  author_role: string;
  body: string;
  is_change_request: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  client_id: string | null;
  project_id: string | null;
  approval_id: string | null;
  title: string;
  description: string | null;
  kind: "post" | "meeting" | "deadline" | "task" | "other";
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  color: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// loosely-typed supabase client for tables not in generated types yet
const sb = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
  storage: typeof supabase.storage;
  auth: typeof supabase.auth;
};

// ---------- Approvals ----------

export async function fetchApprovals(filters?: { clientId?: string; status?: ApprovalStatus }) {
  let q = sb.from("approvals").select("*").order("created_at", { ascending: false });
  if (filters?.clientId) q = q.eq("client_id", filters.clientId);
  if (filters?.status) q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Approval[];
}

export async function fetchApproval(id: string) {
  const { data, error } = await sb.from("approvals").select("*").eq("id", id).single();
  if (error) throw error;
  return data as unknown as Approval;
}

export async function fetchApprovalAssets(approvalId: string) {
  const { data, error } = await sb
    .from("approval_assets")
    .select("*")
    .eq("approval_id", approvalId)
    .order("version", { ascending: false })
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ApprovalAsset[];
}

export async function fetchApprovalComments(approvalId: string) {
  const { data, error } = await sb
    .from("approval_comments")
    .select("*")
    .eq("approval_id", approvalId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ApprovalComment[];
}

export async function createApproval(input: {
  client_id: string;
  title: string;
  caption?: string;
  kind?: ApprovalKind;
  scheduled_for?: string | null;
  project_id?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await sb
    .from("approvals")
    .insert({
      ...input,
      kind: input.kind ?? "post",
      status: "pending",
      created_by: u.user?.id,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Approval;
}

export async function updateApprovalStatus(id: string, status: ApprovalStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === "approved") {
    const { data: u } = await supabase.auth.getUser();
    patch.approved_at = new Date().toISOString();
    patch.approved_by = u.user?.id;
  }
  if (status === "published") patch.published_at = new Date().toISOString();
  const { error } = await sb.from("approvals").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteApproval(id: string) {
  const { error } = await sb.from("approvals").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadApprovalAsset(approvalId: string, file: File, version: number) {
  const { data: u } = await supabase.auth.getUser();
  const path = `${approvalId}/v${version}-${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
  const { error: upErr } = await sb.storage.from("approvals").upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (upErr) throw upErr;
  const { data: pub } = sb.storage.from("approvals").getPublicUrl(path);
  const { data, error } = await sb
    .from("approval_assets")
    .insert({
      approval_id: approvalId,
      version,
      url: pub.publicUrl,
      mime_type: file.type,
      created_by: u.user?.id,
    } as never)
    .select()
    .single();
  if (error) throw error;
  // Update cover if first asset
  await sb
    .from("approvals")
    .update({ cover_url: pub.publicUrl, current_version: version } as never)
    .eq("id", approvalId);
  return data as unknown as ApprovalAsset;
}

export async function addApprovalComment(input: {
  approval_id: string;
  body: string;
  is_change_request?: boolean;
  author_role?: "team" | "client";
}) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await sb
    .from("approval_comments")
    .insert({
      approval_id: input.approval_id,
      body: input.body,
      is_change_request: input.is_change_request ?? false,
      author_role: input.author_role ?? "team",
      author_id: u.user?.id,
    } as never)
    .select()
    .single();
  if (error) throw error;
  if (input.is_change_request) {
    await updateApprovalStatus(input.approval_id, "changes_requested");
  }
  return data as unknown as ApprovalComment;
}

// ---------- Calendar ----------

export async function fetchCalendarEvents(filters?: {
  clientId?: string;
  from?: string;
  to?: string;
}) {
  let q = sb.from("calendar_events").select("*").order("starts_at", { ascending: true });
  if (filters?.clientId) q = q.eq("client_id", filters.clientId);
  if (filters?.from) q = q.gte("starts_at", filters.from);
  if (filters?.to) q = q.lte("starts_at", filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as CalendarEvent[];
}

export async function createCalendarEvent(input: {
  client_id?: string | null;
  project_id?: string | null;
  approval_id?: string | null;
  title: string;
  description?: string;
  kind?: CalendarEvent["kind"];
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  color?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await sb
    .from("calendar_events")
    .insert({
      ...input,
      kind: input.kind ?? "post",
      created_by: u.user?.id,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CalendarEvent;
}

export async function deleteCalendarEvent(id: string) {
  const { error } = await sb.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Portal client lookup ----------
export async function fetchMyPortalClient() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("portal_user_id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export const STATUS_LABEL: Record<ApprovalStatus, string> = {
  draft: "Rascunho",
  pending: "Aguardando",
  changes_requested: "Ajustes",
  approved: "Aprovado",
  published: "Publicado",
};

export const STATUS_COLOR: Record<ApprovalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  changes_requested: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  published: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

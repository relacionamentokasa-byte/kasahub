import { supabase } from "@/integrations/supabase/client";

export type SocialNetwork = "instagram" | "youtube" | "tiktok" | "linkedin" | "facebook" | "other";
export type EditorialContentType = "reels" | "static" | "carousel";
export type EditorialStatus = "planned" | "in_production" | "review" | "approved";

export interface EditorialPost {
  id: string;
  client_id: string;
  title: string;
  scheduled_at: string;
  social_network: SocialNetwork;
  content_type: EditorialContentType;
  description: string | null;
  status: EditorialStatus;
  job_id: string | null;
  created_at: string;
  updated_at: string;
}

export const SOCIAL_LABEL: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  other: "Outro",
};

export const SOCIAL_COLOR: Record<SocialNetwork, string> = {
  instagram: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  youtube: "bg-red-500/20 text-red-300 border-red-500/40",
  tiktok: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  linkedin: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  facebook: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  other: "bg-muted text-foreground/60 border-border",
};

export const CONTENT_TYPE_LABEL: Record<EditorialContentType, string> = {
  reels: "Reels",
  static: "Estático",
  carousel: "Carrossel",
};

export const STATUS_LABEL: Record<EditorialStatus, string> = {
  planned: "Planejado",
  in_production: "Em produção",
  review: "Revisão",
  approved: "Aprovado",
};

export const STATUS_COLOR: Record<EditorialStatus, string> = {
  planned: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  in_production: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  review: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export async function listEditorialPosts(filters: {
  clientId: string;
  from?: string;
  to?: string;
  social?: SocialNetwork;
  contentType?: EditorialContentType;
  status?: EditorialStatus;
}): Promise<EditorialPost[]> {
  let q = supabase
    .from("editorial_posts")
    .select("*")
    .eq("client_id", filters.clientId)
    .order("scheduled_at", { ascending: true });
  if (filters.from) q = q.gte("scheduled_at", filters.from);
  if (filters.to) q = q.lte("scheduled_at", filters.to);
  if (filters.social) q = q.eq("social_network", filters.social);
  if (filters.contentType) q = q.eq("content_type", filters.contentType);
  if (filters.status) q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EditorialPost[];
}

export async function createEditorialPost(input: Partial<EditorialPost> & {
  client_id: string;
  title: string;
  scheduled_at: string;
  social_network: SocialNetwork;
  content_type: EditorialContentType;
}) {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("editorial_posts")
    .insert({ ...input, created_by: user.user?.id } as any)
    .select()
    .single();
  if (error) throw error;
  return data as EditorialPost;
}

export async function updateEditorialPost(id: string, patch: Partial<EditorialPost>) {
  const { data, error } = await supabase
    .from("editorial_posts")
    .update(patch as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as EditorialPost;
}

export async function deleteEditorialPost(id: string) {
  const { error } = await supabase.from("editorial_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function approveAllPostsForMonth(clientId: string, monthStart: Date) {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString();
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString();
  const { error } = await supabase
    .from("editorial_posts")
    .update({ status: "approved" as EditorialStatus } as any)
    .eq("client_id", clientId)
    .in("status", ["in_production", "review"])
    .gte("scheduled_at", start)
    .lt("scheduled_at", end);
  if (error) throw error;
}

export async function approvePost(id: string) {
  return updateEditorialPost(id, { status: "approved" });
}

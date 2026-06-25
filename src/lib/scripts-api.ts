import { supabase } from "@/integrations/supabase/client";

export type ScriptContentType = "reels" | "youtube" | "story" | "live" | "event" | "institutional" | "other";
export type ScriptPlatform = "instagram" | "youtube" | "tiktok" | "linkedin" | "facebook" | "other";
export type ScriptVideoFormat = "vertical" | "horizontal" | "square";
export type ScriptStatus = "draft" | "review" | "approved";

export interface Script {
  id: string;
  job_id: string;
  client_id: string;
  title: string;
  content_type: ScriptContentType;
  platform: ScriptPlatform;
  estimated_duration_sec: number | null;
  video_format: ScriptVideoFormat | null;
  status: ScriptStatus;
  created_at: string;
  updated_at: string;
}

export interface ScriptScene {
  id: string;
  script_id: string;
  scene_number: number;
  visual: string;
  speech: string | null;
  duration_sec: number | null;
  production_notes: string | null;
  reference_url: string | null;
  reference_image_url: string | null;
}

export async function uploadSceneReference(scriptId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `scenes/${scriptId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false, cacheControl: "3600" });
  if (error) throw error;
  return supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
}

export const SCRIPT_CONTENT_LABEL: Record<ScriptContentType, string> = {
  reels: "Reels",
  youtube: "YouTube",
  story: "Story",
  live: "Live",
  event: "Evento",
  institutional: "Institucional",
  other: "Outro",
};

export const SCRIPT_STATUS_LABEL: Record<ScriptStatus, string> = {
  draft: "Rascunho",
  review: "Revisão",
  approved: "Aprovado",
};

export const SCRIPT_STATUS_COLOR: Record<ScriptStatus, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  review: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export async function listScripts(filters: {
  clientId?: string;
  jobId?: string;
  status?: ScriptStatus;
  contentType?: ScriptContentType;
  platform?: ScriptPlatform;
} = {}): Promise<(Script & { jobs?: { id: string; title: string } | null; clients?: { id: string; name: string } | null })[]> {
  let q = supabase
    .from("scripts")
    .select("*, jobs(id, title), clients(id, name)")
    .order("updated_at", { ascending: false });
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  if (filters.jobId) q = q.eq("job_id", filters.jobId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.contentType) q = q.eq("content_type", filters.contentType);
  if (filters.platform) q = q.eq("platform", filters.platform);
  const { data, error } = await q;
  if (error) throw error;
  return (data as any) ?? [];
}

export async function getScript(id: string) {
  const { data, error } = await supabase
    .from("scripts")
    .select("*, jobs(id, title, client_id), clients(id, name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as any as Script & { jobs?: any; clients?: any };
}

export async function getScriptByJob(jobId: string) {
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) throw error;
  return data as Script | null;
}

export async function createScript(input: {
  job_id: string;
  title: string;
  content_type: ScriptContentType;
  platform: ScriptPlatform;
  estimated_duration_sec?: number | null;
  video_format?: ScriptVideoFormat | null;
  status?: ScriptStatus;
}) {
  const { data: user } = await supabase.auth.getUser();
  // client_id will be set by DB trigger from job
  const { data, error } = await supabase
    .from("scripts")
    .insert({ ...input, client_id: "00000000-0000-0000-0000-000000000000", created_by: user.user?.id } as any)
    .select()
    .single();
  if (error) throw error;
  return data as Script;
}

export async function updateScript(id: string, patch: Partial<Script>) {
  const { data, error } = await supabase
    .from("scripts")
    .update(patch as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Script;
}

export async function deleteScript(id: string) {
  const { error } = await supabase.from("scripts").delete().eq("id", id);
  if (error) throw error;
}

export async function listScenes(scriptId: string): Promise<ScriptScene[]> {
  const { data, error } = await supabase
    .from("script_scenes")
    .select("*")
    .eq("script_id", scriptId)
    .order("scene_number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScriptScene[];
}

export async function addScene(scriptId: string, after?: number) {
  const existing = await listScenes(scriptId);
  const nextNumber = (after ?? existing.length) + 1;
  // shift numbers after the insert position
  if (after !== undefined && after < existing.length) {
    for (const s of existing.filter(x => x.scene_number > after)) {
      await supabase.from("script_scenes").update({ scene_number: s.scene_number + 1 } as any).eq("id", s.id);
    }
  }
  const { data, error } = await supabase
    .from("script_scenes")
    .insert({ script_id: scriptId, scene_number: nextNumber, visual: "" } as any)
    .select()
    .single();
  if (error) throw error;
  return data as ScriptScene;
}

export async function updateScene(id: string, patch: Partial<ScriptScene>) {
  const { data, error } = await supabase
    .from("script_scenes")
    .update(patch as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ScriptScene;
}

export async function deleteScene(id: string) {
  const { error } = await supabase.from("script_scenes").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderScenes(orderedIds: string[]) {
  // simple sequential renumber
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase.from("script_scenes").update({ scene_number: i + 1 } as any).eq("id", orderedIds[i]);
  }
}

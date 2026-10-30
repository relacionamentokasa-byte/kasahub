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
  video_concept: string | null;
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
    .select("*, jobs(id, title, client_id, custom_fields), clients(id, name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  const script = data as any as Script & { jobs?: any; clients?: any };
  if (!script.video_concept && script.jobs?.custom_fields?.video_concept) {
    script.video_concept = script.jobs.custom_fields.video_concept;
  }
  return script;
}

export async function getScriptByJob(jobId: string) {
  const { data: scriptData, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) throw error;
  if (!scriptData) return null;

  const script = scriptData as unknown as Script;

  // Se o video_concept vier vazio da tabela scripts (ex.: coluna não existe no cache do Supabase),
  // tenta carregar dos custom_fields do job como fallback seguro
  if (!script.video_concept) {
    try {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("custom_fields")
        .eq("id", jobId)
        .maybeSingle();
      const fallbackConcept = (jobData?.custom_fields as any)?.video_concept;
      if (fallbackConcept) {
        script.video_concept = fallbackConcept;
      }
    } catch {
      // ignore
    }
  }

  return script;
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
  return data as unknown as Script;
}

let scriptHasVideoConceptColumn: boolean | null = null;

export async function updateScript(id: string, patch: Partial<Script>) {
  // Filtra para enviar apenas colunas válidas da tabela scripts
  const allowedKeys: (keyof Script)[] = [
    "title",
    "content_type",
    "platform",
    "estimated_duration_sec",
    "video_format",
    "status",
    "video_concept",
  ];

  const sanitizedPatch: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (key in patch) {
      sanitizedPatch[key] = (patch as any)[key];
    }
  }

  const payload = Object.keys(sanitizedPatch).length > 0 ? sanitizedPatch : patch;
  const videoConceptValue = (payload as any).video_concept;

  // Busca job_id atual do script para poder gravar no job se necessário
  let scriptJobId: string | null = null;
  const getJobId = async () => {
    if (scriptJobId) return scriptJobId;
    const { data: s } = await supabase.from("scripts").select("job_id").eq("id", id).maybeSingle();
    scriptJobId = s?.job_id ?? null;
    return scriptJobId;
  };

  const saveConceptToJob = async (concept: string | null | undefined) => {
    if (concept === undefined) return;
    try {
      const jId = await getJobId();
      if (!jId) return;
      const { data: jobData } = await supabase
        .from("jobs")
        .select("custom_fields")
        .eq("id", jId)
        .maybeSingle();
      const currentFields = (jobData?.custom_fields as Record<string, any>) || {};
      await supabase
        .from("jobs")
        .update({
          custom_fields: { ...currentFields, video_concept: concept },
        } as any)
        .eq("id", jId);
    } catch (e) {
      console.warn("Falha ao salvar video_concept em jobs.custom_fields:", e);
    }
  };

  // Se já detectamos anteriormente que a coluna video_concept não existe no schema cache do Supabase,
  // nem tenta enviar video_concept no payload da tabela scripts.
  if (scriptHasVideoConceptColumn === false) {
    const { video_concept, ...withoutConcept } = payload;
    let data: any = null;
    if (Object.keys(withoutConcept).length > 0) {
      const res = await supabase.from("scripts").update(withoutConcept as any).eq("id", id).select().single();
      if (res.error) throw res.error;
      data = res.data;
    } else {
      const res = await supabase.from("scripts").select("*").eq("id", id).single();
      if (res.error) throw res.error;
      data = res.data;
    }
    await saveConceptToJob(videoConceptValue);
    if (data && videoConceptValue !== undefined) {
      data.video_concept = videoConceptValue;
    }
    return data as unknown as Script;
  }

  // Tenta update padrão
  const { data: directData, error: directError } = await supabase
    .from("scripts")
    .update(payload as any)
    .eq("id", id)
    .select()
    .single();

  if (!directError && directData) {
    scriptHasVideoConceptColumn = true;
    return directData as unknown as Script;
  }

  // Se o erro foi por falta da coluna video_concept no schema cache
  const isConceptSchemaError = String(directError?.message || "").includes("video_concept");
  if (isConceptSchemaError) {
    scriptHasVideoConceptColumn = false;
    const { video_concept, ...withoutConcept } = payload;

    let data: any = null;
    if (Object.keys(withoutConcept).length > 0) {
      const fallbackRes = await supabase
        .from("scripts")
        .update(withoutConcept as any)
        .eq("id", id)
        .select()
        .single();
      if (fallbackRes.error) throw fallbackRes.error;
      data = fallbackRes.data;
    } else {
      const res = await supabase.from("scripts").select("*").eq("id", id).single();
      if (res.error) throw res.error;
      data = res.data;
    }

    await saveConceptToJob(videoConceptValue);
    if (data && videoConceptValue !== undefined) {
      data.video_concept = videoConceptValue;
    }
    return data as unknown as Script;
  }

  throw directError;
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

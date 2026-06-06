import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { approveExtraDemand as approveExtraDemandShared } from "./dme-approval";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type JobStage = Database["public"]["Tables"]["job_stages"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobChecklist = Database["public"]["Tables"]["job_checklist"]["Row"];
export type JobComment = Database["public"]["Tables"]["job_comments"]["Row"];

// ---------- Clients ----------
export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClient(id: string): Promise<Client> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createClient(input: Database["public"]["Tables"]["clients"]["Insert"]) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...input, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(
  id: string,
  patch: Database["public"]["Tables"]["clients"]["Update"],
) {
  const { data, error } = await supabase.from("clients").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Projects ----------
export async function fetchProjects(filters: { clientId?: string; status?: string; type?: string; contractId?: string; search?: string } = {}): Promise<Project[]> {
  let q = supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (filters.clientId && filters.clientId !== "all") q = q.eq("client_id", filters.clientId);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.type && filters.type !== "all") q = q.eq("type", filters.type);
  if (filters.contractId) q = q.eq("contract_id", filters.contractId);
  if (filters.search) {
    q = q.or(`name.ilike.%${filters.search}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createProject(input: Database["public"]["Tables"]["projects"]["Insert"]) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  patch: Database["public"]["Tables"]["projects"]["Update"],
) {
  const { data, error } = await supabase.from("projects").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProject(id: string) {
  const original = await fetchProject(id);
  const { data: u } = await supabase.auth.getUser();
  const { id: _omit, created_at, updated_at, ...rest } = original as Project & { created_at: string; updated_at: string };
  void _omit; void created_at; void updated_at;
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...rest, name: `${original.name} (cópia)`, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveProject(id: string) {
  return updateProject(id, { status: "archived" });
}

export async function fetchProjectStats(projectId: string) {
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, done_at, due_date, stage_id")
    .eq("project_id", projectId);
  
  if (error) throw error;
  
  const { data: stages } = await supabase.from("job_stages").select("id, is_done");
  const doneStageIds = new Set(stages?.filter(s => s.is_done).map(s => s.id) || []);
  
  const total = jobs.length;
  const done = jobs.filter(j => !!j.done_at || (j.stage_id && doneStageIds.has(j.stage_id))).length;
  const pending = total - done;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = jobs.filter(j => !j.done_at && !(j.stage_id && doneStageIds.has(j.stage_id)) && j.due_date && j.due_date < today).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  
  const { data: proj } = await supabase.from("projects").select("contract_id").eq("id", projectId).single();
  let dmeCount = 0;
  if (proj?.contract_id) {
    const { count } = await supabase
      .from("extra_demands")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", proj.contract_id);
    dmeCount = count || 0;
  }


  return { total, done, pending, overdue, progress, dmeCount: dmeCount || 0 };
}


// ---------- Jobs ----------
export async function fetchJobStages(): Promise<JobStage[]> {
  const { data, error } = await supabase
    .from("job_stages")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchJobs(filters: { projectId?: string; clientId?: string } = {}): Promise<Job[]> {
  let q = supabase
    .from("jobs")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });
  if (filters.projectId) q = q.eq("project_id", filters.projectId);
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createJob(input: Database["public"]["Tables"]["jobs"]["Insert"]) {
  const { data, error } = await supabase.from("jobs").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateJob(
  id: string,
  patch: Database["public"]["Tables"]["jobs"]["Update"],
) {
  const { data, error } = await supabase.from("jobs").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteJob(id: string) {
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw error;
}

export async function moveJob(id: string, stageId: string, extras: { done_at?: string | null } = {}) {
  return updateJob(id, { stage_id: stageId, ...extras });
}

export async function fetchChecklist(jobId: string): Promise<JobChecklist[]> {
  const { data, error } = await supabase
    .from("job_checklist")
    .select("*")
    .eq("job_id", jobId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addChecklistItem(jobId: string, content: string) {
  const { data, error } = await supabase
    .from("job_checklist")
    .insert({ job_id: jobId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleChecklistItem(id: string, done: boolean) {
  const { error } = await supabase.from("job_checklist").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string) {
  const { error } = await supabase.from("job_checklist").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchJobComments(jobId: string): Promise<JobComment[]> {
  const { data, error } = await supabase
    .from("job_comments")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addJobComment(jobId: string, content: string) {
  const { data: u } = await supabase.auth.getUser();
  const mentions = Array.from(content.matchAll(/@(\w+)/g)).map((m) => m[1]);
  const { data, error } = await supabase
    .from("job_comments")
    .insert({ job_id: jobId, user_id: u.user?.id ?? null, content, mentions })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function priorityColor(p: string) {
  switch (p) {
    case "urgent":
      return "#EF4444";
    case "high":
      return "#F59E0B";
    case "low":
      return "#64748B";
    default:
      return "#FFBC45";
  }
}

export function priorityLabel(p: string) {
  return { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baixa" }[p] ?? p;
}

// ---------- Extra Demands (DME) ----------
export async function fetchExtraDemands(filters: { clientId?: string; contractId?: string } = {}) {
  let q = supabase.from("extra_demands").select("*").order("created_at", { ascending: false });
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  if (filters.contractId) q = q.eq("contract_id", filters.contractId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createExtraDemand(input: Database["public"]["Tables"]["extra_demands"]["Insert"]) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("extra_demands")
    .insert({ ...input, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExtraDemand(id: string, patch: Database["public"]["Tables"]["extra_demands"]["Update"]) {
  const { data, error } = await supabase.from("extra_demands").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExtraDemand(id: string) {
  const { error } = await supabase.from("extra_demands").delete().eq("id", id);
  if (error) throw error;
}

export async function approveExtraDemand(id: string) {
  return await approveExtraDemandShared(supabase, id);
}


import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Service = Database["public"]["Tables"]["services"]["Row"];
export type ServiceJobTemplate =
  Database["public"]["Tables"]["service_job_templates"]["Row"];
export type ServiceJobChecklist =
  Database["public"]["Tables"]["service_job_checklist"]["Row"];

export async function fetchServices(opts?: { onlyActive?: boolean }): Promise<Service[]> {
  let q = supabase.from("services").select("*").order("order_index").order("name");
  if (opts?.onlyActive) q = q.eq("is_active", true).is("archived_at", null);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createService(input: {
  name: string;
  category?: string | null;
  description?: string | null;
  is_active?: boolean;
  default_scope?: string[];
}) {
  const { data, error } = await supabase.from("services").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateService(
  id: string,
  patch: Partial<Database["public"]["Tables"]["services"]["Update"]>,
) {
  const { data, error } = await supabase
    .from("services")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveService(id: string, archive: boolean) {
  return updateService(id, {
    archived_at: archive ? new Date().toISOString() : null,
    is_active: !archive,
  });
}

export async function deleteService(id: string) {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

// ===== Templates =====

export async function fetchServiceTemplate(serviceId: string): Promise<ServiceJobTemplate[]> {
  const { data, error } = await supabase
    .from("service_job_templates")
    .select("*")
    .eq("service_id", serviceId)
    .order("order_index");
  if (error) throw error;
  return data ?? [];
}

export async function createTemplateJob(input: {
  service_id: string;
  name: string;
  order_index?: number;
  default_duration_days?: number;
  default_assignee_id?: string | null;
  initial_stage_id?: string | null;
}) {
  const { data, error } = await supabase
    .from("service_job_templates")
    .insert(input as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplateJob(
  id: string,
  patch: Partial<Database["public"]["Tables"]["service_job_templates"]["Update"]>,
) {
  const { data, error } = await supabase
    .from("service_job_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplateJob(id: string) {
  const { error } = await supabase.from("service_job_templates").delete().eq("id", id);
  if (error) throw error;
}

// ===== Checklist =====

export async function fetchTemplateChecklist(
  templateJobId: string,
): Promise<ServiceJobChecklist[]> {
  const { data, error } = await supabase
    .from("service_job_checklist")
    .select("*")
    .eq("template_job_id", templateJobId)
    .order("order_index");
  if (error) throw error;
  return data ?? [];
}

export async function createChecklistItem(input: {
  template_job_id: string;
  content: string;
  order_index?: number;
}) {
  const { data, error } = await supabase
    .from("service_job_checklist")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteChecklistItem(id: string) {
  const { error } = await supabase.from("service_job_checklist").delete().eq("id", id);
  if (error) throw error;
}

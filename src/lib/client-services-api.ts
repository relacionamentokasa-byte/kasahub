import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchServiceTemplate, fetchTemplateChecklist } from "@/lib/services-api";
import { fetchJobStages } from "@/lib/ops-api";

export type ClientService = Database["public"]["Tables"]["client_services"]["Row"];

export async function fetchClientServices(clientId: string): Promise<ClientService[]> {
  const { data, error } = await supabase
    .from("client_services")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addClientService(input: {
  client_id: string;
  service_id: string;
  contract_type?: "recurring" | "one_time";
  monthly_value?: number;
  one_time_value?: number;
  billing_day?: number;
  start_date?: string;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from("client_services")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClientService(
  id: string,
  patch: Partial<Database["public"]["Tables"]["client_services"]["Update"]>,
) {
  const { data, error } = await supabase
    .from("client_services")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeClientService(id: string) {
  const { error } = await supabase.from("client_services").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Project generation from service templates ----------

export async function generateJobsForProject(
  projectId: string,
  clientId: string,
  serviceIds: string[],
  period?: string,
) {
  if (!serviceIds.length) return { created: 0 };
  const stages = await fetchJobStages();
  const firstStageId = stages[0]?.id ?? null;
  let created = 0;
  
  // Fetch existing jobs to avoid duplicates
  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("title")
    .eq("project_id", projectId);
  const existingTitles = new Set(existingJobs?.map(j => j.title) || []);

  for (const serviceId of serviceIds) {
    const templates = await fetchServiceTemplate(serviceId);
    for (const t of templates) {
      if (existingTitles.has(t.name)) continue;

      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          project_id: projectId,
          client_id: clientId,
          title: t.name,
          stage_id: t.initial_stage_id ?? firstStageId,
          assignee_id: t.default_assignee_id ?? null,
          main_responsible_id: t.default_assignee_id ?? null,
          status: 'not_started',
          order_index: t.order_index,
          period: period || null,
          due_date:
            t.default_duration_days && t.default_duration_days > 0
              ? new Date(Date.now() + t.default_duration_days * 86400000)
                  .toISOString()
                  .slice(0, 10)
              : null,
        })
        .select()
        .single();
      if (error) continue;
      created++;
      const items = await fetchTemplateChecklist(t.id);
      if (items.length) {
        await supabase.from("job_checklist").insert(
          items.map((it) => ({
            job_id: job.id,
            content: it.content,
            order_index: it.order_index,
          })),
        );
      }
    }
  }
  return { created };
}

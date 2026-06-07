import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

// ---------- Project generation from service templates (DEPRECATED) ----------

export async function generateJobsForProject(
  projectId: string,
  clientId: string,
  serviceIds: string[],
  period?: string,
) {
  // Operacional reconstruído: não gera mais jobs automáticos por enquanto
  console.log("Geração automática de jobs desabilitada.");
  return { created: 0 };
}

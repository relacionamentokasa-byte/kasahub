import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Service = Database["public"]["Tables"]["services"]["Row"];

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

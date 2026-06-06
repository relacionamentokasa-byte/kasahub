import { supabase } from "@/integrations/supabase/client";

export type ScopeTemplate = {
  id: string;
  name: string;
  category: string | null;
  content: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchScopeTemplates(): Promise<ScopeTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("scope_templates")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScopeTemplate[];
}

export async function createScopeTemplate(input: {
  name: string;
  category?: string | null;
  content: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("scope_templates")
    .insert({ ...input, owner_id: userData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as ScopeTemplate;
}

export async function updateScopeTemplate(
  id: string,
  patch: Partial<Pick<ScopeTemplate, "name" | "category" | "content">>,
) {
  const { data, error } = await (supabase as any)
    .from("scope_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ScopeTemplate;
}

export async function deleteScopeTemplate(id: string) {
  const { error } = await (supabase as any)
    .from("scope_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

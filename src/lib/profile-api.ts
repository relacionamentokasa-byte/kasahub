import { supabase } from "@/integrations/supabase/client";

export async function fetchMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return { ...data, email: user.email };
}

export async function updateMyProfile(patch: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  // Remove campos que não pertencem à tabela profiles
  const { email, ...validPatch } = patch;

  const { data, error } = await supabase
    .from("profiles")
    .update(validPatch)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, avatar_url, job_title")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

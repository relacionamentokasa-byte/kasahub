import { supabase } from "@/integrations/supabase/client";

export async function fetchMyProfile() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Usuário não autenticado ou sessão expirada");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Perfil não encontrado no sistema");
    
    return { ...data, email: user.email };
  } catch (error) {
    console.error("fetchMyProfile error:", error);
    throw error;
  }
}

export async function updateMyProfile(patch: any) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Usuário não autenticado");

    // Remove campos sensíveis que não devem ser alterados pelo client
    const { email, id, created_at, updated_at, ...validPatch } = patch;

    const { data, error } = await supabase
      .from("profiles")
      .update(validPatch)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("updateMyProfile error:", error);
    throw error;
  }
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, avatar_url, job_title, agency_logo_url")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

import { supabase } from "@/integrations/supabase/client";

export interface AgencySettings {
  id: string;
  name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  logo_url: string | null;
  banner_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  agency_signature_url: string | null;
  default_currency: string;
  timezone: string;
  notify_email: boolean;
  notify_whatsapp: boolean;
  integrations: Record<string, unknown>;
  plan_name: string;
  user_limit: number;
}

const sb = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
};

export async function fetchAgencySettings(): Promise<AgencySettings | null> {
  const { data, error } = await sb
    .from("agency_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as AgencySettings | null;
}

export async function updateAgencySettings(id: string, patch: Partial<AgencySettings>) {
  const { error } = await sb.from("agency_settings").update(patch as never).eq("id", id);
  if (error) throw error;
}

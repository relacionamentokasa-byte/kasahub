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
  logo_sidebar_url: string | null;
  logo_login_url: string | null;
  icon_system_url: string | null;
  banner_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  agency_signature_url: string | null;
  logo_proposals_url: string | null;
  logo_reports_url: string | null;
  splash_screen_url: string | null;
  default_currency: string;
  timezone: string;
  notify_email: boolean;
  notify_whatsapp: boolean;
  integrations: Record<string, unknown>;
  plan_name: string;
  user_limit: number;
  pwa_name: string | null;
  pwa_short_name: string | null;
  pwa_description: string | null;
  pwa_theme_color: string | null;
  pwa_background_color: string | null;
  pwa_icon_192_url: string | null;
  pwa_icon_512_url: string | null;
  pwa_favicon_url: string | null;
}

export async function fetchAgencySettings(): Promise<AgencySettings | null> {
  const { data, error } = await supabase
    .from("agency_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as AgencySettings | null;
}

export async function updateAgencySettings(id: string, patch: Partial<AgencySettings>) {
  const { error } = await supabase.from("agency_settings").update(patch as any).eq("id", id);
  if (error) throw error;
}

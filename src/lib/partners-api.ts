import { supabase } from "@/integrations/supabase/client";

export type PartnerType = "representative" | "freelancer" | "supplier" | "strategic";

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  document: string | null;
  city: string | null;
  pix_key: string | null;
  photo_url: string | null;
  specialty: string | null;
  hourly_rate: number | null;
  status: string | null;
  observations: string | null;
  created_at: string;
}

export async function fetchPartners(type?: PartnerType): Promise<Partner[]> {
  let q = (supabase as any).from("partners").select("*").order("name", { ascending: true });
  if (type) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Partner[];
}

export async function fetchPartner(id: string): Promise<Partner | null> {
  const { data, error } = await (supabase as any).from("partners").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Partner | null;
}

export async function createPartner(input: {
  name: string;
  type: PartnerType;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  document?: string | null;
  pix_key?: string | null;
  specialty?: string | null;
  hourly_rate?: number | null;
  observations?: string | null;
}): Promise<Partner> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("partners")
    .insert({ ...input, created_by: user?.id ?? null, status: "active" })
    .select()
    .single();
  if (error) throw error;
  return data as Partner;
}

export async function updatePartner(id: string, patch: Partial<Partner>): Promise<Partner> {
  const { data, error } = await (supabase as any).from("partners").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Partner;
}

export async function deletePartner(id: string): Promise<void> {
  const { error } = await (supabase as any).from("partners").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPartnerStats(_partnerId: string, _type: string) {
  return null;
}

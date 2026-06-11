import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { handleMentions } from "./notifications-api";

export type PartnerType = "representative" | "freelancer" | "supplier" | "strategic";

export interface Partner {
  id: string;
  type: PartnerType;
  name: string;
  photo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  city: string | null;
  pix_key: string | null;
  bank_info: string | null;
  status: "active" | "inactive";
  observations: string | null;
  
  // Specific
  commission_type: string | null;
  commission_value: number | null;
  specialty: string | null;
  hourly_rate: number | null;
  project_rate: number | null;
  availability: string | null;
  company_name: string | null;
  responsible_name: string | null;
  partnership_type: string | null;
  
  created_at: string;
  updated_at: string;
}

export async function fetchPartners(type?: PartnerType): Promise<Partner[]> {
  let q = supabase.from("partners").select("*").order("name");
  if (type) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Partner[];
}

export async function fetchPartner(id: string): Promise<Partner> {
  const { data, error } = await supabase.from("partners").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Partner;
}

export async function createPartner(input: Partial<Partner>) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("partners")
    .insert({ ...input, created_by: u.user?.id } as any)
    .select()
    .single();
  if (error) throw error;

  const partner = data as Partner;
  if (partner.observations?.includes('@')) {
    await handleMentions(partner.observations, {
      title: `Parceiro: ${partner.name}`,
      link: `/parceiros`,
      originType: 'partners',
      originId: partner.id
    });
  }

  return partner;
}

export async function updatePartner(id: string, patch: Partial<Partner>) {
  const { data, error } = await supabase
    .from("partners")
    .update(patch as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Partner;
}

export async function deletePartner(id: string) {
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPartnerStats(partnerId: string, type: PartnerType) {
  if (type === 'representative') {
    // Leads indicated
    const { count: leadsCount } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('origin_partner_id', partnerId);
    // Contracts closed
    const { count: contractsCount } = await supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('partner_id', partnerId);
    const paidCommissions = 0;
    const pendingCommissions = 0;
    
    return { leadsCount: leadsCount || 0, contractsCount: contractsCount || 0, paidCommissions, pendingCommissions };
  }
  
  if (type === 'freelancer') {
    const { count: activeJobs } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('freelancer_id', partnerId).is('done_at', null);
    const { count: doneJobs } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('freelancer_id', partnerId).not('done_at', 'is', null);
    
    return { activeJobs: activeJobs || 0, doneJobs: doneJobs || 0 };
  }
  
  return null;
}

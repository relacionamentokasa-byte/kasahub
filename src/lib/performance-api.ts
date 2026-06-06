import { supabase } from "@/integrations/supabase/client";

export type IndicatorCategory = "commercial" | "financial" | "operational" | "clients";
export type IndicatorType = "monetary" | "quantity" | "percentage";
export type IndicatorPeriodicity = "monthly" | "quarterly" | "semiannual" | "yearly";
export type IndicatorDataSource = 
  | "manual" 
  | "contracts_mrr" 
  | "contracts_count" 
  | "proposals_accepted" 
  | "extra_income" 
  | "jobs_done" 
  | "projects_finished" 
  | "clients_active" 
  | "clients_new";

export interface AgencyIndicator {
  id: string;
  name: string;
  category: IndicatorCategory;
  type: IndicatorType;
  target_value: number;
  periodicity: IndicatorPeriodicity;
  start_date: string;
  end_date: string | null;
  responsible: string;
  data_source: IndicatorDataSource;
  status: "active" | "inactive" | "archived";
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchIndicators() {
  const { data, error } = await supabase
    .from("agency_indicators")
    .select("*")
    .neq("status", "archived")
    .order("name");
  if (error) throw error;
  return data as AgencyIndicator[];
}

export async function createIndicator(input: Partial<AgencyIndicator>) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("agency_indicators")
    .insert({ ...input, owner_id: userData.user?.id } as any)
    .select()
    .single();
  if (error) throw error;
  return data as AgencyIndicator;
}

export async function updateIndicator(id: string, patch: Partial<AgencyIndicator>) {
  const { data, error } = await supabase
    .from("agency_indicators")
    .update(patch as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AgencyIndicator;
}

export async function deleteIndicator(id: string) {
  const { error } = await supabase.from("agency_indicators").update({ status: "archived" } as any).eq("id", id);
  if (error) throw error;
}

// Legacy support for agency_goals table
export interface AgencyGoal {
  id: string;
  type: 'revenue' | 'contracts' | 'jobs';
  period: 'monthly' | 'quarterly' | 'yearly';
  target_value: number;
  month: number | null;
  year: number;
}

export const fetchAgencyGoals = async (year: number, month?: number) => {
  let q = supabase
    .from('agency_goals')
    .select('*')
    .eq('year', year);
  
  if (month) q = q.eq('month', month);

  const { data, error } = await q;
  if (error) throw error;
  return data as AgencyGoal[];
};

export const updateAgencyGoal = async (id: string, target_value: number) => {
  const { data, error } = await supabase
    .from('agency_goals')
    .update({ target_value })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

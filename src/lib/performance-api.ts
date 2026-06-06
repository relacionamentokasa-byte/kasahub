import { supabase } from "@/integrations/supabase/client";

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

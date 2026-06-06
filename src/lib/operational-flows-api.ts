import { supabase } from "@/integrations/supabase/client";

export interface OperationalFlow {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  default_project_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationalFlowStage {
  id: string;
  flow_id: string;
  name: string;
  order: number;
}

export interface OperationalFlowJob {
  id: string;
  stage_id: string;
  name: string;
  job_type: string | null;
  default_assignee_role_id: string | null;
  sla_days: number;
  order: number;
}

export interface OperationalFlowChecklist {
  id: string;
  flow_job_id: string;
  item_text: string;
  order: number;
}

export const fetchOperationalFlows = async () => {
  const { data, error } = await supabase
    .from('operational_flows')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as OperationalFlow[];
};

export const fetchOperationalFlowDetails = async (flowId: string) => {
  const { data: stages, error: stagesError } = await supabase
    .from('operational_flow_stages')
    .select(`
      *,
      jobs:operational_flow_jobs(
        *,
        checklists:operational_flow_checklists(*)
      )
    `)
    .eq('flow_id', flowId)
    .order('order');
  
  if (stagesError) throw stagesError;
  return stages;
};

export const createOperationalFlow = async (flow: Partial<OperationalFlow>) => {
  const { data, error } = await supabase
    .from('operational_flows')
    .insert(flow)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateOperationalFlow = async (id: string, flow: Partial<OperationalFlow>) => {
  const { data, error } = await supabase
    .from('operational_flows')
    .update(flow)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteOperationalFlow = async (id: string) => {
  const { error } = await supabase
    .from('operational_flows')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

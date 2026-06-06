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
  custom_fields_schema: any | null;
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

export const createOperationalFlow = async (flow: { name: string; description?: string | null; status?: string; default_project_name?: string | null }) => {
  const { data, error } = await supabase
    .from('operational_flows')
    .insert(flow)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateOperationalFlow = async (id: string, flow: Partial<{ name: string; description: string | null; status: string; default_project_name: string | null }>) => {
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

export const duplicateOperationalFlow = async (id: string) => {
  // Buscar fluxo original
  const { data: flow, error: flowError } = await supabase
    .from('operational_flows')
    .select('*')
    .eq('id', id)
    .single();
  
  if (flowError) throw flowError;

  // Criar cópia do fluxo
  const { data: newFlow, error: newFlowError } = await supabase
    .from('operational_flows')
    .insert({
      name: `${flow.name} (Cópia)`,
      description: flow.description,
      default_project_name: flow.default_project_name,
      status: flow.status
    })
    .select()
    .single();

  if (newFlowError) throw newFlowError;

  // Buscar estágios, jobs e checklists
  const details = await fetchOperationalFlowDetails(id);

  for (const stage of details) {
    const { data: newStage, error: stageError } = await supabase
      .from('operational_flow_stages')
      .insert({
        flow_id: newFlow.id,
        name: stage.name,
        order: stage.order
      })
      .select()
      .single();
    
    if (stageError) continue;

    for (const job of (stage as any).jobs || []) {
      const { data: newJob, error: jobError } = await supabase
        .from('operational_flow_jobs')
        .insert({
          stage_id: newStage.id,
          name: job.name,
          job_type: job.job_type,
          default_assignee_role_id: job.default_assignee_role_id,
          sla_days: job.sla_days,
          order: job.order
        })
        .select()
        .single();
      
      if (jobError) continue;

      for (const checklist of job.checklists || []) {
        await supabase
          .from('operational_flow_checklists')
          .insert({
            flow_job_id: newJob.id,
            item_text: checklist.item_text,
            order: checklist.order
          });
      }
    }
  }

  return newFlow;
};

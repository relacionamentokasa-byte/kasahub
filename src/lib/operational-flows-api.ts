import { supabase } from "@/integrations/supabase/client";

export interface OperationalFlowDependency {
  id: string;
  job_id: string;
  depends_on_job_id: string;
}

export const fetchJobDependencies = async (jobId: string) => {
  const { data, error } = await supabase
    .from('operational_flow_dependencies')
    .select('*')
    .eq('job_id', jobId);
  if (error) throw error;
  return data as OperationalFlowDependency[];
};

export const addJobDependency = async (jobId: string, dependsOnJobId: string) => {
  const { data, error } = await supabase
    .from('operational_flow_dependencies')
    .insert({ job_id: jobId, depends_on_job_id: dependsOnJobId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const removeJobDependency = async (id: string) => {
  const { error } = await supabase
    .from('operational_flow_dependencies')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// Re-exporting from existing API for completeness in this module if needed
export { fetchOperationalFlows, fetchOperationalFlowDetails, createOperationalFlow, updateOperationalFlow, deleteOperationalFlow, duplicateOperationalFlow } from './operational-flows-api';

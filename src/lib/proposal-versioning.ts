import { supabase } from "@/integrations/supabase/client";

export async function createProposalVersion(proposalId: string) {
  return null;
}

export async function cancelProposalWorkflow(proposalId: string, reason: string) {
  await supabase.from("proposals").update({ status: 'Encerrada' }).eq("id", proposalId);
}

export async function reopenProposal(proposalId: string) {
  await supabase.from("proposals").update({ status: 'Rascunho' }).eq("id", proposalId);
}

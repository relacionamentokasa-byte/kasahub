import { supabase } from "@/integrations/supabase/client";

export type TimelineEventType = 
  | 'lead_created'
  | 'proposal_created'
  | 'proposal_sent'
  | 'proposal_approved'
  | 'contract_generated'
  | 'project_created'
  | 'onboarding'
  | 'operation'
  | 'addendum'
  | 'termination'
  | 'archived';

export async function recordTimelineEvent({
  client_id,
  lead_id,
  type,
  title,
  description,
  metadata = {},
}: {
  client_id?: string | null;
  lead_id?: string | null;
  type: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: any;
}) {
  const { data: userData } = await supabase.auth.getUser();
  
  const { error } = await supabase.from("client_timeline_events").insert({
    client_id: client_id || null,
    lead_id: lead_id || null,
    type,
    title,
    description: description || null,
    metadata: metadata || {},
    actor_id: userData.user?.id || null,
  });

  if (error) {
    console.error("Error recording timeline event:", error);
  }
}

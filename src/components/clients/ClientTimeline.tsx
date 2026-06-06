import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, CheckCircle2, FileSignature, 
  Rocket, UserCheck, Play, PlusCircle, XCircle, Archive, 
  ArrowRight
} from "lucide-react";

export type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: any;
  created_at: string;
  actor_id: string | null;
};

const EVENT_ICONS: Record<string, any> = {
  lead_created: { icon: UserCheck, color: "text-blue-400", bg: "bg-blue-400/10" },
  proposal_created: { icon: FileText, color: "text-amber-400", bg: "bg-amber-400/10" },
  proposal_sent: { icon: ArrowRight, color: "text-blue-300", bg: "bg-blue-300/10" },
  proposal_approved: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  contract_generated: { icon: FileSignature, color: "text-primary", bg: "bg-primary/10" },
  project_created: { icon: Rocket, color: "text-purple-400", bg: "bg-purple-400/10" },
  onboarding: { icon: Play, color: "text-emerald-300", bg: "bg-emerald-300/10" },
  operation: { icon: Activity, color: "text-primary", bg: "bg-primary/10" },
  addendum: { icon: PlusCircle, color: "text-amber-300", bg: "bg-amber-300/10" },
  termination: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-400/10" },
  archived: { icon: Archive, color: "text-foreground/40", bg: "bg-muted" },
};

import { Activity } from "lucide-react";

export function ClientTimeline({ clientId, leadId, projectId }: { clientId?: string; leadId?: string; projectId?: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["client-timeline", clientId || leadId || projectId],
    queryFn: async () => {
      let q = supabase
        .from("client_timeline_events")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (clientId) q = q.eq("client_id", clientId);
      else if (leadId) q = q.eq("lead_id", leadId);
      
      const { data, error } = await q;
      if (error) throw error;
      
      let filtered = data as TimelineEvent[];
      if (projectId) {
        filtered = filtered.filter(ev => ev.metadata?.project_id === projectId);
      }
      
      return filtered;
    },
    enabled: !!(clientId || leadId || projectId),
  });


  if (isLoading) return <div className="p-10 text-center text-foreground/40 text-xs">Carregando linha do tempo…</div>;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-12 rounded-full bg-muted grid place-items-center mb-4">
          <Activity className="size-6 text-foreground/20" />
        </div>
        <p className="text-sm text-foreground/40">Nenhuma atividade registrada na timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
      {events.map((event, idx) => {
        const Config = EVENT_ICONS[event.type] || { icon: Activity, color: "text-foreground/50", bg: "bg-muted" };
        const Icon = Config.icon;

        return (
          <div key={event.id} className="relative flex items-start gap-6 group">
            <div className={`mt-0.5 size-10 rounded-full ${Config.bg} grid place-items-center shrink-0 z-10 ring-4 ring-background transition-transform group-hover:scale-110`}>
              <Icon className={`size-5 ${Config.color}`} />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <h3 className="text-sm font-semibold tracking-tight text-foreground/90">
                  {event.title}
                </h3>
                <time className="text-[10px] uppercase tracking-wider text-foreground/40 font-medium">
                  {new Date(event.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              {event.description && (
                <p className="text-xs text-foreground/60 leading-relaxed mb-2">
                  {event.description}
                </p>
              )}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(event.metadata).map(([key, val]) => (
                    typeof val !== 'object' && (
                      <span key={key} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface border border-border text-[9px] font-mono text-foreground/50">
                        {key}: {String(val)}
                      </span>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

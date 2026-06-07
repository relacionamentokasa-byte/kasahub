import { useQuery } from "@tanstack/react-query";
import { fetchProposalEvents, EVENT_LABELS } from "@/lib/proposal-events";
import { History } from "lucide-react";

export function ProposalTimeline({ proposalId }: { proposalId: string }) {
  const { data: events = [] } = useQuery({
    queryKey: ["proposal", proposalId, "events"],
    queryFn: () => fetchProposalEvents(proposalId),
  });

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="size-4 text-primary" />
        <span className="text-primary text-[10px] capitalize">Timeline</span>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-foreground/40">Nenhum evento registrado ainda.</p>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-4">
          {[...events].reverse().map((e) => {
            const meta = EVENT_LABELS[e.type] ?? { label: e.type, color: "text-foreground/70" };
            return (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-primary ring-2 ring-surface" />
                <p className={`text-sm font-medium ${meta.color}`}>{meta.label}</p>
                {(e.payload as any)?.reason && (
                  <p className="text-[11px] text-foreground/60 mt-1 italic">
                    Motivo: {String((e.payload as any).reason)}
                  </p>
                )}
                <p className="text-[11px] text-foreground/50 mt-1">
                  {new Date(e.created_at).toLocaleString("pt-BR")}
                  {e.actor_name ? ` · ${e.actor_name}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

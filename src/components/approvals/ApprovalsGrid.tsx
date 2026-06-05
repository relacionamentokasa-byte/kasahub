import { useQuery } from "@tanstack/react-query";
import { fetchApprovals, STATUS_LABEL, STATUS_COLOR, type Approval, type ApprovalStatus } from "@/lib/approvals-api";
import { fetchClients } from "@/lib/ops-api";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  clientId?: string;
  status?: ApprovalStatus;
  onSelect: (a: Approval) => void;
  showClient?: boolean;
}

export function ApprovalsGrid({ clientId, status, onSelect, showClient }: Props) {
  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["approvals", { clientId, status }],
    queryFn: () => fetchApprovals({ clientId, status }),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
    enabled: !!showClient,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!approvals.length) {
    return (
      <div className="border border-dashed border-border rounded-xl p-12 text-center text-foreground/50">
        Nenhuma peça por aqui ainda.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {approvals.map((a) => {
        const client = clients.find((c) => c.id === a.client_id);
        return (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-muted/30 border border-border hover:border-primary/50 transition-all text-left"
          >
            {a.cover_url ? (
              <img
                src={a.cover_url}
                alt={a.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-foreground/30">
                {a.kind === "video" || a.kind === "reel" ? (
                  <PlayCircle className="size-12" />
                ) : (
                  <ImageIcon className="size-12" />
                )}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
              <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider font-mono-kasa border", STATUS_COLOR[a.status])}>
                {STATUS_LABEL[a.status]}
              </Badge>
              {(a.kind === "video" || a.kind === "reel") && (
                <PlayCircle className="size-5 text-white drop-shadow" />
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs font-semibold text-white line-clamp-2">{a.title}</p>
              {showClient && client && (
                <p className="text-[10px] text-white/70 mt-0.5 truncate">{client.name}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

import { Activity, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FeedEvent {
  id: string;
  time: Date;
  user: string;
  action: string;
  target: string;
  description?: string;
  type: 'contract' | 'proposal' | 'dme' | 'job' | 'approval' | 'client' | 'finance';
}

interface FeedSectionProps {
  events: FeedEvent[];
}

export function FeedSection({ events }: FeedSectionProps) {
  const sortedEvents = [...events].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 15);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
        <Activity className="size-4" /> Feed Operacional
      </h3>
      <div className="bg-surface border border-border rounded-2xl p-6 relative">
        <div className="absolute left-8 top-8 bottom-8 w-px bg-border" />
        <div className="space-y-8 relative">
          {sortedEvents.map((ev) => (
            <div key={ev.id} className="flex gap-4 sm:gap-6 relative">
              <div className="size-4 rounded-full bg-surface border-2 border-primary mt-1 shrink-0 z-10" />
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[10px] font-bold font-mono-kasa text-primary">
                    {format(ev.time, "HH:mm")}
                  </span>
                  <span className="text-xs font-semibold">{ev.user}</span>
                  <span className="text-[9px] sm:text-[10px] text-foreground/40 uppercase tracking-wider">
                    {format(ev.time, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm">
                  {ev.action}: <span className="font-bold text-foreground/80">{ev.target}</span>
                </p>
                {ev.description && (
                  <p className="text-xs text-foreground/50 italic">{ev.description}</p>
                )}
              </div>
            </div>
          ))}
          {sortedEvents.length === 0 && (
            <div className="py-12 text-center text-sm text-foreground/30 italic">
              Nenhuma atividade recente registrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Activity } from "lucide-react";
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
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Activity className="size-3.5" /> Feed de Atividades
      </h3>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 relative">
        <div className="absolute left-6 sm:left-7 top-6 bottom-6 w-px bg-border/80" />
        <div className="space-y-6 relative">
          {sortedEvents.map((ev) => (
            <div key={ev.id} className="flex gap-3 sm:gap-4 relative items-start">
              <div className="size-2.5 rounded-full bg-primary ring-4 ring-card mt-1.5 shrink-0 z-10" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[10px] font-mono-kasa font-semibold text-primary">
                    {format(ev.time, "HH:mm")}
                  </span>
                  <span className="text-xs font-semibold text-foreground/90">{ev.user}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(ev.time, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-snug">
                  {ev.action}: <span className="font-medium text-foreground">{ev.target}</span>
                </p>
                {ev.description && (
                  <p className="text-[11px] text-muted-foreground italic">{ev.description}</p>
                )}
              </div>
            </div>
          ))}
          {sortedEvents.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground italic">
              Nenhuma atividade recente registrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


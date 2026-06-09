import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/approvals-api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<string, string> = {
  meeting: "bg-sky-500/20 text-sky-300 border-sky-500/40",    
  task: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", 
  approval: "bg-amber-500/20 text-amber-300 border-amber-500/40", 
  dme: "bg-purple-500/20 text-purple-300 border-purple-500/40", 
  deadline: "bg-red-500/20 text-red-300 border-red-500/40",   
  google: "bg-sky-400/10 text-sky-400 border-sky-400/30 ring-1 ring-sky-400/20",
  other: "bg-muted text-muted-foreground border-border",
};

interface Props {
  clientId?: string;
  filter?: string;
  onSelectEvent?: (e: CalendarEvent) => void;
}

export function CalendarList({ clientId, filter, onSelectEvent }: Props) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-list", { clientId, filter }],
    queryFn: () => fetchCalendarEvents({ clientId }),
  });

  const filteredEvents = useMemo(() => {
    let list = events;
    if (filter && filter !== 'all') {
      list = events.filter(e => {
        if (filter === 'google') return (e as any).source === 'google';
        if (filter === 'system') return (e as any).source === 'system';
        return e.kind === filter;
      });
    }
    
    // Sort chronologically
    return [...list].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [events, filter]);

  if (isLoading) return <div className="py-20 text-center animate-pulse text-foreground/40">Carregando eventos...</div>;

  if (filteredEvents.length === 0) {
    return (
      <div className="py-20 text-center bg-surface rounded-2xl border border-dashed border-border">
        <p className="text-foreground/40 font-mono-kasa uppercase text-xs">Nenhum evento encontrado para os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {filteredEvents.map((e) => {
          const date = new Date(e.starts_at);
          return (
            <Card 
              key={e.id}
              onClick={() => onSelectEvent?.(e)}
              className="p-4 bg-background border-border hover:border-primary/50 transition-all cursor-pointer group flex items-start gap-4"
            >
              <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl bg-surface border border-border">
                <span className="text-[10px] font-mono-kasa uppercase text-foreground/40">{date.toLocaleDateString("pt-BR", { month: 'short' })}</span>
                <span className="text-2xl font-bold text-primary">{date.getDate()}</span>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{e.title}</h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                        <Clock className="size-3.5" />
                        <span>{date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] uppercase font-mono-kasa",
                          (e as any).source === 'google' ? KIND_COLOR.google : (KIND_COLOR[e.kind as keyof typeof KIND_COLOR] || KIND_COLOR.other)
                        )}
                      >
                        {e.kind}
                      </Badge>
                    </div>
                  </div>
                </div>

                {e.description && (
                  <p className="text-sm text-foreground/60 line-clamp-2 italic">{e.description}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

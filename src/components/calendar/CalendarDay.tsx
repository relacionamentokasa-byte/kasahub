import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/approvals-api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export function CalendarDay({ clientId, filter, onSelectEvent }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const { from, to } = useMemo(() => {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [cursor]);

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-day", { clientId, from, to, filter }],
    queryFn: () => fetchCalendarEvents({ clientId, from, to }),
  });

  const filteredEvents = useMemo(() => {
    if (!filter || filter === 'all') return events;
    return events.filter(e => {
      if (filter === 'google') return (e as any).source === 'google';
      if (filter === 'system') return (e as any).source === 'system';
      return e.kind === filter;
    });
  }, [events, filter]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isToday = cursor.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex flex-col">
          <h3 className="font-display text-2xl capitalize">
            {cursor.toLocaleDateString("pt-BR", { weekday: 'long' })}
          </h3>
          <p className="text-sm text-foreground/60">
            {cursor.toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCursor(new Date(cursor.getTime() - 24 * 60 * 60 * 1000))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs px-3" onClick={() => {
            const d = new Date();
            d.setHours(0,0,0,0);
            setCursor(d);
          }}>Hoje</Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCursor(new Date(cursor.getTime() + 24 * 60 * 60 * 1000))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-background">
        <div className="grid grid-cols-[80px_1fr] relative max-h-[600px] overflow-y-auto">
          {/* Time Column */}
          <div className="bg-surface border-r border-border">
            {hours.map(h => (
              <div key={h} className="h-24 border-b border-border last:border-b-0 p-2 text-xs font-mono-kasa text-foreground/40 text-right pr-4">
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Timeline Column */}
          <div className="relative">
            {hours.map(h => (
              <div key={h} className="h-24 border-b border-border last:border-b-0" />
            ))}

            {isToday && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-primary z-20 pointer-events-none"
                style={{ top: `${(new Date().getHours() * 96) + (new Date().getMinutes() / 60 * 96)}px` }}
              >
                <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-primary" />
              </div>
            )}

            {/* Events */}
            {filteredEvents.map(e => {
              const start = new Date(e.starts_at);
              const top = (start.getHours() * 96) + (start.getMinutes() / 60 * 96);
              const height = 96; 

              return (
                <TooltipProvider key={e.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onSelectEvent?.(e)}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        className={cn(
                          "absolute inset-x-4 p-3 rounded-xl border text-sm text-left overflow-hidden z-10 transition-all hover:ring-2 hover:ring-primary/30 flex flex-col gap-1",
                          (e as any).source === 'google' ? KIND_COLOR.google : (KIND_COLOR[e.kind as keyof typeof KIND_COLOR] || KIND_COLOR.other)
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="size-3 opacity-50" />
                          <span className="text-[10px] font-mono-kasa font-bold">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="font-bold">{e.title}</p>
                        {e.description && <p className="text-[10px] opacity-70 line-clamp-2 italic">{e.description}</p>}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-surface border-border p-3 max-w-xs">
                      <p className="font-bold text-base mb-1">{e.title}</p>
                      <p className="text-xs opacity-60 mb-2">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      {e.description && <p className="text-xs italic border-t border-border pt-2 mt-2">{e.description}</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

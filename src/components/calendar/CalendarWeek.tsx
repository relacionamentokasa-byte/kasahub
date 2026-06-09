import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/approvals-api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/finance-api";
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

export function CalendarWeek({ clientId, filter, onSelectEvent }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // Start of week (Sunday)
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const { from, to } = useMemo(() => {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + 7);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [cursor]);

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-week", { clientId, from, to, filter }],
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

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [cursor]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date().toDateString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <h3 className="font-display text-2xl capitalize">
          {days[0].toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })} - {days[6].toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCursor(new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs px-3" onClick={() => {
            const d = new Date();
            d.setHours(0,0,0,0);
            d.setDate(d.getDate() - d.getDay());
            setCursor(d);
          }}>Hoje</Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCursor(new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-background">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-surface">
          <div className="p-2 border-r border-border" />
          {days.map((d) => (
            <div key={d.toISOString()} className={cn(
              "p-2 text-center border-r border-border last:border-r-0",
              d.toDateString() === today && "bg-primary/5"
            )}>
              <p className="text-[10px] font-mono-kasa uppercase text-foreground/40">{d.toLocaleDateString("pt-BR", { weekday: 'short' })}</p>
              <p className={cn(
                "text-lg font-bold",
                d.toDateString() === today ? "text-primary" : "text-foreground"
              )}>{d.getDate()}</p>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative max-h-[600px] overflow-y-auto">
          {/* Time Column */}
          <div className="bg-surface/50">
            {hours.map(h => (
              <div key={h} className="h-20 border-b border-border border-r p-1 text-[9px] font-mono-kasa text-foreground/30 text-right pr-2">
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {days.map((day) => {
            const dayEvents = filteredEvents.filter(e => new Date(e.starts_at).toDateString() === day.toDateString());
            
            return (
              <div key={day.toISOString()} className={cn(
                "relative border-r border-border last:border-r-0",
                day.toDateString() === today && "bg-primary/[0.02]"
              )}>
                {hours.map(h => (
                  <div key={h} className="h-20 border-b border-border last:border-b-0" />
                ))}

                {/* Events */}
                {dayEvents.map(e => {
                  const start = new Date(e.starts_at);
                  const top = (start.getHours() * 80) + (start.getMinutes() / 60 * 80);
                  // Approximate duration to 1 hour if not specified
                  const height = 80; 

                  return (
                    <TooltipProvider key={e.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onSelectEvent?.(e)}
                            style={{ top: `${top}px`, height: `${height}px` }}
                            className={cn(
                              "absolute inset-x-1 p-1 rounded-md border text-[9px] text-left overflow-hidden z-10 transition-all hover:ring-2 hover:ring-primary/30",
                              (e as any).source === 'google' ? KIND_COLOR.google : (KIND_COLOR[e.kind as keyof typeof KIND_COLOR] || KIND_COLOR.other)
                            )}
                          >
                            <p className="font-bold truncate">{e.title}</p>
                            <p className="opacity-70">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-surface border-border p-2">
                          <p className="font-bold">{e.title}</p>
                          <p className="text-[10px] opacity-60 mb-1">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          {e.description && <p className="text-[10px] italic">{e.description}</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/approvals-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
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

const KIND_LABEL: Record<string, string> = {
  meeting: "Reunião",
  task: "Job",
  approval: "Aprovação",
  dme: "Demanda Extra",
  deadline: "Financeiro/Prazo",
  google: "Google Calendar",
  other: "Outro",
};

interface Props {
  clientId?: string;
  filter?: string;
  onSelectEvent?: (e: CalendarEvent) => void;
}

export function CalendarMonth({ clientId, filter, onSelectEvent }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const { from, to } = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 42);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [cursor]);

  const { data: events = [] } = useQuery({
    queryKey: ["calendar", { clientId, from, to, filter }],
    queryFn: () => fetchCalendarEvents({ clientId, from, to }),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const filteredEvents = useMemo(() => {
    if (!filter || filter === 'all') return events;
    return events.filter(e => {
      if (filter === 'google') return (e as any).source === 'google';
      if (filter === 'system') return (e as any).source === 'system';
      return e.kind === filter;
    });
  }, [events, filter]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filteredEvents) {
      const k = new Date(e.starts_at).toDateString();
      (map[k] ||= []).push(e);
    }
    return map;
  }, [filteredEvents]);

  const days: Date[] = useMemo(() => {
    const start = new Date(from);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [from]);

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const today = new Date().toDateString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <h3 className="font-display text-2xl capitalize">{monthLabel}</h3>
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs px-3" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Hoje</Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border-y border-border overflow-x-auto">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="bg-surface p-2 text-[10px] font-mono-kasa capitalize text-foreground/40 text-center min-w-[100px]">
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = d.toDateString() === today;
          const dayEvents = eventsByDay[d.toDateString()] || [];
          return (
            <div
              key={i}
              className={cn(
                "bg-background min-h-[120px] p-2 flex flex-col gap-1 border-r border-border last:border-r-0 min-w-[100px]",
                !inMonth && "bg-background/40",
                isToday && "relative after:absolute after:inset-0 after:ring-1 after:ring-primary/30 after:pointer-events-none",
              )}
            >
              <span className={cn(
                "text-[10px] font-mono-kasa flex items-center justify-center size-5 rounded-full", 
                isToday ? "bg-primary text-primary-foreground" : "text-foreground/50"
              )}>
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-1 mt-1">
                {dayEvents.slice(0, 4).map((e) => (
                  <TooltipProvider key={e.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onSelectEvent?.(e)}
                          className={cn(
                            "text-[9px] px-1.5 py-1 rounded-md border text-left truncate transition-colors",
                            (e as any).source === 'google' ? KIND_COLOR.google : (KIND_COLOR[e.kind as keyof typeof KIND_COLOR] || KIND_COLOR.other),
                          )}
                        >
                          {e.title}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-surface border-border text-xs">
                        <p className="font-bold mb-1">{e.title}</p>
                        <p className="opacity-70">{new Date(e.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        {e.description && <p className="mt-1 italic">{e.description}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {dayEvents.length > 4 && (
                  <button className="text-[9px] text-foreground/40 font-mono-kasa hover:text-primary transition-colors text-center py-1">
                    + {dayEvents.length - 4} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 px-2">
        {Object.entries(KIND_LABEL).map(([k, l]) => (
          <Badge key={k} variant="outline" className={cn("text-[9px] font-mono-kasa uppercase tracking-wider", KIND_COLOR[k as keyof typeof KIND_COLOR])}>
            {l}
          </Badge>
        ))}
      </div>
    </div>
  );
}


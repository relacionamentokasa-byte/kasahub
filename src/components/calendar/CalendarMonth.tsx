import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/approvals-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<string, string> = {
  post: "bg-primary/20 text-primary border-primary/40",
  meeting: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  deadline: "bg-red-500/20 text-red-300 border-red-500/40",
  task: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  other: "bg-muted text-muted-foreground border-border",
};

const KIND_LABEL: Record<string, string> = {
  post: "Post",
  meeting: "Reunião",
  deadline: "Prazo",
  task: "Tarefa",
  other: "Outro",
};

interface Props {
  clientId?: string;
  onSelectEvent?: (e: CalendarEvent) => void;
}

export function CalendarMonth({ clientId, onSelectEvent }: Props) {
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
    queryKey: ["calendar", { clientId, from, to }],
    queryFn: () => fetchCalendarEvents({ clientId, from, to }),
  });

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const k = new Date(e.starts_at).toDateString();
      (map[k] ||= []).push(e);
    }
    return map;
  }, [events]);

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
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="bg-surface p-2 text-[10px] font-mono-kasa capitalize text-foreground/40 text-center">
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
                "bg-background min-h-24 p-2 flex flex-col gap-1",
                !inMonth && "opacity-40",
                isToday && "ring-1 ring-primary ring-inset",
              )}
            >
              <span className={cn("text-xs font-medium", isToday && "text-primary")}>{d.getDate()}</span>
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelectEvent?.(e)}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border text-left truncate",
                      KIND_COLOR[e.kind] || KIND_COLOR.other,
                    )}
                  >
                    {e.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-foreground/50">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(KIND_LABEL).map(([k, l]) => (
          <Badge key={k} variant="outline" className={cn("text-[10px] font-mono-kasa uppercase", KIND_COLOR[k])}>
            {l}
          </Badge>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Plus, 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  List, 
  Filter,
  Check,
  CalendarDays
} from "lucide-react";
import { useCalendarRealtime } from "@/hooks/use-calendar-realtime";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";
import { CalendarWeek } from "@/components/calendar/CalendarWeek";
import { CalendarDay } from "@/components/calendar/CalendarDay";
import { CalendarList } from "@/components/calendar/CalendarList";
import { NewEventDialog } from "@/components/calendar/NewEventDialog";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { type CalendarEvent } from "@/lib/approvals-api";
import { fetchClients } from "@/lib/ops-api";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — KASA HUB" }] }),
  component: CalendarPage,
});

const EVENT_TYPES = [
  { id: "all", label: "Todos os eventos" },
  { id: "google", label: "Google Calendar" },
  { id: "system", label: "Sistema (Jobs/Contratos)" },
  { id: "meeting", label: "Reuniões" },
  { id: "task", label: "Jobs / Tarefas" },
  { id: "finance", label: "Financeiro" },
];

function CalendarPage() {
  const [clientId, setClientId] = useState<string>("all");
  const [view, setView] = useState<string>("month");
  const [filter, setFilter] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Ativa o Realtime para o calendário
  useCalendarRealtime();

  
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full mx-auto space-y-6 animate-reveal">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-4 sm:pb-6">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-widest font-semibold">
            Planejamento & Agenda Central
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-1">
            Agenda Central
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Compromissos, entregas de jobs, reuniões e vencimentos em visão sincronizada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none gap-1.5 bg-card border-border/80 h-8 text-xs rounded-lg font-medium">
                <Filter className="size-3 text-muted-foreground" />
                <span className="truncate">{EVENT_TYPES.find(t => t.id === filter)?.label || "Filtros"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono-kasa">Filtrar por tipo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EVENT_TYPES.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.id}
                  checked={filter === type.id}
                  onCheckedChange={() => setFilter(type.id)}
                  className="text-xs"
                >
                  {type.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="flex-1 sm:w-48 bg-card border-border/80 h-8 text-xs rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os clientes</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.company || c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOpen(true)} className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium h-8 px-3 gap-1.5 shadow-xs transition-colors cursor-pointer text-xs">
            <Plus className="size-3.5" /> <span>Novo Evento</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center bg-card p-1 rounded-xl border border-border/80 w-fit shadow-2xs">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="bg-transparent h-8 p-0 gap-1">
              <TabsTrigger value="month" className="text-xs gap-1.5 h-7 px-3 rounded-lg data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground font-medium">
                <LayoutGrid className="size-3.5" /> <span className="hidden sm:inline">Mensal</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs gap-1.5 h-7 px-3 rounded-lg data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground font-medium">
                <CalendarIcon className="size-3.5" /> <span className="hidden sm:inline">Semanal</span>
              </TabsTrigger>
              <TabsTrigger value="day" className="text-xs gap-1.5 h-7 px-3 rounded-lg data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground font-medium">
                <CalendarDays className="size-3.5" /> <span className="hidden sm:inline">Diária</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs gap-1.5 h-7 px-3 rounded-lg data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground font-medium">
                <List className="size-3.5" /> <span className="hidden sm:inline">Lista</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono-kasa font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Sincronizado</span>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono-kasa text-muted-foreground uppercase">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-primary" />
              <span>Sistema</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-sky-400" />
              <span>Google</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-2 lg:p-4 overflow-hidden shadow-xs">
        {view === "month" && (
          <CalendarMonth
            clientId={clientId === "all" ? undefined : clientId}
            filter={filter}
            onSelectEvent={(e) => {
              setSelectedEvent(e);
              setDetailOpen(true);
            }}
          />
        )}
        {view === "week" && (
          <CalendarWeek
            clientId={clientId === "all" ? undefined : clientId}
            filter={filter}
            onSelectEvent={(e) => {
              setSelectedEvent(e);
              setDetailOpen(true);
            }}
          />
        )}
        {view === "day" && (
          <CalendarDay
            clientId={clientId === "all" ? undefined : clientId}
            filter={filter}
            onSelectEvent={(e) => {
              setSelectedEvent(e);
              setDetailOpen(true);
            }}
          />
        )}
        {view === "list" && (
          <CalendarList
            clientId={clientId === "all" ? undefined : clientId}
            filter={filter}
            onSelectEvent={(e) => {
              setSelectedEvent(e);
              setDetailOpen(true);
            }}
          />
        )}
      </div>

      <NewEventDialog open={newOpen} onOpenChange={setNewOpen} />
      <EventDetailDialog
        event={selectedEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}


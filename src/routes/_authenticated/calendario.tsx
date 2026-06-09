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

  
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="size-4 text-primary" />
            <p className="text-[10px] font-mono-kasa capitalize text-primary/70">
              Experiência · Calendário
            </p>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl">Agenda Central</h1>
          <p className="text-sm text-foreground/60 mt-2">
            Compromissos, jobs, reuniões e financeiro em uma visão única.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-surface border-border">
                <Filter className="size-4" />
                <span>{EVENT_TYPES.find(t => t.id === filter)?.label || "Filtros"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EVENT_TYPES.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.id}
                  checked={filter === type.id}
                  onCheckedChange={() => setFilter(type.id)}
                >
                  {type.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-48 lg:w-56 bg-surface border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <Plus className="size-4" /> <span className="hidden sm:inline">Novo evento</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center bg-surface p-1 rounded-xl border border-border w-fit">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="bg-transparent h-8">
              <TabsTrigger value="month" className="text-xs gap-2"><LayoutGrid className="size-3.5" /> <span className="hidden sm:inline">Mensal</span></TabsTrigger>
              <TabsTrigger value="week" className="text-xs gap-2"><CalendarIcon className="size-3.5" /> <span className="hidden sm:inline">Semanal</span></TabsTrigger>
              <TabsTrigger value="day" className="text-xs gap-2"><CalendarIcon className="size-3.5" /> <span className="hidden sm:inline">Diária</span></TabsTrigger>
              <TabsTrigger value="list" className="text-xs gap-2"><List className="size-3.5" /> <span className="hidden sm:inline">Lista</span></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono-kasa text-foreground/40 uppercase">
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

      <div className="bg-surface rounded-2xl border border-border p-1 lg:p-4 overflow-hidden">
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


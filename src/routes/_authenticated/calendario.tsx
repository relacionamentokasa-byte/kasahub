import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, LayoutGrid, Calendar as CalendarIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";
import { NewEventDialog } from "@/components/calendar/NewEventDialog";
import { fetchClients } from "@/lib/ops-api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — KASA HUB" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const [clientId, setClientId] = useState<string>("all");
  const [view, setView] = useState<string>("month");
  const [newOpen, setNewOpen] = useState(false);
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono-kasa capitalize text-primary/70">
            Experiência · Calendário
          </p>
          <h1 className="font-display text-3xl lg:text-4xl mt-1">Agenda Central</h1>
          <p className="text-sm text-foreground/60 mt-2">
            Compromissos, jobs, reuniões e financeiro em uma visão única.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-56 bg-surface border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <Plus className="size-4" /> Novo evento
          </Button>
        </div>
      </header>

      <div className="flex justify-between items-center bg-surface p-1 rounded-xl border border-border w-fit">
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-transparent">
            <TabsTrigger value="month" className="gap-2"><LayoutGrid className="size-3.5" /> Mensal</TabsTrigger>
            <TabsTrigger value="week" className="gap-2"><CalendarIcon className="size-3.5" /> Semanal</TabsTrigger>
            <TabsTrigger value="day" className="gap-2"><CalendarIcon className="size-3.5" /> Diária</TabsTrigger>
            <TabsTrigger value="list" className="gap-2"><List className="size-3.5" /> Lista</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CalendarMonth clientId={clientId === "all" ? undefined : clientId} />

      <NewEventDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

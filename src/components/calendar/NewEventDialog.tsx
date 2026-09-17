import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCalendarEvent, type CalendarEvent } from "@/lib/approvals-api";
import { fetchClients, fetchProjects } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Loader2 } from "lucide-react";

export function NewEventDialog({
  open,
  onOpenChange,
  defaultClientId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultClientId?: string;
}) {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const [form, setForm] = useState({
    title: "",
    description: "",
    kind: "meeting" as CalendarEvent["kind"],
    starts_at: "",
    client_id: defaultClientId ?? "",
    project_id: "",
  });

  const mut = useMutation({
    mutationFn: () =>
      createCalendarEvent({
        title: form.title,
        description: form.description || undefined,
        kind: form.kind,
        starts_at: form.starts_at,
        client_id: form.client_id || null,
        project_id: form.project_id || null,
      }),
    onSuccess: async (newEvent) => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Evento agendado com sucesso!");

      // Sincronizar com Google se necessário
      try {
        await supabase.functions.invoke("google-calendar-sync", {
          body: { action: "push-event", eventData: newEvent },
        });
      } catch (e) {
        console.error("Erro ao sincronizar com Google:", e);
      }

      onOpenChange(false);
      setForm({
        title: "",
        description: "",
        kind: "meeting",
        starts_at: "",
        client_id: defaultClientId ?? "",
        project_id: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredProjects = projects.filter((p) => !form.client_id || p.client_id === form.client_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Calendar className="size-5" />
            </div>
            <span>Novo Evento</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Agende uma reunião, prazo ou marco no calendário operacional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Título do Evento *
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Reunião de Alinhamento Semanal"
              className="h-9 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Tipo de Evento *
              </Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as CalendarEvent["kind"] })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting" className="text-xs">Reunião</SelectItem>
                  <SelectItem value="task" className="text-xs">Job / Tarefa</SelectItem>
                  <SelectItem value="approval" className="text-xs">Aprovação</SelectItem>
                  <SelectItem value="dme" className="text-xs">Demanda Extra</SelectItem>
                  <SelectItem value="deadline" className="text-xs">Financeiro / Prazo</SelectItem>
                  <SelectItem value="other" className="text-xs">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Data e Horário *
              </Label>
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Cliente Vinculado
            </Label>
            <Select
              value={form.client_id || undefined}
              onValueChange={(v) => setForm({ ...form, client_id: v, project_id: "" })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                    {c.company || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredProjects.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Projeto Vinculado
              </Label>
              <Select
                value={form.project_id || undefined}
                onValueChange={(v) => setForm({ ...form, project_id: v })}
                disabled={!form.client_id}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Descrição / Pauta
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Descreva a pauta ou detalhes adicionais…"
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={!form.title.trim() || !form.starts_at || mut.isPending}
            className="h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Calendar className="size-3.5" />}
            Agendar Evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

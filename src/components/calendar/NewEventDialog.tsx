import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCalendarEvent, type CalendarEvent } from "@/lib/approvals-api";
import { fetchClients, fetchProjects } from "@/lib/ops-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

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
    kind: "post" as CalendarEvent["kind"],
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
      toast.success("Evento criado");
      
      // Sincronizar com Google se necessário
      try {
        await supabase.functions.invoke("google-calendar-sync", {
          body: { action: "push-event", eventData: newEvent }
        });
      } catch (e) {
        console.error("Erro ao sincronizar com Google:", e);
      }

      onOpenChange(false);
      setForm({ title: "", description: "", kind: "post", starts_at: "", client_id: defaultClientId ?? "", project_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as CalendarEvent["kind"] })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="task">Job</SelectItem>
                  <SelectItem value="approval">Aprovação</SelectItem>
                  <SelectItem value="dme">Demanda Extra</SelectItem>
                  <SelectItem value="deadline">Financeiro/Prazo</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quando</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="bg-background" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {projects.filter((p) => !form.client_id || p.client_id === form.client_id).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-background" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!form.title || !form.starts_at || mut.isPending}>Criar evento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

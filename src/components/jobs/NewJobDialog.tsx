import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createJob, fetchClients, fetchProjects, type JobStage } from "@/lib/ops-api";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

export function NewJobDialog({
  stage,
  open,
  onOpenChange,
  defaultProjectId,
  defaultClientId,
}: {
  stage: JobStage | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultProjectId?: string;
  defaultClientId?: string;
}) {
  const qc = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    due_date: "",
    project_id: defaultProjectId ?? "",
    client_id: defaultClientId ?? "",
  });

  const mut = useMutation({
    mutationFn: () =>
      createJob({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date || null,
        project_id: form.project_id || null,
        client_id: form.client_id || null,
        stage_id: stage?.id ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job criado");
      onOpenChange(false);
      setForm({
        title: "",
        description: "",
        priority: "normal",
        due_date: "",
        project_id: defaultProjectId ?? "",
        client_id: defaultClientId ?? "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Novo job{stage ? ` · ${stage.name}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            {!defaultProjectId && (
              <div className="space-y-1.5">
                <Label>Projeto</Label>
                <Select value={form.project_id || undefined} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!defaultClientId && (
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={form.client_id || undefined} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.title}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

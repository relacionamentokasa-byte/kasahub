import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createJob, fetchClients, fetchProjects, type JobStage } from "@/lib/ops-api";
import { fetchPartners } from "@/lib/partners-api";
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
import { JOB_TYPES } from "@/lib/job-types";


export function NewJobDialog({
  stage,
  open,
  onOpenChange,
  defaultProjectId,
  defaultClientId,
  defaultPeriod,
}: {
  stage: JobStage | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultProjectId?: string;
  defaultClientId?: string;
  defaultPeriod?: string;
}) {
  const qc = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: freelancers = [] } = useQuery({ 
    queryKey: ["partners", "freelancer"], 
    queryFn: () => fetchPartners("freelancer") 
  });
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    job_type: "post",
    due_date: "",
    project_id: defaultProjectId ?? "",
    client_id: defaultClientId ?? "",
    period: defaultPeriod ?? "",
    freelancer_id: "",
  });


  const mut = useMutation({
    mutationFn: () =>
      createJob({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        job_type: form.job_type,
        due_date: form.due_date || null,
        project_id: form.project_id || null,
        client_id: form.client_id || null,
        stage_id: stage?.id ?? null,
        period: form.period || null,
        freelancer_id: form.freelancer_id || null,
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job criado");
      onOpenChange(false);
      setForm({
        title: "",
        description: "",
        priority: "normal",
        job_type: "post",
        due_date: "",
        project_id: defaultProjectId ?? "",
        client_id: defaultClientId ?? "",
        period: defaultPeriod ?? "",
        freelancer_id: "",
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
            <Label>Tipo de Job</Label>
            <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="space-y-1.5 col-span-2">
              <Label>Atribuir a Freelancer (Opcional)</Label>
              <Select value={form.freelancer_id} onValueChange={(v) => setForm({ ...form, freelancer_id: v })}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione um freelancer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Usuário Interno</SelectItem>
                  {freelancers.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name} ({f.specialty})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.project_id && (
            <div className="space-y-1.5">
              <Label>Período (Opcional)</Label>
              <Input 
                placeholder="Ex: 2026-06" 
                value={form.period} 
                onChange={(e) => setForm({ ...form, period: e.target.value })} 
                className="bg-background border-border"
              />
            </div>
          )}
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

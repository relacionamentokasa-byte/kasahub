import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createJob, fetchClients, fetchProjects, type JobStage } from "@/lib/ops-api";
import { fetchPartners } from "@/lib/partners-api";
import { fetchProfiles } from "@/lib/profile-api";
import { fetchServices } from "@/lib/services-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
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
  const { data: services = [] } = useQuery({ queryKey: ["services", { onlyActive: true }], queryFn: () => fetchServices({ onlyActive: true }) });
  const { data: freelancers = [] } = useQuery({ 
    queryKey: ["partners", "freelancer"], 
    queryFn: () => fetchPartners("freelancer") 
  });
  const { data: team = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  // opTemplates removed
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    job_type: "post",
    due_date: "",
    project_id: defaultProjectId ?? "",
    client_id: defaultClientId ?? "",
    contract_id: "",
    service_id: "",
    period: defaultPeriod ?? "",
    freelancer_id: "",
    main_responsible_id: "",
    // operational_template_id: "", // Removed
    team_involved_ids: [] as string[],
  });

  // Herança Automática
  useEffect(() => {
    if (form.project_id) {
      const p = projects.find(x => x.id === form.project_id);
      if (p) {
        setForm(f => ({
          ...f,
          client_id: p.client_id || f.client_id,
          contract_id: p.contract_id || f.contract_id,
          main_responsible_id: p.responsible_id || p.owner_id || f.main_responsible_id,
        }));
      }
    }
  }, [form.project_id, projects]);


  const mut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("jobs").insert({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        job_type: form.job_type,
        due_date: form.due_date || null,
        project_id: form.project_id,
        client_id: form.client_id,
        contract_id: form.contract_id || null,
        service_id: form.service_id,
        stage_id: stage?.id ?? null,
        period: form.period || null,
        freelancer_id: form.freelancer_id || null,
        main_responsible_id: form.main_responsible_id || null,
        // operational_template_id: form.operational_template_id || null,
        team_involved: form.team_involved_ids.map(id => ({ user_id: id, role: "Membro" })),
      } as any).select().single();
      
      if (error) throw error;

      // Template Steps Logic Removed

      return data;
    },
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
        contract_id: "",
        service_id: "",
        period: defaultPeriod ?? "",
        freelancer_id: "",
        main_responsible_id: "",
        // operational_template_id: "", // Removed
        team_involved_ids: [],
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

            <div className="space-y-1.5">
              <Label>Projeto</Label>
              <Select value={form.project_id || undefined} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger className={!form.project_id ? "border-destructive" : ""}><SelectValue placeholder="Obrigatório" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={form.client_id || undefined} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger className={!form.client_id ? "border-destructive" : ""}><SelectValue placeholder="Obrigatório" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Responsável Principal</Label>
              <Select value={form.main_responsible_id} onValueChange={(v) => setForm({ ...form, main_responsible_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {team.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Equipe Envolvida</Label>
              <Select 
                value="" 
                onValueChange={(v) => setForm(f => ({ ...f, team_involved_ids: Array.from(new Set([...f.team_involved_ids, v])) }))}
              >
                <SelectTrigger><SelectValue placeholder="Adicionar membros..." /></SelectTrigger>
                <SelectContent>
                  {team.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name}</SelectItem>
                  ))}
                  {freelancers.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.name} (Freelancer)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.team_involved_ids.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.team_involved_ids.map(id => {
                    const member = (team.find((x: any) => x.id === id) as any) || (freelancers.find((x: any) => x.id === id) as any);
                    return member ? (
                      <div key={id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-[10px]">
                        {member.display_name || member.full_name || member.name}
                        <button onClick={() => setForm(f => ({ ...f, team_involved_ids: f.team_involved_ids.filter(x => x !== id) }))}>
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
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
            disabled={mut.isPending || !form.title || !form.project_id || !form.client_id || !form.service_id}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

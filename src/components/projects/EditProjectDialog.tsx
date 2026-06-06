import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateProject, deleteProject, fetchClients } from "@/lib/ops-api";
import { fetchContracts } from "@/lib/finance-api";
import { fetchProposals } from "@/lib/crm-api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type Project = {
  id: string;
  name: string;
  client_id: string | null;
  contract_id?: string | null;
  proposal_id?: string | null;
  briefing: string | null;
  due_date: string | null;
  status: string;
  cover_url: string | null;
  color: string | null;
  type: string | null;
  responsible_id: string | null;
};

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: proposals = [] } = useQuery({ queryKey: ["proposals"], queryFn: fetchProposals });

  const [form, setForm] = useState({
    name: project.name ?? "",
    client_id: project.client_id ?? "",
    contract_id: project.contract_id ?? "",
    proposal_id: project.proposal_id ?? "",
    briefing: project.briefing ?? "",
    due_date: project.due_date ?? "",
    status: project.status ?? "active",
    cover_url: (project.cover_url ?? "") as string | null,
    color: project.color ?? "#FFBC45",
    type: project.type ?? "automatic",
    responsible_id: project.responsible_id ?? "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: project.name ?? "",
        client_id: project.client_id ?? "",
        contract_id: project.contract_id ?? "",
        proposal_id: project.proposal_id ?? "",
        briefing: project.briefing ?? "",
        due_date: project.due_date ?? "",
        status: project.status ?? "active",
        cover_url: project.cover_url ?? "",
        color: project.color ?? "#FFBC45",
        type: project.type ?? "automatic",
        responsible_id: project.responsible_id ?? "",
      });
    }
  }, [open, project]);

  const clientContracts = contracts.filter((c) => !form.client_id || c.client_id === form.client_id);
  const clientProposals = proposals.filter(
    (p) => !form.client_id || (p as { client_id?: string | null }).client_id === form.client_id,
  );

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    }
  });

  const mut = useMutation({
    mutationFn: () =>
      updateProject(project.id, {
        name: form.name,
        client_id: form.client_id || null,
        contract_id: form.contract_id || null,
        proposal_id: form.proposal_id || null,
        briefing: form.briefing || null,
        due_date: form.due_date || null,
        status: form.status,
        cover_url: form.cover_url || null,
        color: form.color,
        type: form.type,
        responsible_id: form.responsible_id || null,
      } as Parameters<typeof updateProject>[1]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto atualizado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteProject(project.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto removido");
      onOpenChange(false);
      navigate({ to: "/projetos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Editar projeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Capa do projeto</Label>
            <ImageUpload
              value={form.cover_url}
              onChange={(url) => setForm({ ...form, cover_url: url })}
              folder="projects"
              label="Capa"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nome do projeto</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select
              value={form.client_id || undefined}
              onValueChange={(v) => setForm({ ...form, client_id: v, contract_id: "", proposal_id: "" })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label>Contrato {form.type === 'automatic' && <span className="text-destructive">*</span>}</Label>
              <Select
                value={form.contract_id || undefined}
                onValueChange={(v) => setForm({ ...form, contract_id: v })}
                disabled={!form.client_id}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o contrato de origem" /></SelectTrigger>
                <SelectContent>
                  {clientContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>

              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo final</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automático</SelectItem>
                  <SelectItem value="special">Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={form.responsible_id || undefined} onValueChange={(v) => setForm({ ...form, responsible_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-16 p-1 h-10" />
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Briefing</Label>
            <Textarea rows={4} value={form.briefing} onChange={(e) => setForm({ ...form, briefing: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Remover este projeto? Esta ação não pode ser desfeita.")) del.mutate();
            }}
            disabled={del.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4 mr-1" /> Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !form.name || !form.client_id || (form.type === 'automatic' && !form.contract_id)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >

              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

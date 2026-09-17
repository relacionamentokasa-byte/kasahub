import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateProject, fetchClients } from "@/lib/ops-api";
import { fetchProposals } from "@/lib/crm-api";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";
import { FolderGit2, Trash2, Loader2 } from "lucide-react";
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
  const contracts: any[] = [];
  const { data: _proposals = [] } = useQuery({ queryKey: ["proposals", "all"], queryFn: () => fetchProposals() });

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

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    },
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
      toast.success("Projeto atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").delete().eq("id", project.id);
      if (error) throw error;
      return project.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto removido com sucesso!");
      onOpenChange(false);
      navigate({ to: "/projetos" });
    },
    onError: (e: any) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FolderGit2 className="size-5" />
            </div>
            <span>Editar Projeto</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gerencie os dados gerais, prazos, responsável e briefing do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="flex flex-col items-center gap-2 py-1">
            <ImageUpload
              value={form.cover_url}
              onChange={(url) => setForm({ ...form, cover_url: url })}
              folder="projects"
              label="Capa do Projeto"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Nome do Projeto *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Cliente Responsável *
            </Label>
            <Select
              value={form.client_id || undefined}
              onValueChange={(v) => setForm({ ...form, client_id: v, contract_id: "", proposal_id: "" })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione um cliente" />
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

          {clientContracts.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Contrato Vinculado
              </Label>
              <Select
                value={form.contract_id || undefined}
                onValueChange={(v) => setForm({ ...form, contract_id: v })}
                disabled={!form.client_id}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o contrato de origem" />
                </SelectTrigger>
                <SelectContent>
                  {clientContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Status
              </Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-xs font-mono-kasa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs font-mono-kasa">Ativo</SelectItem>
                  <SelectItem value="paused" className="text-xs font-mono-kasa">Pausado</SelectItem>
                  <SelectItem value="completed" className="text-xs font-mono-kasa">Concluído</SelectItem>
                  <SelectItem value="cancelled" className="text-xs font-mono-kasa text-destructive">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Prazo Final
              </Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Tipo de Projeto
              </Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic" className="text-xs">Automático</SelectItem>
                  <SelectItem value="special" className="text-xs">Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Responsável
              </Label>
              <Select value={form.responsible_id || undefined} onValueChange={(v) => setForm({ ...form, responsible_id: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs cursor-pointer">
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Cor de Destaque
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-12 h-9 p-1 rounded-md cursor-pointer shrink-0"
              />
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-9 text-xs font-mono-kasa"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Briefing / Objetivos
            </Label>
            <Textarea
              rows={3}
              value={form.briefing}
              onChange={(e) => setForm({ ...form, briefing: e.target.value })}
              className="text-xs resize-none"
              placeholder="Descreva o escopo e objetivos do projeto..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60 flex flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Tem certeza? Isso apagará também todos os jobs vinculados a este projeto.")) {
                del.mutate();
              }
            }}
            disabled={del.isPending}
            className="h-9 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
          >
            {del.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Excluir
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !form.name || !form.client_id}
              size="sm"
              className="h-9 text-xs font-medium gap-1.5"
            >
              {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FolderGit2 className="size-3.5" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

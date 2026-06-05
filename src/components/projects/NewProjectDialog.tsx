import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, fetchClients } from "@/lib/ops-api";
import { fetchContracts } from "@/lib/finance-api";
import { fetchProposals } from "@/lib/crm-api";
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
import { ImageUpload } from "@/components/ui/image-upload";

export function NewProjectDialog({
  open,
  onOpenChange,
  defaultClientId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultClientId?: string;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: proposals = [] } = useQuery({ queryKey: ["proposals"], queryFn: fetchProposals });
  const [form, setForm] = useState({
    name: "",
    client_id: defaultClientId ?? "",
    contract_id: "",
    proposal_id: "",
    briefing: "",
    due_date: "",
    cover_url: "" as string | null,
  });

  const clientContracts = contracts.filter((c) => !form.client_id || c.client_id === form.client_id);
  const clientProposals = proposals.filter(
    (p) =>
      (!form.client_id || (p as { client_id?: string | null }).client_id === form.client_id) &&
      ["accepted", "sent", "viewed"].includes(p.status),
  );

  const mut = useMutation({
    mutationFn: () =>
      createProject({
        name: form.name,
        client_id: form.client_id || null,
        contract_id: form.contract_id || null,
        proposal_id: form.proposal_id || null,
        briefing: form.briefing || null,
        due_date: form.due_date || null,
        cover_url: form.cover_url || null,
      } as Parameters<typeof createProject>[0]),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado");
      onOpenChange(false);
      setForm({ name: "", client_id: defaultClientId ?? "", contract_id: "", proposal_id: "", briefing: "", due_date: "", cover_url: "" });
      onCreated?.(p.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo projeto</DialogTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contrato (serviço)</Label>
              <Select
                value={form.contract_id || "__none__"}
                onValueChange={(v) => setForm({ ...form, contract_id: v === "__none__" ? "" : v })}
                disabled={!form.client_id}
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {clientContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Proposta</Label>
              <Select
                value={form.proposal_id || "__none__"}
                onValueChange={(v) => setForm({ ...form, proposal_id: v === "__none__" ? "" : v })}
                disabled={!form.client_id}
              >
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {clientProposals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prazo final</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Briefing</Label>
            <Textarea rows={4} value={form.briefing} onChange={(e) => setForm({ ...form, briefing: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.name}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

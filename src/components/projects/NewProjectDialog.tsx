import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createProject, fetchClients } from "@/lib/ops-api";

import { fetchProposals } from "@/lib/crm-api";
import { fetchClientServices, generateJobsForProject } from "@/lib/client-services-api";
import { fetchServices } from "@/lib/services-api";
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
import { Checkbox } from "@/components/ui/checkbox";
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

  useEffect(() => {
    const channel = supabase
      .channel('projects-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => qc.invalidateQueries({ queryKey: ["projects"] })
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const contracts: any[] = [];
  const { data: proposals = [] } = useQuery({ queryKey: ["proposals", "all"], queryFn: () => fetchProposals() });
  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => fetchServices({ onlyActive: true }),
  });

  const [form, setForm] = useState({
    name: "",
    client_id: defaultClientId ?? "",
    contract_id: "",
    proposal_id: "",
    briefing: "",
    start_date: "",
    due_date: "",
    responsible_id: "",
    cover_url: "" as string | null,
    type: "special" as const,
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const { data: contracted } = useQuery({
    queryKey: ["client-services", form.client_id],
    queryFn: () => fetchClientServices(form.client_id),
    enabled: !!form.client_id,
  });

  useEffect(() => {
    // Pre-select all active contracted services when client changes.
    // IMPORTANTE: só roda quando há dados reais — evita loop infinito (erro #185)
    // causado por um array default novo a cada render.
    if (!contracted) return;
    setSelectedServiceIds(
      contracted.filter((c) => c.status === "active").map((c) => c.service_id),
    );
  }, [contracted]);

  const clientContracts = contracts.filter((c) => !form.client_id || c.client_id === form.client_id);
  const clientProposals = proposals.filter(
    (p) =>
      (!form.client_id || (p as { client_id?: string | null }).client_id === form.client_id) &&
      ["accepted", "sent", "viewed"].includes(p.status),
  );

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    }
  });

  const mut = useMutation({
    mutationFn: async () => {
      const project = await createProject({
        name: form.name,
        client_id: form.client_id || null,
        contract_id: form.contract_id || null,
        proposal_id: form.proposal_id || null,
        briefing: form.briefing || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        cover_url: form.cover_url || null,
        responsible_id: form.responsible_id || null,
        type: form.type,
      } as Parameters<typeof createProject>[0]);
      // Geração automática de jobs desabilitada (limpeza operacional)

      return project;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Projeto criado");
      onOpenChange(false);
      setForm({ name: "", client_id: defaultClientId ?? "", contract_id: "", proposal_id: "", briefing: "", start_date: "", due_date: "", responsible_id: "", cover_url: "", type: "special" });
      setSelectedServiceIds([]);
      onCreated?.(p.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "Serviço";

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo Projeto Especial</DialogTitle>
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

          {/* Seleção de serviços para geração de jobs removida (limpeza operacional) */}


          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label>Contrato (opcional)</Label>
              <Select
                value={form.contract_id || undefined}
                onValueChange={(v) => setForm({ ...form, contract_id: v })}
                disabled={!form.client_id}
              >
                <SelectTrigger><SelectValue placeholder="Vincular a um contrato (opcional)" /></SelectTrigger>
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
              <Label>Responsável</Label>
              <Select
                value={form.responsible_id || undefined}
                onValueChange={(v) => setForm({ ...form, responsible_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data de Início</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prazo (Entrega Final)</Label>
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
            disabled={mut.isPending || !form.name || !form.client_id}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >

            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

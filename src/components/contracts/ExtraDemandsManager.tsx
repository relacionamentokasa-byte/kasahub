import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, CheckCircle2, Clock, AlertCircle, Trash2, ExternalLink, Copy, Check, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchExtraDemands, createExtraDemand, approveExtraDemand, deleteExtraDemand, updateExtraDemand } from "@/lib/ops-api";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ExtraDemandsManager({ clientId, contractId }: { clientId: string; contractId?: string }) {
  const qc = useQueryClient();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newDme, setNewDme] = useState({
    title: "",
    description: "",
    value: 0,
    deadline_days: 3,
    is_billable: true,
  });

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ["extra-demands", { clientId, contractId }],
    queryFn: () => fetchExtraDemands({ clientId, contractId }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createExtraDemand({ ...data, client_id: clientId, contract_id: contractId! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra-demands"] });
      toast.success("DME criada com sucesso");
      setIsNewOpen(false);
      setNewDme({ title: "", description: "", value: 0, deadline_days: 3, is_billable: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: approveExtraDemand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra-demands"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("DME aprovada e convertida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteExtraDemand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra-demands"] });
      toast.success("DME excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px] flex items-center gap-1"><CheckCircle2 className="size-3" /> Aprovada</span>;
      case "pending_approval": return <span className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded text-[10px] flex items-center gap-1"><Clock className="size-3" /> Aguardando</span>;
      case "draft": return <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px]">Rascunho</span>;
      case "in_production": return <span className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded text-[10px]">Produção</span>;
      case "completed": return <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px]">Concluída</span>;
      case "cancelled": return <span className="bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded text-[10px]">Cancelada</span>;
      default: return <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px]">{status}</span>;
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/dme/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de aprovação copiado");
  };

  if (isLoading) return <div className="p-10 text-foreground/40">Carregando DMEs...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-lg">Demandas Extras (DME)</h4>
        {contractId && (
          <Button onClick={() => setIsNewOpen(true)} size="sm" className="gap-2">
            <Plus className="size-4" /> Nova Demanda Extra
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {demands.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-2xl">
            <p className="text-foreground/40 text-sm">Nenhuma demanda extra cadastrada.</p>
          </div>
        ) : (
          demands.map((dme) => (
            <div key={dme.id} className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-primary">{dme.number_display}</span>
                  {getStatusBadge(dme.status)}
                </div>
                <h5 className="font-semibold text-sm truncate">{dme.title}</h5>
                <div className="text-[10px] text-foreground/50 mt-1 flex items-center gap-3">
                  <span>Prazo: {dme.deadline_days} dias</span>
                  <span>Valor: {BRL(Number(dme.value))}</span>
                  {dme.is_billable && <span className="text-emerald-400">Cobrável</span>}
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {dme.status === "pending_approval" && (
                  <Button variant="outline" size="icon" className="size-8" title="Copiar Link" onClick={() => copyLink(dme.public_token!)}>
                    <Copy className="size-3.5" />
                  </Button>
                )}
                {["draft", "pending_approval"].includes(dme.status) && (
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => approveMut.mutate(dme.id)}>
                    <Check className="size-3.5" /> Aprovar
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="size-8 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10" onClick={() => deleteMut.mutate(dme.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Demanda Extra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={newDme.title} onChange={(e) => setNewDme({ ...newDme, title: e.target.value })} placeholder="Ex: Banner Campanha Inverno" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={newDme.description} onChange={(e) => setNewDme({ ...newDme, description: e.target.value })} placeholder="Descreva os detalhes da entrega..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" value={newDme.value} onChange={(e) => setNewDme({ ...newDme, value: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Prazo (dias úteis)</Label>
                <Input type="number" value={newDme.deadline_days} onChange={(e) => setNewDme({ ...newDme, deadline_days: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cobrável</Label>
                <div className="text-[10px] text-foreground/50">Gerar lançamento financeiro ao aprovar</div>
              </div>
              <Switch checked={newDme.is_billable} onCheckedChange={(c) => setNewDme({ ...newDme, is_billable: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate(newDme)} disabled={!newDme.title || createMut.isPending}>
              Criar DME
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

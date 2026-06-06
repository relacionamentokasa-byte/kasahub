import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Ban, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { analyzeClientImpact, deleteClientCascade } from "@/lib/client-deletion";

export function DeleteClientDialog({
  clientId,
  open,
  onOpenChange,
  onDeleted,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const { data: impact, isLoading } = useQuery({
    queryKey: ["client-impact", clientId],
    queryFn: () => analyzeClientImpact(clientId!),
    enabled: !!clientId && open,
  });

  const mut = useMutation({
    mutationFn: () => deleteClientCascade(clientId!),
    onSuccess: (counts) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success(
        `Cliente removido. ${counts.projects_removed} projeto(s), ${counts.jobs_removed} job(s), ${counts.transactions_cancelled} parcela(s) cancelada(s).`,
      );
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expected = (impact?.client_name ?? "").trim();
  const canDelete = !!expected && typed.trim().toLowerCase() === expected.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(o) => !mut.isPending && onOpenChange(o)}>
      <DialogContent className="bg-surface border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Excluir cliente
          </DialogTitle>
          <DialogDescription>
            Esta ação remove toda a estrutura operacional vinculada. Apenas registros financeiros
            já pagos e propostas aprovadas serão mantidos para histórico.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !impact ? (
          <div className="flex items-center justify-center py-8 text-foreground/60">
            <Loader2 className="size-5 animate-spin mr-2" /> Analisando impacto…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-3 space-y-1.5 text-sm">
              <Row label="Cliente" value={impact.client_name} bold />
              <Row label="Projetos" value={impact.projects} />
              <Row label="Jobs" value={impact.jobs} />
              <Row label="Serviços contratados" value={impact.services} />
              <Row label="Eventos de calendário" value={impact.calendar_events} />
              <Row
                label="Portal do Cliente"
                value={impact.portal_active ? "Ativo" : "Inativo"}
              />
              <Row
                label="Parcelas futuras (serão canceladas)"
                value={impact.future_installments}
                danger
              />
              <Row
                label="Propostas em rascunho (serão excluídas)"
                value={impact.proposals_draft}
                danger
              />
              <Row
                label="Propostas aprovadas (mantidas no histórico)"
                value={impact.proposals_approved}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Digite <span className="font-bold text-destructive">{impact.client_name}</span> para confirmar:
              </Label>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={impact.client_name}
                autoFocus
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2 min-h-[44px]"
            disabled={mut.isPending}
            onClick={() => {
              supabase.from('clients').update({ status: 'inactive' }).eq('id', clientId!)
                .then(() => {
                  qc.invalidateQueries({ queryKey: ["clients"] });
                  toast.success("Cliente inativado com sucesso.");
                  onOpenChange(false);
                });
            }}
          >
            <Ban className="size-4 text-amber-500" />
            Inativar Cliente
          </Button>

          <Button
            onClick={() => mut.mutate()}
            disabled={!canDelete || mut.isPending}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2 min-h-[44px]"
          >
            {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Excluir Tudo
          </Button>
        </DialogFooter>
        <p className="text-[10px] text-center text-foreground/40 pb-4">
          Somente administradores podem realizar a exclusão total.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  bold,
  danger,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-foreground/60">{label}</span>
      <span className={`${bold ? "font-bold" : ""} ${danger ? "text-destructive" : ""}`}>
        {value}
      </span>
    </div>
  );
}

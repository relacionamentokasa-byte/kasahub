import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTransaction } from "@/lib/finance-api";
import { brl } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

const MOTIVO_OPTIONS = [
  { value: "multa", label: "Multa" },
  { value: "juros", label: "Juros" },
  { value: "multa_juros", label: "Multa + Juros" },
  { value: "desconto", label: "Desconto" },
  { value: "reajuste", label: "Reajuste" },
  { value: "outro", label: "Outro" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any | null;
}

export function EditTransactionDialog({ open, onOpenChange, transaction }: Props) {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [valorPrevisto, setValorPrevisto] = useState<string>("");
  const [valorReal, setValorReal] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [obs, setObs] = useState<string>("");

  useEffect(() => {
    if (transaction && open) {
      setDescription(transaction.description || "");
      setValorPrevisto(String(transaction.valor_previsto ?? transaction.amount ?? ""));
      setValorReal(
        transaction.valor_real != null ? String(transaction.valor_real) : ""
      );
      setMotivo(transaction.motivo_diferenca || "");
      setObs(transaction.observacao_diferenca || "");
    }
  }, [transaction, open]);

  const previsto = parseFloat(valorPrevisto.replace(",", ".")) || 0;
  const real = valorReal === "" ? null : parseFloat(valorReal.replace(",", ".")) || 0;
  const diff = real != null ? real - previsto : 0;
  const hasDiff = real != null && Math.abs(diff) > 0.005;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!transaction) return;
      if (hasDiff && !motivo) {
        throw new Error("Selecione o motivo da diferença.");
      }
      const patch: any = {
        description,
        valor_previsto: previsto,
        valor_real: real,
        motivo_diferenca: hasDiff ? motivo : null,
        observacao_diferenca: hasDiff ? obs || null : null,
        // amount segue valor_real quando informado, senão valor_previsto
        amount: real != null ? real : previsto,
      };
      return updateTransaction(transaction.id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      toast.success("Lançamento atualizado.");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar."),
  });

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✏️ Editar Transação</DialogTitle>
          <DialogDescription className="text-xs">
            Vencimento: {new Date(transaction.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>📋 Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>💰 Valor previsto (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={valorPrevisto}
              onChange={(e) => setValorPrevisto(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Valor que você orçou. Pode editar a qualquer momento.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>💵 Valor real do boleto (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Deixe vazio se ainda não recebeu o boleto"
              value={valorReal}
              onChange={(e) => setValorReal(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Valor que veio no boleto/fatura.
            </p>
          </div>

          {hasDiff && (
            <div className="rounded-xl border-2 border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-kasa uppercase tracking-wider text-orange-600">
                  📊 Diferença detectada
                </span>
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    diff > 0 ? "text-orange-600" : "text-emerald-600"
                  )}
                >
                  {diff > 0 ? "+" : ""}
                  {brl(diff)}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Motivo da diferença *</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVO_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observação</Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Multa de 2% por atraso + juros de mora..."
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            💾 Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

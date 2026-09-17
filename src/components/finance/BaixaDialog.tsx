import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
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
import { brlForce as brl } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = ["PIX", "Boleto", "Cartão", "Transferência", "Dinheiro"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any | null;
}

export function BaixaDialog({ open, onOpenChange, transaction }: Props) {
  const qc = useQueryClient();
  const todayLocal = () => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
  };
  const [paidValue, setPaidValue] = useState<string>("");
  const [paidDate, setPaidDate] = useState<string>(todayLocal());
  const [method, setMethod] = useState<string>("PIX");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (transaction && open) {
      const ref =
        transaction.valor_previsto && Number(transaction.valor_previsto) > 0
          ? transaction.valor_previsto
          : (transaction.amount ?? 0);
      setPaidValue(String(ref));
      setPaidDate(todayLocal());
      setMethod(transaction.payment_method || "PIX");
      setNotes(transaction.notes || "");
    }
  }, [transaction, open]);

  const previsto = Number(transaction?.valor_previsto) > 0 ? Number(transaction.valor_previsto) : Number(transaction?.amount ?? 0);
  const real = transaction?.valor_real != null ? Number(transaction.valor_real) : null;
  const pago = parseFloat(paidValue.replace(",", ".")) || 0;
  const diffBoleto = real != null ? real - previsto : 0;
  const diffPago = pago - previsto;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!transaction) return;
      return updateTransaction(transaction.id, {
        status: "paid" as any,
        payment_date: paidDate,
        paid_value: pago,
        valor_real: pago,
        payment_method: method,
        notes: notes || null,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      toast.success("Baixa registrada com sucesso.");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao dar baixa."),
  });

  if (!transaction || !open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <span>Confirmar Liquidação</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
            {transaction.description} • Vencimento{" "}
            <span className="font-mono-kasa tabular-nums">
              {new Date(transaction.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Valor Previsto</span>
              <span className="font-mono-kasa tabular-nums font-semibold text-foreground">{brl(previsto)}</span>
            </div>
            {real != null && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Valor Boleto</span>
                <span className="font-mono-kasa tabular-nums font-semibold text-foreground">
                  {brl(real)}{" "}
                  {Math.abs(diffBoleto) > 0.005 && (
                    <span
                      className={cn(
                        "ml-1 text-[11px]",
                        diffBoleto > 0 ? "text-amber-500" : "text-emerald-500"
                      )}
                    >
                      ({diffBoleto > 0 ? "+" : ""}
                      {brl(diffBoleto)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Valor efetivamente liquidado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={paidValue}
              onChange={(e) => setPaidValue(e.target.value)}
              className="h-10 text-sm font-mono-kasa tabular-nums font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Data do pagamento</Label>
              <Input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Forma de pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Observações / Comprovante</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pago via PIX pelo app..."
              className="text-xs resize-none"
            />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
            <div className="flex justify-between items-center font-bold text-foreground">
              <span>Total a Liquidar</span>
              <span className="font-mono-kasa tabular-nums text-sm text-primary">{brl(pago)}</span>
            </div>
            {Math.abs(diffPago) > 0.005 && (
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-primary/10">
                <span className="text-muted-foreground">Diferença vs Previsto</span>
                <span
                  className={cn(
                    "font-mono-kasa tabular-nums font-semibold",
                    diffPago > 0 ? "text-amber-500" : "text-emerald-500"
                  )}
                >
                  {diffPago > 0 ? "+" : ""}
                  {brl(diffPago)}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs h-9">
            Cancelar
          </Button>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="text-xs h-9 gap-1.5 font-medium">
            {mutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Confirmar Liquidação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

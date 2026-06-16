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
        transaction.valor_real ?? transaction.valor_previsto ?? transaction.amount ?? 0;
      setPaidValue(String(ref));
      setPaidDate(new Date().toISOString().split("T")[0]);
      setMethod(transaction.payment_method || "PIX");
      setNotes(transaction.notes || "");
    }
  }, [transaction, open]);

  if (!transaction) {
    return null;
  }

  const previsto = Number(transaction.valor_previsto ?? transaction.amount ?? 0);
  const real = transaction.valor_real != null ? Number(transaction.valor_real) : null;
  const pago = parseFloat(paidValue.replace(",", ".")) || 0;
  const diffBoleto = real != null ? real - previsto : 0;
  const diffPago = pago - previsto;

  const mutation = useMutation({
    mutationFn: async () =>
      updateTransaction(transaction.id, {
        status: "paid" as any,
        payment_date: paidDate,
        paid_value: pago,
        amount: pago,
        payment_method: method,
        notes: notes || null,
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      toast.success("Baixa registrada.");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao dar baixa."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>💳 Dar Baixa</DialogTitle>
          <DialogDescription className="text-xs">
            {transaction.description} · Vencimento{" "}
            {new Date(transaction.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Referências */}
          <div className="rounded-xl border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">💰 Previsto</span>
              <span className="font-semibold tabular-nums">{brl(previsto)}</span>
            </div>
            {real != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">💵 Boleto</span>
                <span className="font-semibold tabular-nums">
                  {brl(real)}{" "}
                  {Math.abs(diffBoleto) > 0.005 && (
                    <span
                      className={cn(
                        "ml-1 text-xs",
                        diffBoleto > 0 ? "text-orange-600" : "text-emerald-600"
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

          <div className="space-y-1.5">
            <Label>💲 Valor efetivamente pago (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={paidValue}
              onChange={(e) => setPaidValue(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Edite se pagou valor diferente do boleto (desconto, multa extra etc).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>📆 Data do pagamento</Label>
              <Input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>💳 Forma</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>📝 Observações</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previsto</span>
              <span className="tabular-nums">{brl(previsto)}</span>
            </div>
            {real != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Boleto</span>
                <span className="tabular-nums">{brl(real)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>Pago</span>
              <span className="tabular-nums">{brl(pago)}</span>
            </div>
            {Math.abs(diffPago) > 0.005 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Diferença vs previsto</span>
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    diffPago > 0 ? "text-orange-600" : "text-emerald-600"
                  )}
                >
                  {diffPago > 0 ? "+" : ""}
                  {brl(diffPago)}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            ✅ Confirmar baixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

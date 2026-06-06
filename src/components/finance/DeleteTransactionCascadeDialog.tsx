import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

interface DeleteTransactionCascadeDialogProps {
  transactionId: string | null;
  onClose: () => void;
  onConfirm: (cascade: boolean) => void;
  isPending?: boolean;
}

export function DeleteTransactionCascadeDialog({
  transactionId,
  onClose,
  onConfirm,
  isPending,
}: DeleteTransactionCascadeDialogProps) {
  const [mode, setMode] = useState<"single" | "cascade">("single");

  const { data: tx } = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      const { data } = await supabase.from("transactions").select("*").eq("id", transactionId).single();
      return data;
    },
    enabled: !!transactionId,
  });

  const { data: futureTxs = [] } = useQuery({
    queryKey: ["future_transactions", tx?.contract_id, tx?.due_date],
    queryFn: async () => {
      if (!tx?.contract_id || !tx?.due_date) return [];
      const { data } = await supabase
        .from("transactions")
        .select("due_date, description")
        .eq("contract_id", tx.contract_id)
        .eq("status", "pending")
        .gte("due_date", tx.due_date)
        .order("due_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!tx?.contract_id,
  });

  const isContractLinked = !!tx?.contract_id;
  const hasFuture = futureTxs.length > 1;

  if (!transactionId) return null;

  return (
    <Dialog open={!!transactionId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="size-5 text-rose-500" />
            Excluir Lançamento
          </DialogTitle>
          <DialogDescription>
            {isContractLinked && hasFuture 
              ? "Este lançamento faz parte de um contrato com múltiplas parcelas."
              : "Deseja realmente excluir este lançamento financeiro?"}
          </DialogDescription>
        </DialogHeader>

        {isContractLinked && hasFuture && (
          <div className="py-4 space-y-4">
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as any)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 bg-muted/30 p-3 rounded-lg border border-border">
                <RadioGroupItem value="single" id="single" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="single" className="font-semibold">Excluir apenas este lançamento</Label>
                  <p className="text-xs text-foreground/50">Remove apenas o item selecionado.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">
                <RadioGroupItem value="cascade" id="cascade" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="cascade" className="font-semibold text-rose-400">Excluir este e todos os futuros</Label>
                  <p className="text-xs text-foreground/50">Remove este item e os próximos {futureTxs.length - 1} lançamentos pendentes deste contrato.</p>
                </div>
              </div>
            </RadioGroup>

            <div className="space-y-2 mt-4">
              <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Lançamentos que serão afetados:</p>
              <div className="max-h-32 overflow-y-auto border border-border rounded-md bg-background/50 p-2 space-y-1">
                {futureTxs.map((ftx, i) => (
                  <div key={i} className="text-xs flex justify-between py-1 border-b border-border/40 last:border-0">
                    <span className="text-foreground/70">{ftx.description}</span>
                    <span className="font-medium">{new Date(ftx.due_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-foreground/40 font-medium">Quantidade total: {futureTxs.length}</p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(mode === "cascade")}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

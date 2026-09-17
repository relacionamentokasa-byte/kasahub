import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any | null;
}

// Parses "Aluguel (3/12)" -> { prefix: "Aluguel", current: 3, total: 12 }
function parseInstallment(description: string | null | undefined) {
  if (!description) return null;
  const m = description.match(/^(.*?)[\s]*\((\d+)\/(\d+)\)\s*$/);
  if (!m) return null;
  const total = parseInt(m[3], 10);
  if (!Number.isFinite(total) || total <= 1) return null;
  return { prefix: m[1].trim(), current: parseInt(m[2], 10), total };
}

async function fetchFutureSiblings(tx: any, info: { prefix: string; current: number; total: number }) {
  let q = supabase
    .from("transactions")
    .select("id, description, contract_id, client_id")
    .ilike("description", `${info.prefix} (%/${info.total})`);

  if (tx.contract_id) q = q.eq("contract_id", tx.contract_id);
  else if (tx.client_id) q = q.eq("client_id", tx.client_id);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).filter((row) => {
    const parsed = parseInstallment(row.description);
    return parsed && parsed.total === info.total && parsed.current >= info.current;
  });
}

export function DeleteTransactionDialog({ open, onOpenChange, transaction }: Props) {
  const qc = useQueryClient();
  const info = transaction ? parseInstallment(transaction.description) : null;
  const isParcelado = !!info;
  const [futureCount, setFutureCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !transaction || !info) {
      setFutureCount(null);
      return;
    }
    fetchFutureSiblings(transaction, info)
      .then((rows) => setFutureCount(rows.length))
      .catch(() => setFutureCount(null));
  }, [open, transaction?.id]);

  const deleteMut = useMutation({
    mutationFn: async (mode: "single" | "future") => {
      if (!transaction) return;
      if (mode === "single" || !info) {
        const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
        if (error) throw error;
        return { count: 1 };
      }
      const siblings = await fetchFutureSiblings(transaction, info);
      const ids = siblings.map((s) => s.id);
      if (!ids.includes(transaction.id)) ids.push(transaction.id);
      const { error } = await supabase.from("transactions").delete().in("id", ids);
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      qc.invalidateQueries({ queryKey: ["saude-negocio"] });
      const c = res?.count ?? 1;
      toast.success(c > 1 ? `${c} lançamentos excluídos com sucesso!` : "Lançamento excluído com sucesso!");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao excluir lançamento"),
  });

  if (!transaction) return null;

  if (!isParcelado) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight text-destructive">
              <div className="size-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
                <Trash2 className="size-5" />
              </div>
              <span>Excluir Lançamento</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
              Tem certeza que deseja excluir <strong className="text-foreground">{transaction.description}</strong>? Essa ação é permanente e atualizará o saldo bancário e relatórios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <AlertDialogCancel disabled={deleteMut.isPending} className="h-9 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMut.mutate("single");
              }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 text-xs font-medium gap-1.5"
            >
              {deleteMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="space-y-1">
          <AlertDialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight text-destructive">
            <div className="size-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
              <Trash2 className="size-5" />
            </div>
            <span>Excluir Lançamento Parcelado</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
            Este lançamento faz parte de um parcelamento (Parcela <strong className="font-mono-kasa tabular-nums text-foreground">{info!.current}</strong> de{" "}
            <strong className="font-mono-kasa tabular-nums text-foreground">{info!.total}</strong>). Deseja excluir apenas esta parcela ou todas as parcelas futuras também?
            {futureCount != null && futureCount > 1 && (
              <span className="block mt-2 text-xs font-mono-kasa text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/70">
                ⚠️ {futureCount} parcelas serão removidas caso selecione a opção de exclusão em cascata.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/60">
          <AlertDialogCancel disabled={deleteMut.isPending} className="h-9 text-xs">Cancelar</AlertDialogCancel>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteMut.mutate("single")}
            disabled={deleteMut.isPending}
            className="h-9 text-xs"
          >
            Excluir apenas esta
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMut.mutate("future")}
            disabled={deleteMut.isPending}
            className="h-9 text-xs font-medium gap-1.5"
          >
            {deleteMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Excluir esta e futuras
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

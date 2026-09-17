import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, Landmark, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { brlForce as brl } from "@/lib/utils-format";
import {
  fetchContasBancarias,
  createContaBancaria,
  deleteContaBancaria,
} from "@/lib/contas-bancarias-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContasBancariasManagerDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [saldo, setSaldo] = useState<string>("0");

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ["contas_bancarias"],
    queryFn: fetchContasBancarias,
    enabled: open,
  });

  const addMut = useMutation({
    mutationFn: () =>
      createContaBancaria({
        nome: nome.trim(),
        saldo_inicial: Number(saldo) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      toast.success("Conta bancária cadastrada!");
      setNome("");
      setSaldo("0");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao cadastrar conta."),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteContaBancaria(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      toast.success("Conta excluída.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir conta."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Landmark className="size-5" />
            </div>
            <span>Contas Bancárias</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Cadastre as contas usadas para receber e pagar lançamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,130px,auto] gap-2.5 items-end bg-muted/40 p-3 rounded-xl border border-border/70">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome da conta</label>
              <Input
                placeholder="Ex: Cora, Itaú, Nubank..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Saldo inicial</label>
              <Input
                type="number"
                step="0.01"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
            <Button
              onClick={() => addMut.mutate()}
              disabled={!nome.trim() || addMut.isPending}
              className="gap-1.5 h-9 text-xs font-medium"
            >
              {addMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Adicionar
            </Button>
          </div>

          <div className="border border-border/80 rounded-xl divide-y divide-border/60 max-h-[320px] overflow-y-auto bg-card">
            {isLoading ? (
              <div className="p-6 text-xs text-muted-foreground flex items-center justify-center gap-2 font-mono-kasa">
                <Loader2 className="size-4 animate-spin text-primary" /> Carregando contas...
              </div>
            ) : contas.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-mono-kasa">
                Nenhuma conta cadastrada ainda.
              </div>
            ) : (
              contas.map((c: any) => {
                const saldoVal = Number(c.saldo_atual ?? c.saldo_inicial ?? 0);
                const saldoColor =
                  saldoVal < 0 ? "text-red-500 font-semibold" : saldoVal > 0 ? "text-emerald-500 font-semibold" : "text-muted-foreground";
                return (
                <div key={c.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Landmark className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate text-foreground">{c.nome}</div>
                      <div className="text-[11px] text-muted-foreground font-mono-kasa tabular-nums">
                        Inicial: {brl(Number(c.saldo_inicial))}
                      </div>
                      <div className={`text-xs font-mono-kasa tabular-nums ${saldoColor}`}>
                        Atual: {brl(saldoVal)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg transition-colors"
                    onClick={() => {
                      if (confirm(`Excluir a conta "${c.nome}"?`)) delMut.mutate(c.id);
                    }}
                    disabled={delMut.isPending}
                    title="Excluir conta"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

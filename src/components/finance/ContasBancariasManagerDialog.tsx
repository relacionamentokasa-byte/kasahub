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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-5 text-primary" /> Contas Bancárias
          </DialogTitle>
          <DialogDescription>
            Cadastre as contas usadas para receber e pagar lançamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr,140px,auto] gap-2 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome da conta</label>
              <Input
                placeholder="Ex: Conta Cora, Itaú..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Saldo inicial</label>
              <Input
                type="number"
                step="0.01"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
              />
            </div>
            <Button
              onClick={() => addMut.mutate()}
              disabled={!nome.trim() || addMut.isPending}
              className="gap-2"
            >
              {addMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar
            </Button>
          </div>

          <div className="border border-border rounded-xl divide-y divide-border max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Carregando...
              </div>
            ) : contas.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma conta cadastrada ainda.
              </div>
            ) : (
              contas.map((c: any) => {
                const saldo = Number(c.saldo_atual ?? c.saldo_inicial ?? 0);
                const saldoColor =
                  saldo < 0 ? "text-red-600" : saldo > 0 ? "text-emerald-600" : "text-foreground";
                return (
                <div key={c.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Landmark className="size-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        Saldo inicial: {brl(Number(c.saldo_inicial))}
                      </div>
                      <div className={`text-sm font-semibold ${saldoColor}`}>
                        Saldo atual: {brl(saldo)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Excluir a conta "${c.nome}"?`)) delMut.mutate(c.id);
                    }}
                    disabled={delMut.isPending}
                  >
                    <Trash2 className="size-4 text-destructive" />
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

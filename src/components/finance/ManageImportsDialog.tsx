import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchImportBatches, deleteImportBatch } from "@/lib/finance-api";
import { Trash2, History, Loader2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ManageImportsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["import_batches"],
    queryFn: fetchImportBatches,
    enabled: open,
  });

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: deleteImportBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["import_batches"] });
      toast.success("Lançamentos da planilha excluídos com sucesso!");
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <History className="size-5 text-primary" /> Gerenciar Importações
          </DialogTitle>
          <DialogDescription>
            Visualize e exclua lotes de lançamentos importados via planilha.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6 mt-4">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary/40" />
            </div>
          ) : batches.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
              <History className="size-12 text-foreground/10" />
              <p className="text-sm text-foreground/40 font-medium">Nenhuma importação encontrada.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-4 bg-foreground/[0.02] border border-border rounded-xl hover:bg-foreground/[0.04] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground/80">
                        {batch.sample_description || "Sem descrição"}
                      </div>
                      <div className="text-xs text-foreground/40 flex items-center gap-2">
                        <span>{format(new Date(batch.created_at), "PPP 'às' p", { locale: ptBR })}</span>
                        <span className="text-[10px] font-mono bg-foreground/5 px-1.5 py-0.5 rounded uppercase">
                          ID: {batch.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    {confirmId === batch.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmId(null)}
                          className="text-xs h-8"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMut.mutate(batch.id)}
                          disabled={deleteMut.isPending}
                          className="text-xs h-8 gap-1.5"
                        >
                          {deleteMut.isPending ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                          Confirmar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmId(batch.id)}
                        className="size-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-3">
            <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-500/80 leading-relaxed">
              <strong>Importante:</strong> Ao excluir uma planilha, apenas os lançamentos que ainda não foram marcados como <strong>Pagos</strong> serão removidos. Lançamentos concluídos são mantidos por segurança.
            </p>
          </div>
        </div>

        <DialogFooter className="bg-foreground/5 p-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto rounded-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

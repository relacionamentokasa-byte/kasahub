import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { deleteFutureRecurrenceInstallments } from "@/lib/finance-api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DeleteFutureInstallmentsDialogProps {
  recurrenceId: string | null;
  onClose: () => void;
}

export function DeleteFutureInstallmentsDialog({
  recurrenceId,
  onClose,
}: DeleteFutureInstallmentsDialogProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"open_only" | "from_date" | "all_future">("all_future");
  const [fromDate, setFromDate] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!recurrenceId) throw new Error("Recorrência não identificada");
      return deleteFutureRecurrenceInstallments(recurrenceId, mode, fromDate);
    },
    onSuccess: (result) => {
      toast.success(`${result.count} parcelas removidas com sucesso.`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["recurrences"] });
      onClose();
    },
    onError: (e: Error) => {
      toast.error(`Falha ao remover parcelas: ${e.message}`);
    },
  });

  return (
    <Dialog open={!!recurrenceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Excluir Parcelas Futuras</DialogTitle>
          <DialogDescription>
            Deseja remover as parcelas futuras desta recorrência?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as any)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="open_only" id="open_only" />
              <Label htmlFor="open_only">Excluir apenas parcelas em aberto</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all_future" id="all_future" />
              <Label htmlFor="all_future">Excluir todas as parcelas futuras</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="from_date" id="from_date" />
              <Label htmlFor="from_date">Excluir parcelas a partir de uma data específica</Label>
            </div>
          </RadioGroup>

          {mode === "from_date" && (
            <div className="pt-2">
              <Label htmlFor="fromDate" className="text-xs text-foreground/60">Data inicial</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (mode === "from_date" && !fromDate)}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

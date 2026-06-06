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
import { terminateRecurrence } from "@/lib/finance-api";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface TerminateRecurrenceDialogProps {
  recurrenceId: string | null;
  onClose: () => void;
  title?: string;
  description?: string;
  onConfirm?: (mode: "keep" | "cancel" | "delete") => Promise<any>;
}

export function TerminateRecurrenceDialog({
  recurrenceId,
  onClose,
  title = "Encerrar Recorrência",
  description = "Ao encerrar a recorrência, as cobranças futuras podem ser tratadas de diferentes formas.",
  onConfirm,
}: TerminateRecurrenceDialogProps) {
  const qc = useQueryClient();
  const [cleanupMode, setCleanupMode] = useState<"keep" | "cancel" | "delete">("cancel");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!recurrenceId) throw new Error("Identificador não encontrado");
      if (onConfirm) {
        return onConfirm(cleanupMode);
      }
      return terminateRecurrence(recurrenceId, cleanupMode);
    },
    onSuccess: (result) => {
      const isContract = !!onConfirm;
      toast.success(`${isContract ? "Contrato" : "Recorrência"} encerrada com sucesso.`);
      
      if (result && result.count > 0) {
        toast.info(`${result.count} cobranças futuras foram tratadas.`);
      }
      
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["recurrences"] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      onClose();
    },

    onError: (e: Error) => {
      toast.error(`Falha ao encerrar: ${e.message}`);
    },
  });

  return (
    <Dialog open={!!recurrenceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-warning mb-2">
            <AlertTriangle className="size-5 text-amber-500" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Label className="text-sm font-semibold">O que deseja fazer com as cobranças futuras?</Label>
          <RadioGroup
            value={cleanupMode}
            onValueChange={(v) => setCleanupMode(v as any)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="keep" id="keep" />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="keep">Manter cobranças futuras</Label>
                <p className="text-xs text-foreground/50">Não altera o financeiro atual.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cancel" id="cancel" />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="cancel">Cancelar cobranças futuras</Label>
                <p className="text-xs text-foreground/50">Mantém os lançamentos mas altera o status para Cancelado.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="delete" id="delete" />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="delete">Excluir cobranças futuras</Label>
                <p className="text-xs text-foreground/50">Remove permanentemente todas as parcelas em aberto.</p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Encerrar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

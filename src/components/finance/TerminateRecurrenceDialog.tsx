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
}

export function TerminateRecurrenceDialog({
  recurrenceId,
  onClose,
  title = "Encerrar Recorrência",
  description = "Ao encerrar a recorrência, as cobranças futuras podem ser tratadas de diferentes formas.",
}: TerminateRecurrenceDialogProps) {
  const qc = useQueryClient();
  const [cleanupMode, setCleanupMode] = useState<"keep" | "cancel" | "delete">("cancel");

  const mutation = useMutation({
    mutationFn: () => {
      if (!recurrenceId) throw new Error("Recorrência não identificada");
      return terminateRecurrence(recurrenceId, cleanupMode);
    },
    onSuccess: (result) => {
      toast.success("Recorrência encerrada com sucesso.");
      if (result.count > 0) {
        toast.info(`${result.count} parcelas futuras foram removidas.`);
      }
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["recurrences"] });
      onClose();
    },
    onError: (e: Error) => {
      toast.error(`Falha ao encerrar recorrência: ${e.message}`);
    },
  });

  return (
    <Dialog open={!!recurrenceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-warning mb-2">
            <AlertTriangle className="size-5" />
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
            variant="warning"
            className="bg-warning text-warning-foreground hover:bg-warning/90"
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

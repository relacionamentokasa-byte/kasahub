import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { LOSS_REASONS } from "@/lib/crm-api";
import { AlertTriangle, Loader2 } from "lucide-react";

interface LostLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function LostLeadDialog({
  open,
  onOpenChange,
  leadName,
  onConfirm,
  isLoading,
}: LostLeadDialogProps) {
  const [reasonCategory, setReasonCategory] = useState<string>(LOSS_REASONS[0]);
  const [details, setDetails] = useState("");

  function handleSave() {
    const fullReason = details.trim()
      ? `${reasonCategory}: ${details.trim()}`
      : reasonCategory;
    onConfirm(fullReason);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight text-destructive">
            <div className="size-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <span>Marcar Oportunidade como Perdida</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Informe o motivo de perda de <strong className="text-foreground">{leadName}</strong> para alimentar as métricas do funil de vendas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Motivo Principal *
            </Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Detalhes / Aprendizado (opcional)
            </Label>
            <Textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: Cliente optou por concorrente com prazo menor ou corte de orçamento..."
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="h-9 text-xs font-medium gap-1.5"
          >
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <AlertTriangle className="size-3.5" />}
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

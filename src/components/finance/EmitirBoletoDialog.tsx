import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, FileText, Copy, ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { brlForce as brl } from "@/lib/utils-format";
import { emitirBoletoInter } from "@/lib/inter/boletos.functions";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  transaction: any | null;
}

export function EmitirBoletoDialog({ open, onOpenChange, transaction }: Props) {
  const qc = useQueryClient();
  const emitir = useServerFn(emitirBoletoInter);
  const [mensagem, setMensagem] = useState("");
  const [result, setResult] = useState<{ pdfUrl: string | null; boleto: any } | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      emitir({ data: { transactionId: transaction.id, mensagem: mensagem || undefined } }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["boletos_inter"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Boleto emitido!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao emitir boleto"),
  });

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  }

  function close(o: boolean) {
    if (!o) {
      setResult(null);
      setMensagem("");
    }
    onOpenChange(o);
  }

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="size-5" />
            </div>
            <span>Emitir Boleto · Banco Inter</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {transaction.description} • <span className="font-mono-kasa tabular-nums font-semibold text-foreground">{brl(Number(transaction.amount))}</span> • vence{" "}
            <span className="font-mono-kasa tabular-nums font-semibold text-foreground">
              {new Date(transaction.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
            </span>
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Instruções / Mensagem (opcional, impresso no boleto)</Label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                placeholder="Ex: Não receber após o vencimento. Cobrar juros de 1% ao mês após o vencimento..."
                maxLength={78}
                className="text-xs resize-none"
              />
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
              Será emitido um boleto híbrido com <strong className="text-foreground">QR Code PIX instantâneo</strong> e código de barras tradicional. A conciliação e baixa são processadas automaticamente.
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {result.boleto.linha_digitavel && (
              <Field label="Linha digitável" value={result.boleto.linha_digitavel} onCopy={copy} />
            )}
            {result.boleto.pix_copia_cola && (
              <Field label="PIX copia-e-cola" value={result.boleto.pix_copia_cola} onCopy={copy} />
            )}
            {result.pdfUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 h-9 text-xs font-medium"
                onClick={() => window.open(result.pdfUrl!, "_blank")}
              >
                <ExternalLink className="size-3.5" /> Visualizar PDF do Boleto
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          {!result ? (
            <>
              <Button variant="outline" size="sm" onClick={() => close(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-1.5 h-9 text-xs font-medium">
                {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
                Emitir Boleto
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => close(false)} className="h-9 text-xs">
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string, l: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-mono-kasa uppercase text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/70">
        <code className="text-xs font-mono-kasa tabular-nums flex-1 truncate">{value}</code>
        <Button size="icon" variant="ghost" className="size-7 rounded-lg" onClick={() => onCopy(value, label)}>
          <Copy className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

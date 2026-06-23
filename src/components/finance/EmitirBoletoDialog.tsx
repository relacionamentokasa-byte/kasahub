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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" /> Emitir boleto · Banco Inter
          </DialogTitle>
          <DialogDescription>
            {transaction.description} · {brl(Number(transaction.amount))} · vence{" "}
            {transaction.due_date}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Mensagem (opcional, aparece no boleto)</Label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                placeholder="Ex: Não receber após o vencimento."
                maxLength={78}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Será gerado um boleto híbrido (Boleto + PIX) com vencimento em{" "}
              <strong>{transaction.due_date}</strong>. A baixa é automática via webhook.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {result.boleto.linha_digitavel && (
              <Field label="Linha digitável" value={result.boleto.linha_digitavel} onCopy={copy} />
            )}
            {result.boleto.pix_copia_cola && (
              <Field label="PIX copia-e-cola" value={result.boleto.pix_copia_cola} onCopy={copy} />
            )}
            {result.pdfUrl && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open(result.pdfUrl!, "_blank")}
              >
                <ExternalLink className="size-4" /> Abrir PDF do boleto
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
              <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-2">
                {mut.isPending && <Loader2 className="size-4 animate-spin" />} Emitir boleto
              </Button>
            </>
          ) : (
            <Button onClick={() => close(false)}>Fechar</Button>
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
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
        <code className="text-xs flex-1 truncate">{value}</code>
        <Button size="icon" variant="ghost" onClick={() => onCopy(value, label)}>
          <Copy className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

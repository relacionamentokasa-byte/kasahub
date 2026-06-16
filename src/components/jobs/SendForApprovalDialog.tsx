import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Send, ImageIcon, Film, FileText, Type } from "lucide-react";
import { toast } from "sonner";
import { createApprovalItem, type ApprovalContentType } from "@/lib/approval-items-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  jobId?: string | null;
  projectId?: string | null;
  defaultTitle?: string;
  defaultUrl?: string;
  defaultType?: ApprovalContentType;
  defaultFileName?: string;
}

const TYPE_OPTIONS: { value: ApprovalContentType; label: string; icon: typeof ImageIcon }[] = [
  { value: "image", label: "Imagem", icon: ImageIcon },
  { value: "video", label: "Vídeo", icon: Film },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "text", label: "Texto", icon: Type },
];

function detectType(url: string, fileName?: string): ApprovalContentType {
  const target = (fileName || url || "").toLowerCase();
  if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(target)) return "image";
  if (/\.(mp4|mov|webm|m4v)$/i.test(target)) return "video";
  if (/\.pdf$/i.test(target)) return "pdf";
  return "image";
}

export function SendForApprovalDialog({
  open,
  onOpenChange,
  clientId,
  jobId,
  projectId,
  defaultTitle = "",
  defaultUrl = "",
  defaultType,
  defaultFileName,
}: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState(defaultUrl);
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [contentType, setContentType] = useState<ApprovalContentType>(
    defaultType ?? detectType(defaultUrl, defaultFileName),
  );

  const CAPTION_LIMIT = 2200;
  const captionOverLimit = caption.length > CAPTION_LIMIT;
  const showCaption = contentType === "image" || contentType === "video";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("O título é obrigatório.");
      if (contentType === "text" && !text.trim()) throw new Error("Escreva o texto a ser aprovado.");
      if (contentType !== "text" && !url.trim()) throw new Error("Informe a URL do arquivo.");
      if (showCaption && captionOverLimit) throw new Error(`Legenda excede ${CAPTION_LIMIT} caracteres.`);
      return createApprovalItem({
        client_id: clientId,
        job_id: jobId ?? null,
        project_id: projectId ?? null,
        title: title.trim(),
        description: description.trim() || null,
        content_type: contentType,
        content_url: contentType === "text" ? null : url.trim(),
        content_text: contentType === "text" ? text.trim() : null,
        caption: showCaption && caption.trim() ? caption : null,
      });
    },
    onSuccess: () => {
      toast.success("📤 Enviado para aprovação do cliente!");
      qc.invalidateQueries({ queryKey: ["approval-items"] });
      onOpenChange(false);
      setTitle(defaultTitle);
      setDescription("");
      setUrl(defaultUrl);
      setText("");
      setCaption("");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao enviar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-4 text-primary" />
            Enviar para Aprovação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Arte Instagram - Campanha Junina"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider">Tipo</Label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setContentType(value)}
                  className={`rounded-lg border-2 px-2 py-2.5 flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
                    contentType === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/60 hover:border-primary/30"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {contentType === "text" ? (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider">Texto a aprovar *</Label>
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cole aqui o roteiro, legenda ou texto..."
                className="mt-1.5"
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider">URL do arquivo *</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5"
              />
              {defaultFileName && (
                <p className="text-[11px] text-foreground/50 mt-1">📎 {defaultFileName}</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider">Observação (opcional)</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Última versão com ajustes de cor..."
              className="mt-1.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
              <Send className="size-4" />
              {mutation.isPending ? "Enviando..." : "Enviar para Aprovação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

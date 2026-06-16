import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Send,
  ImageIcon,
  Film,
  FileText,
  Type,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  Square,
  Images,
  Smartphone,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createApprovalItem,
  type ApprovalContentType,
  type ApprovalFormat,
  type ApprovalSlide,
} from "@/lib/approval-items-api";
import { supabase } from "@/integrations/supabase/client";

export interface AttachmentOption {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string | null;
}

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
  /** Existing job attachments — used to pick slides for carrossel/story without re-uploading. */
  attachments?: AttachmentOption[];
}

const TYPE_OPTIONS: { value: ApprovalContentType; label: string; icon: typeof ImageIcon }[] = [
  { value: "image", label: "Imagem", icon: ImageIcon },
  { value: "video", label: "Vídeo", icon: Film },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "text", label: "Texto", icon: Type },
];

const FORMAT_OPTIONS: { value: ApprovalFormat; label: string; icon: typeof Square; hint: string }[] = [
  { value: "single", label: "Único", icon: Square, hint: "1 arte/vídeo" },
  { value: "carousel", label: "Carrossel", icon: Images, hint: "até 10 slides" },
  { value: "story", label: "Story", icon: Smartphone, hint: "vertical 9:16" },
];

function detectType(url: string, fileName?: string): ApprovalContentType {
  const target = (fileName || url || "").toLowerCase();
  if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(target)) return "image";
  if (/\.(mp4|mov|webm|m4v)$/i.test(target)) return "video";
  if (/\.pdf$/i.test(target)) return "pdf";
  return "image";
}

function slideKindFromMime(mime: string): "image" | "video" {
  return mime.startsWith("video") ? "video" : "image";
}

async function uploadOneToBucket(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("public-assets")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw upErr;
  const { data, error: signErr } = await supabase.storage
    .from("public-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr) throw signErr;
  return data.signedUrl;
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
  attachments = [],
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
  const [format, setFormat] = useState<ApprovalFormat>("single");
  const [slides, setSlides] = useState<ApprovalSlide[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const CAPTION_LIMIT = 2200;
  const MAX_SLIDES = 10;
  const captionOverLimit = caption.length > CAPTION_LIMIT;
  const isMulti = format !== "single";
  const showCaption = contentType === "image" || contentType === "video";

  // Stories typically don't fit PDF/text well
  function changeFormat(next: ApprovalFormat) {
    setFormat(next);
    if (next !== "single") {
      // force media type
      if (contentType === "text" || contentType === "pdf") setContentType("image");
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_SLIDES - slides.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_SLIDES} slides.`);
      return;
    }
    const files = Array.from(fileList).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: ApprovalSlide[] = [];
      for (const f of files) {
        if (f.size > 30 * 1024 * 1024) {
          toast.error(`${f.name}: máximo 30MB`);
          continue;
        }
        const signedUrl = await uploadOneToBucket(f, `approvals/${clientId}`);
        uploaded.push({
          id: crypto.randomUUID(),
          url: signedUrl,
          mime_type: f.type,
          kind: slideKindFromMime(f.type),
        });
      }
      setSlides((s) => [...s, ...uploaded]);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    setSlides((s) => {
      const next = [...s];
      const tgt = idx + dir;
      if (tgt < 0 || tgt >= next.length) return s;
      [next[idx], next[tgt]] = [next[tgt], next[idx]];
      return next;
    });
  }
  function removeSlide(idx: number) {
    setSlides((s) => s.filter((_, i) => i !== idx));
  }

  function attachmentKind(a: AttachmentOption): "image" | "video" {
    const t = (a.file_type || a.file_name || "").toLowerCase();
    if (t.startsWith("video") || /\.(mp4|mov|webm|m4v)$/i.test(t)) return "video";
    return "image";
  }
  function isAttachmentMedia(a: AttachmentOption) {
    const t = (a.file_type || a.file_name || "").toLowerCase();
    return (
      t.startsWith("image") ||
      t.startsWith("video") ||
      /\.(png|jpe?g|webp|gif|avif|svg|mp4|mov|webm|m4v)$/i.test(t)
    );
  }
  function toggleAttachmentSlide(a: AttachmentOption) {
    setSlides((curr) => {
      const existing = curr.findIndex((s) => s.url === a.file_url);
      if (existing >= 0) return curr.filter((_, i) => i !== existing);
      if (curr.length >= MAX_SLIDES) {
        toast.error(`Máximo de ${MAX_SLIDES} slides.`);
        return curr;
      }
      const kind = attachmentKind(a);
      return [
        ...curr,
        {
          id: crypto.randomUUID(),
          url: a.file_url,
          mime_type: a.file_type || (kind === "video" ? "video/mp4" : "image/jpeg"),
          kind,
        },
      ];
    });
  }

  const mediaAttachments = attachments.filter(isAttachmentMedia);


  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("O título é obrigatório.");
      if (isMulti) {
        if (slides.length < 2) throw new Error("Adicione pelo menos 2 slides.");
      } else {
        if (contentType === "text" && !text.trim()) throw new Error("Escreva o texto a ser aprovado.");
        if (contentType !== "text" && !url.trim()) throw new Error("Informe a URL do arquivo.");
      }
      if (showCaption && captionOverLimit) throw new Error(`Legenda excede ${CAPTION_LIMIT} caracteres.`);
      // First slide URL becomes the thumbnail / preview fallback
      const firstSlide = slides[0];
      return createApprovalItem({
        client_id: clientId,
        job_id: jobId ?? null,
        project_id: projectId ?? null,
        title: title.trim(),
        description: description.trim() || null,
        content_type: contentType,
        content_url: isMulti ? firstSlide?.url ?? null : contentType === "text" ? null : url.trim(),
        content_text: !isMulti && contentType === "text" ? text.trim() : null,
        caption: showCaption && caption.trim() ? caption : null,
        format,
        slides: isMulti ? slides : [],
        thumbnail_url: isMulti ? firstSlide?.thumbnail_url ?? firstSlide?.url ?? null : null,
      });
    },
    onSuccess: () => {
      toast.success("📤 Enviado para aprovação do cliente!");
      qc.invalidateQueries({ queryKey: ["approval-items"] });
      qc.invalidateQueries({ queryKey: ["minha-kasa"] });
      onOpenChange(false);
      setTitle(defaultTitle);
      setDescription("");
      setUrl(defaultUrl);
      setText("");
      setCaption("");
      setSlides([]);
      setFormat("single");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao enviar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* FORMATO */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider">Formato</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map(({ value, label, icon: Icon, hint }) => {
                const active = format === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeFormat(value)}
                    className={`rounded-lg border-2 px-2 py-3 flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground/60 hover:border-primary/30"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                    <span className="text-[9px] font-normal opacity-70">{hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!isMulti && (
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
          )}

          {isMulti ? (
            // MULTI-SLIDE UPLOADER
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider">
                  {format === "story" ? "Slides do story" : "Slides do carrossel"} *
                </Label>
                <span className="text-[10px] font-mono text-foreground/40">
                  {slides.length} / {MAX_SLIDES}
                </span>
              </div>

              {slides.length > 0 && (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {slides.map((s, i) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5"
                    >
                      <div className="size-12 rounded-md overflow-hidden bg-muted shrink-0 grid place-items-center">
                        {s.kind === "video" ? (
                          <Film className="size-5 text-foreground/40" />
                        ) : (
                          <img src={s.url} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-[11px]">
                        <p className="font-bold">Slide {i + 1}</p>
                        <p className="text-foreground/50 truncate">{s.kind}</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={i === 0}
                          onClick={() => moveSlide(i, -1)}
                        >
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={i === slides.length - 1}
                          onClick={() => moveSlide(i, 1)}
                        >
                          <ArrowDown className="size-3" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => removeSlide(i)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || slides.length >= MAX_SLIDES}
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploading ? "Enviando..." : "Adicionar slides"}
              </Button>
              <p className="text-[10px] text-foreground/50">
                {format === "story"
                  ? "📱 Story: ideal vertical 9:16. Cliente verá com auto-advance e aprovará slide a slide."
                  : "🎠 Carrossel: ideal quadrado 1:1. Cliente desliza e aprova/ajusta cada slide."}
              </p>
            </div>
          ) : contentType === "text" ? (
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

          {showCaption && (
            <div>
              <div className="flex items-baseline justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider">📝 Legenda do post (opcional)</Label>
                <span className={`text-[10px] font-mono ${captionOverLimit ? "text-destructive" : "text-foreground/40"}`}>
                  {caption.length} / {CAPTION_LIMIT}
                </span>
              </div>
              <Textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={"Texto que vai junto com a arte na publicação.\n\nHashtags, @menções, emojis — tudo aqui."}
                className="mt-1.5 font-mono text-[13px]"
              />
              <p className="text-[10px] text-foreground/50 mt-1">
                O cliente vê a legenda junto da arte e aprova/ajusta os dois como um post.
              </p>
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
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || uploading} className="gap-2">
              <Send className="size-4" />
              {mutation.isPending ? "Enviando..." : "Enviar para Aprovação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

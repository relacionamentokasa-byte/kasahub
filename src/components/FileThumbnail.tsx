import { useEffect, useRef, useState } from "react";
import { FileText, FileSpreadsheet, FileType, FileArchive, FileVideo, FileAudio, File as FileIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FileKind = "image" | "pdf" | "word" | "excel" | "powerpoint" | "design" | "video" | "audio" | "archive" | "other";

export function getFileKind(fileName: string, fileType?: string | null): FileKind {
  const n = fileName.toLowerCase();
  const t = (fileType || "").toLowerCase();
  if (/\.(jpe?g|png|webp|gif|svg|avif|bmp)$/i.test(n) || t.startsWith("image/")) return "image";
  if (/\.pdf$/i.test(n) || t === "application/pdf") return "pdf";
  if (/\.(docx?|odt|rtf)$/i.test(n) || t.includes("word") || t.includes("officedocument.wordprocessing")) return "word";
  if (/\.(xlsx?|ods|csv)$/i.test(n) || t.includes("sheet") || t.includes("excel") || t === "text/csv") return "excel";
  if (/\.(pptx?|odp)$/i.test(n) || t.includes("presentation") || t.includes("powerpoint")) return "powerpoint";
  if (/\.(psd|psb|ai|eps|fig|sketch|xd)$/i.test(n) || t.includes("photoshop") || t.includes("illustrator")) return "design";
  if (/\.(mp4|mov|webm|mkv|avi)$/i.test(n) || t.startsWith("video/")) return "video";
  if (/\.(mp3|wav|m4a|ogg|flac)$/i.test(n) || t.startsWith("audio/")) return "audio";
  if (/\.(zip|rar|7z|tar|gz)$/i.test(n)) return "archive";
  return "other";
}

const KIND_META: Record<FileKind, { label: string; bg: string; fg: string; ring: string; Icon: typeof FileText }> = {
  image:      { label: "IMG",  bg: "from-violet-500/15 to-violet-500/5",   fg: "text-violet-500",   ring: "ring-violet-500/30",   Icon: FileType },
  pdf:        { label: "PDF",  bg: "from-rose-500/15 to-rose-500/5",       fg: "text-rose-500",     ring: "ring-rose-500/30",     Icon: FileText },
  word:       { label: "DOC",  bg: "from-sky-500/15 to-sky-500/5",         fg: "text-sky-500",      ring: "ring-sky-500/30",      Icon: FileText },
  excel:      { label: "XLS",  bg: "from-emerald-500/15 to-emerald-500/5", fg: "text-emerald-500",  ring: "ring-emerald-500/30",  Icon: FileSpreadsheet },
  powerpoint: { label: "PPT",  bg: "from-orange-500/15 to-orange-500/5",   fg: "text-orange-500",   ring: "ring-orange-500/30",   Icon: FileText },
  design:     { label: "PSD",  bg: "from-fuchsia-500/15 to-fuchsia-500/5", fg: "text-fuchsia-500",  ring: "ring-fuchsia-500/30",  Icon: FileType },
  video:      { label: "VID",  bg: "from-fuchsia-500/15 to-fuchsia-500/5", fg: "text-fuchsia-500",  ring: "ring-fuchsia-500/30",  Icon: FileVideo },
  audio:      { label: "AUD",  bg: "from-amber-500/15 to-amber-500/5",     fg: "text-amber-500",    ring: "ring-amber-500/30",    Icon: FileAudio },
  archive:    { label: "ZIP",  bg: "from-zinc-500/15 to-zinc-500/5",       fg: "text-zinc-500",     ring: "ring-zinc-500/30",     Icon: FileArchive },
  other:      { label: "FILE", bg: "from-foreground/10 to-foreground/5",   fg: "text-foreground/60",ring: "ring-foreground/20",   Icon: FileIcon },
};

interface Props {
  url: string;
  fileName: string;
  fileType?: string | null;
  className?: string;
  /** square aspect by default; pass e.g. "aspect-[4/3]" to override */
  aspectClass?: string;
}

/**
 * Real thumbnail renderer:
 * - Image → <img>
 * - PDF → renders 1st page via pdfjs into a canvas
 * - Office/other → typed colored card with extension badge
 */
export function FileThumbnail({ url, fileName, fileType, className, aspectClass = "aspect-square" }: Props) {
  const kind = getFileKind(fileName, fileType);
  const meta = KIND_META[kind];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  useEffect(() => {
    if (kind !== "pdf") return;
    if (!url) {
      setPdfState("err");
      return;
    }
    let cancelled = false;
    setPdfState("loading");
    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        // Use the bundled ESM worker as a URL so Vite resolves it
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const doc = await pdfjs.getDocument({ url, withCredentials: false }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const targetW = 480;
        const scale = targetW / viewport.width;
        const v2 = page.getViewport({ scale });
        canvas.width = Math.floor(v2.width);
        canvas.height = Math.floor(v2.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport: v2 }).promise;
        if (!cancelled) setPdfState("ok");
      } catch {
        if (!cancelled) setPdfState("err");
      }
    })();
    return () => { cancelled = true; };
  }, [url, kind]);

  const ext = (fileName.split(".").pop() || meta.label).toUpperCase().slice(0, 4);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-surface ring-1 ring-border", aspectClass, className)}>
      {kind === "image" && (
        <img src={url} alt={fileName} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      )}

      {kind === "pdf" && (
        <>
          <div className={cn("absolute inset-0 bg-gradient-to-br", meta.bg)} />
          <canvas
            ref={canvasRef}
            className={cn(
              "absolute inset-0 w-full h-full object-contain bg-white transition-opacity",
              pdfState === "ok" ? "opacity-100" : "opacity-0",
            )}
          />
          {pdfState === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className={cn("size-5 animate-spin", meta.fg)} />
            </div>
          )}
          {pdfState === "err" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <meta.Icon className={cn("size-8", meta.fg)} />
              <span className={cn("text-[10px] font-black uppercase tracking-wider", meta.fg)}>PDF</span>
            </div>
          )}
          {pdfState !== "ok" && (
            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-background/90 backdrop-blur-sm ring-1 ring-border">
              <span className={meta.fg}>{ext}</span>
            </div>
          )}
        </>
      )}

      {kind !== "image" && kind !== "pdf" && (
        <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br", meta.bg)}>
          <div className={cn("relative flex items-center justify-center rounded-xl bg-background/80 ring-1", meta.ring, "size-12")}>
            <meta.Icon className={cn("size-6", meta.fg)} />
          </div>
          <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-background/80 ring-1", meta.ring, meta.fg)}>
            {ext}
          </div>
        </div>
      )}
    </div>
  );
}

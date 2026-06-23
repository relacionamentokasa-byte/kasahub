import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PdfLoadState =
  | { status: "loading" }
  | { status: "ready"; pdf: any; pageNumbers: number[]; totalPages: number }
  | { status: "error"; message: string };

interface PdfDocumentViewerProps {
  url: string;
  fileName: string;
  className?: string;
  pageClassName?: string;
  maxPages?: number;
  showActions?: boolean;
}

export function PdfDocumentViewer({
  url,
  fileName,
  className,
  pageClassName,
  maxPages = 40,
  showActions = true,
}: PdfDocumentViewerProps) {
  const [state, setState] = useState<PdfLoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let loadedPdf: any = null;
    setState({ status: "loading" });

    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        loadedPdf = await pdfjs.getDocument({
          url,
          withCredentials: false,
          disableStream: false,
          disableAutoFetch: false,
        }).promise;

        if (cancelled) return;
        const totalPages = loadedPdf.numPages || 1;
        const visiblePages = Math.min(totalPages, maxPages);
        setState({
          status: "ready",
          pdf: loadedPdf,
          totalPages,
          pageNumbers: Array.from({ length: visiblePages }, (_, i) => i + 1),
        });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Não foi possível renderizar este PDF.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        loadedPdf?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, [url, maxPages]);

  const download = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col bg-slate-100", className)}>
      {showActions && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5">
          <div className="min-w-0 flex items-center gap-2">
            <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-black text-red-600">PDF</span>
            <span className="truncate text-xs font-bold text-slate-800">{fileName}</span>
            {state.status === "ready" && (
              <span className="hidden shrink-0 text-[10px] font-semibold text-slate-400 sm:inline">
                {state.totalPages} pág.
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-700 hover:text-slate-950">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 size-3.5" /> Abrir
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-700 hover:text-slate-950" onClick={download}>
              <Download className="mr-1 size-3.5" /> Baixar
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        {state.status === "loading" ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="size-7 animate-spin text-slate-400" />
            <p className="text-sm font-semibold">Carregando prévia real do PDF…</p>
          </div>
        ) : state.status === "error" ? (
          <div className="mx-auto flex h-full min-h-[320px] max-w-sm flex-col items-center justify-center gap-4 text-center text-slate-600">
            <AlertCircle className="size-10 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-slate-800">Não consegui mostrar a prévia dentro da tela.</p>
              <p className="mt-1 text-xs text-slate-500">{state.message}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 size-4" /> Abrir em nova aba
                </a>
              </Button>
              <Button size="sm" onClick={download}>
                <Download className="mr-1 size-4" /> Baixar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
            {state.pageNumbers.map((pageNumber) => (
              <PdfCanvasPage
                key={`${url}-${pageNumber}`}
                pdf={state.pdf}
                pageNumber={pageNumber}
                className={pageClassName}
              />
            ))}
            {state.totalPages > state.pageNumbers.length && (
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                Mostrando {state.pageNumbers.length} de {state.totalPages} páginas — baixe para ver o restante.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfCanvasPage({ pdf, pageNumber, className }: { pdf: any; pageNumber: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    (async () => {
      try {
        setFailed(false);
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 980;
        const scale = Math.min(2, Math.max(1, targetWidth / baseViewport.width));
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel?.();
      } catch {
        /* noop */
      }
    };
  }, [pdf, pageNumber]);

  if (failed) {
    return (
      <div className="flex aspect-[3/4] w-full max-w-[980px] items-center justify-center rounded-sm bg-white text-xs font-semibold text-slate-400 shadow-sm ring-1 ring-slate-200">
        Página {pageNumber} indisponível
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-auto w-full max-w-[980px] rounded-sm bg-white shadow-sm ring-1 ring-slate-200", className)}
      aria-label={`Página ${pageNumber}`}
    />
  );
}
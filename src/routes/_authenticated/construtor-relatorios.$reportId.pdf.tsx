import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchReport } from "@/lib/reports-api";
import { fetchClient } from "@/lib/ops-api";
import { SlideView } from "@/components/reports/SlideView";
import type { Slide } from "@/components/reports/types";
import { useFocusMode } from "@/contexts/FocusModeContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/_authenticated/construtor-relatorios/$reportId/pdf")({
  component: ReportPdfPage,
});

function ReportPdfPage() {
  const { reportId } = Route.useParams();
  const reportQ = useQuery({ queryKey: ["report", reportId], queryFn: () => fetchReport(reportId) });
  const clientQ = useQuery({
    queryKey: ["client", reportQ.data?.client_id],
    queryFn: () => fetchClient(reportQ.data!.client_id!),
    enabled: !!reportQ.data?.client_id,
  });

  const { setFocusMode } = useFocusMode();
  useEffect(() => {
    setFocusMode(true);
    return () => setFocusMode(false);
  }, [setFocusMode]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Preparando...");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  const slides = (reportQ.data?.slides as unknown as Slide[]) || [];
  const brandColor = (clientQ.data as any)?.brand_primary || "#3DB6F2";
  const clientLogo = (clientQ.data as any)?.logo_url || null;
  const clientName = clientQ.data?.company || clientQ.data?.name || "";
  const title = reportQ.data?.title || "relatorio";

  useEffect(() => {
    if (!reportQ.data || slides.length === 0 || startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        // wait for fonts + images
        setStatus("Carregando fontes e imagens...");
        await (document as any).fonts?.ready;
        await new Promise((r) => setTimeout(r, 800));

        const container = containerRef.current;
        if (!container) return;
        const slideEls = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-slide]"));

        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080] });

        for (let i = 0; i < slideEls.length; i++) {
          setStatus(`Renderizando slide ${i + 1} de ${slideEls.length}...`);
          setProgress(Math.round(((i) / slideEls.length) * 100));
          const el = slideEls[i];
          const canvas = await html2canvas(el, {
            width: 1920,
            height: 1080,
            windowWidth: 1920,
            windowHeight: 1080,
            scale: 1,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
          });
          const img = canvas.toDataURL("image/jpeg", 0.92);
          if (i > 0) pdf.addPage([1920, 1080], "landscape");
          pdf.addImage(img, "JPEG", 0, 0, 1920, 1080, undefined, "FAST");
        }

        setProgress(100);
        setStatus("Salvando PDF...");
        const safe = title.replace(/[^a-z0-9-_\s]/gi, "").trim().replace(/\s+/g, "-").toLowerCase();
        pdf.save(`${safe || "relatorio"}.pdf`);
        setDone(true);
        setStatus("PDF gerado! Você pode fechar esta aba.");
      } catch (e: any) {
        console.error("[PDF] falha:", e);
        setStatus("Erro ao gerar PDF: " + (e?.message || String(e)));
      }
    };
    run();
  }, [reportQ.data, slides.length, title]);

  if (!reportQ.data) return <div className="p-8 text-white bg-black min-h-screen">Carregando...</div>;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center gap-4">
      <div className="max-w-md w-full px-8 text-center space-y-3">
        <h1 className="font-display text-2xl font-bold">Gerando PDF</h1>
        <p className="text-sm text-white/70">{status}</p>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, background: brandColor }}
          />
        </div>
        {done && (
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90"
          >
            Fechar
          </button>
        )}
      </div>

      {/* Off-screen render area — exactly 1920x1080 per slide, matching Apresentar */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          left: -100000,
          top: 0,
          width: 1920,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            data-pdf-slide
            style={{ width: 1920, height: 1080, background: "#fff", overflow: "hidden" }}
          >
            <SlideView
              slide={s}
              brandColor={brandColor}
              clientLogoUrl={clientLogo}
              clientName={clientName}
              pageNumber={i + 1}
              totalPages={slides.length}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchReport } from "@/lib/reports-api";
import { fetchClient } from "@/lib/ops-api";
import { SlideView } from "@/components/reports/SlideView";
import type { Slide } from "@/components/reports/types";

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

  useEffect(() => {
    if (reportQ.data) {
      // give layout a tick, then open the print dialog
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [reportQ.data]);

  if (!reportQ.data) return <div className="p-8">Carregando…</div>;
  const slides = (reportQ.data.slides as unknown as Slide[]) || [];
  const brandColor = (clientQ.data as any)?.brand_primary || "#3DB6F2";
  const clientLogo = (clientQ.data as any)?.logo_url || null;
  const clientName = clientQ.data?.company || clientQ.data?.name || "";

  return (
    <>
      <style>{`
        @page { size: 1920px 1080px landscape; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .pdf-toolbar { display: none !important; }
        }
        .pdf-slide { width: 1920px; height: 1080px; page-break-after: always; break-after: page; }
        .pdf-slide:last-child { page-break-after: auto; break-after: auto; }
      `}</style>
      <div className="pdf-toolbar fixed top-3 right-3 z-50 bg-black text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
        Use Cmd/Ctrl + P → Salvar como PDF
      </div>
      <div className="bg-neutral-800 p-6 flex flex-col items-center gap-6 print:bg-white print:p-0 print:gap-0">
        {slides.map((s, i) => (
          <div key={s.id} className="pdf-slide bg-white shadow-2xl print:shadow-none">
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
    </>
  );
}

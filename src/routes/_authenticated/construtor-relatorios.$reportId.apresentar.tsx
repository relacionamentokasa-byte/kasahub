import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { fetchReport } from "@/lib/reports-api";
import { fetchClient } from "@/lib/ops-api";
import { ScaledSlide } from "@/components/reports/ScaledSlide";
import type { Slide } from "@/components/reports/types";

export const Route = createFileRoute("/_authenticated/relatorios/construtor/$reportId/apresentar")({
  component: PresentReportPage,
});

function PresentReportPage() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
  const reportQ = useQuery({ queryKey: ["report", reportId], queryFn: () => fetchReport(reportId) });
  const clientQ = useQuery({
    queryKey: ["client", reportQ.data?.client_id],
    queryFn: () => fetchClient(reportQ.data!.client_id!),
    enabled: !!reportQ.data?.client_id,
  });

  const slides = (reportQ.data?.slides as unknown as Slide[]) || [];
  const [idx, setIdx] = useState(0);

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);
  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    navigate({ to: "/relatorios/construtor/$reportId", params: { reportId } });
  }, [navigate, reportId]);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, exit]);

  const cur = slides[idx];
  if (!cur) return <div className="min-h-screen bg-black text-white grid place-items-center">Carregando…</div>;

  const brandColor = (clientQ.data as any)?.brand_primary || "#3DB6F2";
  const clientLogo = (clientQ.data as any)?.logo_url || null;
  const clientName = clientQ.data?.company || clientQ.data?.name || "";

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="flex-1 relative">
        <ScaledSlide
          slide={cur}
          brandColor={brandColor}
          clientLogoUrl={clientLogo}
          clientName={clientName}
          pageNumber={idx + 1}
          totalPages={slides.length}
          background="#000"
        />
      </div>
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
        <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs tabular-nums">
          {idx + 1} / {slides.length}
        </span>
        <button onClick={exit} className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center">
          <X className="size-4" />
        </button>
      </div>
      <div className="absolute inset-y-0 left-0 w-1/4 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition">
        <button onClick={prev} disabled={idx === 0} className="size-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center disabled:opacity-30">
          <ChevronLeft className="size-6" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 w-1/4 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition">
        <button onClick={next} disabled={idx === slides.length - 1} className="size-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center disabled:opacity-30">
          <ChevronRight className="size-6" />
        </button>
      </div>
    </div>
  );
}

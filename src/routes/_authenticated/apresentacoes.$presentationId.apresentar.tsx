import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { z } from "zod";
import {
  fetchPresentation,
  fetchSlides,
  type PresentationSlide,
} from "@/lib/presentations-api";
import { fetchClient } from "@/lib/ops-api";
import { fetchAgencySettings } from "@/lib/settings-api";

const searchSchema = z.object({
  clientId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authenticated/apresentacoes/$presentationId/apresentar",
)({
  validateSearch: (search) => searchSchema.parse(search),
  component: PresentPage,
});

function PresentPage() {
  const { presentationId } = Route.useParams();
  const { clientId } = Route.useSearch();
  const navigate = useNavigate();

  const presQ = useQuery({
    queryKey: ["present-pres", presentationId],
    queryFn: () => fetchPresentation(presentationId),
  });
  const slidesQ = useQuery({
    queryKey: ["present-slides", presentationId],
    queryFn: () => fetchSlides(presentationId),
  });
  const clientQ = useQuery({
    queryKey: ["present-client", clientId],
    queryFn: () => fetchClient(clientId!),
    enabled: !!clientId,
  });
  const agencyQ = useQuery({
    queryKey: ["present-agency"],
    queryFn: () => fetchAgencySettings(),
  });

  const loading =
    presQ.isLoading ||
    slidesQ.isLoading ||
    (!!clientId && clientQ.isLoading) ||
    agencyQ.isLoading;

  const slides = slidesQ.data ?? [];
  const [idx, setIdx] = useState(0);

  const goNext = useCallback(
    () => setIdx((i) => Math.min(slides.length - 1, i + 1)),
    [slides.length],
  );
  const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (clientId) {
      navigate({ to: "/clientes/$clientId", params: { clientId } });
    } else {
      navigate({ to: "/" });
    }
  }, [navigate, clientId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "PageUp" ||
        e.key === "Backspace"
      ) {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        exit();
      } else if (e.key === "Home") {
        setIdx(0);
      } else if (e.key === "End") {
        setIdx(slides.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, exit, slides.length]);

  const client = clientQ.data as any;
  const agency = agencyQ.data;

  const { stage, brand, inkHex, inkRgb } = useMemo(() => {
    const hexLum = (hex: string): number => {
      const m = hex.replace("#", "").match(/.{2}/g);
      if (!m || m.length < 3) return 0;
      const [r, g, b] = m.slice(0, 3).map((h) => parseInt(h, 16) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const hexToRgb = (hex: string): string => {
      const m = hex.replace("#", "").match(/.{2}/g);
      if (!m || m.length < 3) return "255 255 255";
      const [r, g, b] = m.slice(0, 3).map((h) => parseInt(h, 16));
      return `${r} ${g} ${b}`;
    };
    const stage =
      client?.portal_cover_color || agency?.brand_secondary || "#0F0F1A";
    const brand =
      client?.portal_primary_color ||
      client?.brand_primary ||
      agency?.brand_primary ||
      "#FFBC45";
    const inkHex =
      client?.portal_text_color ||
      (hexLum(stage) < 0.5 ? "#FFFFFF" : "#0B0B14");
    return { stage, brand, inkHex, inkRgb: hexToRgb(inkHex) };
  }, [client, agency]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-black text-white grid place-items-center">
        <Loader2 className="size-8 animate-spin opacity-50" />
      </div>
    );
  }

  if (!slides.length) {
    return (
      <div className="fixed inset-0 z-[200] bg-black text-white grid place-items-center">
        <div className="text-center space-y-3">
          <p>Esta apresentação ainda não tem slides.</p>
          <button
            onClick={exit}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const cur = slides[idx];

  return (
    <div
      className="kasa-present fixed inset-0 z-[200] overflow-hidden text-[rgb(var(--ink-rgb))] select-none"
      style={
        {
          backgroundColor: stage,
          ["--brand" as any]: brand,
          ["--brand-soft" as any]: `color-mix(in oklab, ${brand} 18%, transparent)`,
          ["--ink-rgb" as any]: inkRgb,
          fontFamily:
            "'Onest', ui-sans-serif, system-ui, -apple-system, sans-serif",
        } as React.CSSProperties
      }
    >
      <style>{`
        .kasa-present h1,
        .kasa-present h2,
        .kasa-present h3 {
          font-family: 'Funnel Display', 'Onest', ui-sans-serif, system-ui, sans-serif;
          letter-spacing: -0.02em;
        }
      `}</style>

      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--brand) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top chrome */}
      <div className="absolute top-0 inset-x-0 z-30 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {client?.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-9 w-auto object-contain drop-shadow"
            />
          ) : (
            <span className="text-sm font-bold tracking-wide">
              {client?.company || client?.name || presQ.data?.name}
            </span>
          )}
          <span className="h-5 w-px bg-white/20" />
          <span
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: `rgb(var(--ink-rgb) / 0.5)` }}
          >
            {presQ.data?.name || "Apresentação"}
          </span>
        </div>
        <button
          onClick={exit}
          className="size-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition-colors"
          aria-label="Sair"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Slide */}
      <div className="absolute inset-0 grid place-items-center px-10 lg:px-20 pt-24 pb-24">
        <div
          key={idx}
          className="relative w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <SlideView slide={cur} />
        </div>
      </div>

      {/* Click zones */}
      <button
        type="button"
        onClick={goPrev}
        className="absolute left-0 top-20 bottom-20 w-1/5 z-10 group focus:outline-none"
        aria-label="Anterior"
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-6 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/10 grid place-items-center">
          <ChevronLeft className="size-5" />
        </span>
      </button>
      <button
        type="button"
        onClick={goNext}
        className="absolute right-0 top-20 bottom-20 w-1/5 z-10 group focus:outline-none"
        aria-label="Próximo"
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-6 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/10 grid place-items-center">
          <ChevronRight className="size-5" />
        </span>
      </button>

      {/* Bottom chrome */}
      <div className="absolute bottom-0 inset-x-0 z-30 px-8 pb-5 space-y-3">
        <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${((idx + 1) / slides.length) * 100}%`,
              backgroundColor: brand,
            }}
          />
        </div>
        <div
          className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] font-bold"
          style={{ color: `rgb(var(--ink-rgb) / 0.4)` }}
        >
          <div className="flex items-center gap-2">
            {agency?.name && (
              <span style={{ color: `rgb(var(--ink-rgb) / 0.7)` }}>
                {agency.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>← → para navegar · ESC para sair</span>
            <span style={{ color: `rgb(var(--ink-rgb) / 0.7)` }}>
              {String(idx + 1).padStart(2, "0")} /{" "}
              {String(slides.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Slide layouts
// ────────────────────────────────────────────────────────────────

function SlideView({ slide }: { slide: PresentationSlide }) {
  switch (slide.layout) {
    case "cover":
      return <CoverLayout slide={slide} />;
    case "image":
      return <ImageLayout slide={slide} />;
    case "split":
      return <SplitLayout slide={slide} />;
    case "quote":
      return <QuoteLayout slide={slide} />;
    case "closing":
      return <ClosingLayout slide={slide} />;
    case "content":
    default:
      return <ContentLayout slide={slide} />;
  }
}

function Eyebrow({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.28em]"
        style={{ color: "var(--brand)" }}
      >
        {text}
      </span>
    </div>
  );
}

function BodyText({ text }: { text?: string | null }) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).filter(Boolean);
  return (
    <div
      className="text-lg lg:text-xl leading-relaxed space-y-3 max-w-3xl"
      style={{ color: `rgb(var(--ink-rgb) / 0.8)` }}
    >
      {lines.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </div>
  );
}

function Cta({ slide }: { slide: PresentationSlide }) {
  if (!slide.cta_label) return null;
  const Btn = (
    <span
      className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest"
      style={{ backgroundColor: "var(--brand)", color: "#0B0B14" }}
    >
      {slide.cta_label}
      {slide.cta_url && <ExternalLink className="size-4" />}
    </span>
  );
  if (slide.cta_url) {
    return (
      <a href={slide.cta_url} target="_blank" rel="noopener noreferrer">
        {Btn}
      </a>
    );
  }
  return Btn;
}

function CoverLayout({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="text-center space-y-8">
      <Eyebrow text={slide.eyebrow} />
      <h1 className="text-6xl lg:text-8xl font-black tracking-tight leading-[0.95]">
        {slide.title}
      </h1>
      {slide.subtitle && (
        <p
          className="text-xl lg:text-2xl max-w-3xl mx-auto"
          style={{ color: `rgb(var(--ink-rgb) / 0.7)` }}
        >
          {slide.subtitle}
        </p>
      )}
      <div className="flex justify-center pt-4">
        <Cta slide={slide} />
      </div>
    </div>
  );
}

function ContentLayout({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="space-y-6">
      <Eyebrow text={slide.eyebrow} />
      {slide.title && (
        <h2 className="text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
          {slide.title}
        </h2>
      )}
      {slide.subtitle && (
        <p
          className="text-2xl font-medium"
          style={{ color: "var(--brand)" }}
        >
          {slide.subtitle}
        </p>
      )}
      <BodyText text={slide.body} />
      <div className="pt-2">
        <Cta slide={slide} />
      </div>
    </div>
  );
}

function ImageLayout({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="space-y-6">
      <Eyebrow text={slide.eyebrow} />
      {slide.title && (
        <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
          {slide.title}
        </h2>
      )}
      {slide.image_url && (
        <img
          src={slide.image_url}
          alt={slide.title ?? ""}
          className="w-full rounded-2xl border border-white/10 shadow-2xl max-h-[65vh] object-cover"
        />
      )}
      {slide.body && <BodyText text={slide.body} />}
    </div>
  );
}

function SplitLayout({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
      <div className="space-y-5">
        <Eyebrow text={slide.eyebrow} />
        {slide.title && (
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">
            {slide.title}
          </h2>
        )}
        {slide.subtitle && (
          <p className="text-xl font-medium" style={{ color: "var(--brand)" }}>
            {slide.subtitle}
          </p>
        )}
        <BodyText text={slide.body} />
        <Cta slide={slide} />
      </div>
      {slide.image_url ? (
        <img
          src={slide.image_url}
          alt={slide.title ?? ""}
          className="w-full rounded-2xl border border-white/10 shadow-2xl max-h-[70vh] object-cover"
        />
      ) : (
        <div
          className="w-full aspect-[4/5] rounded-2xl border border-white/10"
          style={{ backgroundColor: "var(--brand-soft)" }}
        />
      )}
    </div>
  );
}

function QuoteLayout({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="text-center space-y-8 max-w-4xl mx-auto">
      <div
        className="text-8xl font-black leading-none"
        style={{ color: "var(--brand)" }}
      >
        "
      </div>
      {slide.title && (
        <h2 className="text-4xl lg:text-5xl font-bold leading-[1.15]">
          {slide.title}
        </h2>
      )}
      {slide.subtitle && (
        <p
          className="text-lg uppercase tracking-[0.22em] font-bold"
          style={{ color: `rgb(var(--ink-rgb) / 0.6)` }}
        >
          — {slide.subtitle}
        </p>
      )}
    </div>
  );
}

function ClosingLayout({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="text-center space-y-8">
      <Eyebrow text={slide.eyebrow ?? "Vamos começar?"} />
      <h1 className="text-6xl lg:text-8xl font-black tracking-tight leading-[0.95]">
        <span
          className="text-transparent bg-clip-text"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--brand) 0%, rgb(var(--ink-rgb)) 100%)",
          }}
        >
          {slide.title || "Obrigado!"}
        </span>
      </h1>
      {slide.subtitle && (
        <p
          className="text-xl max-w-3xl mx-auto"
          style={{ color: `rgb(var(--ink-rgb) / 0.7)` }}
        >
          {slide.subtitle}
        </p>
      )}
      <BodyText text={slide.body} />
      <div className="flex justify-center pt-4">
        <Cta slide={slide} />
      </div>
    </div>
  );
}

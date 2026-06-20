import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOnboardingSteps, type OnboardingStep } from "@/lib/onboarding-api";
import { fetchClient } from "@/lib/ops-api";
import { fetchAgencySettings } from "@/lib/settings-api";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Calendar,
  Rocket,
  Sparkles,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/onboarding/$onboardingId/apresentar",
)({
  component: PresentOnboardingPage,
});

// ────────────────────────────────────────────────────────────────
// Data layer
// ────────────────────────────────────────────────────────────────

async function fetchOnboardingById(id: string) {
  const { data, error } = await (supabase as any)
    .from("onboardings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as {
    id: string;
    client_id: string;
    title: string;
    description: string | null;
    status: string;
    start_date: string;
    expected_end_date: string | null;
    progress_percentage: number;
  };
}

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

function PresentOnboardingPage() {
  const { onboardingId } = Route.useParams();
  const navigate = useNavigate();

  const onbQ = useQuery({
    queryKey: ["onb-present", onboardingId],
    queryFn: () => fetchOnboardingById(onboardingId),
  });
  const stepsQ = useQuery({
    queryKey: ["onb-present-steps", onboardingId],
    queryFn: () => fetchOnboardingSteps(onboardingId),
  });
  const clientQ = useQuery({
    queryKey: ["onb-present-client", onbQ.data?.client_id],
    queryFn: () => fetchClient(onbQ.data!.client_id),
    enabled: !!onbQ.data?.client_id,
  });
  const agencyQ = useQuery({
    queryKey: ["onb-present-agency"],
    queryFn: () => fetchAgencySettings(),
  });

  const loading =
    onbQ.isLoading || stepsQ.isLoading || clientQ.isLoading || agencyQ.isLoading;

  const slides = useMemo(() => {
    if (!onbQ.data || !stepsQ.data || !clientQ.data) return [];
    return buildSlides(onbQ.data, stepsQ.data, clientQ.data as any);
  }, [onbQ.data, stepsQ.data, clientQ.data]);

  const [idx, setIdx] = useState(0);

  const goNext = useCallback(
    () => setIdx((i) => Math.min(slides.length - 1, i + 1)),
    [slides.length],
  );
  const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (onbQ.data?.client_id) {
      navigate({
        to: "/clientes/$clientId",
        params: { clientId: onbQ.data.client_id },
      });
    } else {
      navigate({ to: "/" });
    }
  }, [navigate, onbQ.data?.client_id]);

  // Keyboard nav
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

  // Sistema de cores da apresentação:
  //   Primária  → fundo (palco)        — portal_cover_color
  //   Secundária → marca/destaque/CTA  — portal_primary_color
  //   Terciária → tinta do texto       — portal_text_color (auto se vazio)
  const client = clientQ.data as any;
  const agency = agencyQ.data;

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

  // Palco (primária)
  const stage =
    client?.portal_cover_color ||
    agency?.brand_secondary ||
    "#0F0F1A";

  // Marca (secundária) — acentos, CTA, ícones, progresso, glow
  const brand =
    client?.portal_primary_color ||
    client?.brand_primary ||
    agency?.brand_primary ||
    "#FFBC45";

  // Tinta (terciária) — texto. Auto: branco sobre palco escuro, preto sobre claro.
  const inkHex =
    client?.portal_text_color ||
    (hexLum(stage) < 0.5 ? "#FFFFFF" : "#0B0B14");
  const inkRgb = hexToRgb(inkHex);

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
          <p>Onboarding sem etapas.</p>
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
      className="fixed inset-0 z-[200] overflow-hidden text-[rgb(var(--ink-rgb))] select-none"
      style={
        {
          backgroundColor: cover,
          ["--brand" as any]: primary,
          ["--brand-soft" as any]: `color-mix(in oklab, ${primary} 18%, transparent)`,
          ["--brand-glow" as any]: `color-mix(in oklab, ${primary} 35%, transparent)`,
          ["--accent" as any]: secondary,
          ["--accent-soft" as any]: `color-mix(in oklab, ${secondary} 18%, transparent)`,
          ["--ink-rgb" as any]: inkRgb,
          fontFamily:
            "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
        } as React.CSSProperties
      }
    >
      {/* Background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full blur-[140px] opacity-30"
        style={{ backgroundColor: primary }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 size-[600px] rounded-full blur-[140px] opacity-20"
        style={{ backgroundColor: secondary }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
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
              {client?.company || client?.name}
            </span>
          )}
          <span className="h-5 w-px bg-white/20" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--ink-rgb)/0.50)] font-bold">
            Onboarding
          </span>
        </div>
        <button
          onClick={exit}
          className="size-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition-colors"
          aria-label="Sair da apresentação"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Slide content */}
      <div className="absolute inset-0 grid place-items-center px-10 lg:px-20 pt-24 pb-24">
        <div
          key={idx}
          className="relative w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          {cur}
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

      {/* Bottom chrome: progress + counter + KASA branding */}
      <div className="absolute bottom-0 inset-x-0 z-30 px-8 pb-5 space-y-3">
        <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${((idx + 1) / slides.length) * 100}%`,
              backgroundColor: primary,
              boxShadow: `0 0 12px var(--brand-glow)`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] font-bold text-[rgb(var(--ink-rgb)/0.40)]">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            {agency?.logo_white_url || agency?.logo_url ? (
              <img
                src={(agency.logo_white_url || agency.logo_url) as string}
                alt={agency.name}
                className="h-3.5 w-auto object-contain opacity-70"
              />
            ) : (
              <span className="text-[rgb(var(--ink-rgb)/0.70)]">{agency?.name || "KASA"}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>← → para navegar · ESC para sair</span>
            <span className="text-[rgb(var(--ink-rgb)/0.70)]">
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
// Slide builder
// ────────────────────────────────────────────────────────────────

function buildSlides(
  onb: { title: string; start_date: string; expected_end_date: string | null; progress_percentage: number; description: string | null },
  steps: OnboardingStep[],
  client: { name: string; company: string | null; logo_url: string | null; portal_cover_url: string | null },
): React.ReactNode[] {
  const slides: React.ReactNode[] = [];

  // Slide 1 — Cover
  slides.push(<CoverSlide key="cover" onb={onb} client={client} />);

  // Slide 2 — Visão Geral
  slides.push(<OverviewSlide key="overview" onb={onb} steps={steps} />);

  // Slide 3 — Como vamos trabalhar (responsabilidades)
  slides.push(<RolesSlide key="roles" steps={steps} />);

  // Slides 4..N — Etapas em grupos de 4
  const chunkSize = 4;
  const stepChunks: OnboardingStep[][] = [];
  for (let i = 0; i < steps.length; i += chunkSize) {
    stepChunks.push(steps.slice(i, i + chunkSize));
  }
  stepChunks.forEach((chunk, i) => {
    slides.push(
      <StepsSlide
        key={`steps-${i}`}
        chunk={chunk}
        startIdx={i * chunkSize}
        total={steps.length}
      />,
    );
  });

  // Slide N+1 — Próximos prazos importantes
  slides.push(<DeadlinesSlide key="deadlines" steps={steps} onb={onb} />);

  // Slide final — Vamos começar
  slides.push(<ClosingSlide key="close" client={client} onb={onb} />);

  return slides;
}

// ────────────────────────────────────────────────────────────────
// Slides
// ────────────────────────────────────────────────────────────────

function CoverSlide({
  onb,
  client,
}: {
  onb: { title: string; start_date: string; expected_end_date: string | null };
  client: { name: string; company: string | null; logo_url: string | null };
}) {
  const cleanTitle = onb.title.replace(/^Onboarding:\s*/i, "");
  return (
    <div className="text-center space-y-10">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
          <Sparkles className="size-3.5" style={{ color: "var(--brand)" }} />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: "var(--brand)" }}
          >
            Bem-vindo(a) à parceria
          </span>
        </div>
        <h1 className="text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
          Onboarding
          <br />
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--brand) 0%, white 100%)",
            }}
          >
            {cleanTitle}
          </span>
        </h1>
        <p className="text-xl text-[rgb(var(--ink-rgb)/0.60)] font-light pt-2">
          Para{" "}
          <span className="text-[rgb(var(--ink-rgb))] font-semibold">
            {client.company || client.name}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-center gap-8 pt-4">
        <DateBlock
          label="Início"
          value={format(
            new Date(onb.start_date + "T00:00:00"),
            "dd 'de' MMM",
            { locale: ptBR },
          )}
        />
        {onb.expected_end_date && (
          <>
            <span className="text-[rgb(var(--ink-rgb)/0.20)] text-2xl">→</span>
            <DateBlock
              label="Go Live"
              value={format(
                new Date(onb.expected_end_date + "T00:00:00"),
                "dd 'de' MMM",
                { locale: ptBR },
              )}
              highlight
            />
          </>
        )}
      </div>
    </div>
  );
}

function DateBlock({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1"
        style={{ color: highlight ? "var(--brand)" : "rgba(255,255,255,0.4)" }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-bold"
        style={{ color: highlight ? "var(--brand)" : "white" }}
      >
        {value}
      </div>
    </div>
  );
}

function OverviewSlide({
  onb,
  steps,
}: {
  onb: { start_date: string; expected_end_date: string | null; progress_percentage: number };
  steps: OnboardingStep[];
}) {
  const totalDays = onb.expected_end_date
    ? Math.max(
        0,
        differenceInCalendarDays(
          new Date(onb.expected_end_date + "T00:00:00"),
          new Date(onb.start_date + "T00:00:00"),
        ),
      )
    : null;
  const pct = Math.min(100, Math.max(0, onb.progress_percentage));
  const circumference = 2 * Math.PI * 70;
  const dashOffset = circumference - (circumference * pct) / 100;
  const done = steps.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-12">
      <SlideEyebrow>Visão Geral</SlideEyebrow>
      <h2 className="text-5xl font-black tracking-tight">
        O caminho até o Go Live.
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 items-center">
        {/* Donut */}
        <div className="relative grid place-items-center">
          <svg className="size-48 -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-[rgb(var(--ink-rgb)/0.10)]"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="var(--brand)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                filter: "drop-shadow(0 0 10px var(--brand-glow))",
              }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-5xl font-black">{pct}%</div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.22em] mt-1"
              style={{ color: "var(--brand)" }}
            >
              Concluído
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total de etapas" value={String(steps.length)} />
          <StatCard label="Já entregues" value={`${done} / ${steps.length}`} />
          {totalDays !== null && (
            <StatCard label="Duração prevista" value={`${totalDays} dias`} />
          )}
          <StatCard
            label="Início"
            value={format(
              new Date(onb.start_date + "T00:00:00"),
              "dd MMM",
              { locale: ptBR },
            )}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 backdrop-blur-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--ink-rgb)/0.40)] mb-1.5">
        {label}
      </div>
      <div className="text-2xl font-bold text-[rgb(var(--ink-rgb))]">{value}</div>
    </div>
  );
}

function RolesSlide({ steps }: { steps: OnboardingStep[] }) {
  const counts = {
    agency: steps.filter((s) => s.responsible_type === "agency").length,
    client: steps.filter((s) => s.responsible_type === "client").length,
    both: steps.filter((s) => s.responsible_type === "both").length,
  };
  const total = steps.length || 1;

  const roles: Array<{
    key: "agency" | "client" | "both";
    label: string;
    sub: string;
    count: number;
  }> = [
    {
      key: "agency",
      label: "Nosso time",
      sub: "Execução, setup e operação",
      count: counts.agency,
    },
    {
      key: "client",
      label: "Você",
      sub: "Acessos, briefings e aprovações",
      count: counts.client,
    },
    {
      key: "both",
      label: "Juntos",
      sub: "Alinhamentos e definições",
      count: counts.both,
    },
  ];

  return (
    <div className="space-y-12">
      <SlideEyebrow>Como vamos trabalhar</SlideEyebrow>
      <h2 className="text-5xl font-black tracking-tight">
        Cada etapa tem um <span style={{ color: "var(--brand)" }}>dono</span>.
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {roles.map((r) => {
          const pct = Math.round((r.count / total) * 100);
          return (
            <div
              key={r.key}
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 space-y-5"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: "var(--brand)" }}
                  >
                    {r.label}
                  </div>
                  <div className="text-sm text-[rgb(var(--ink-rgb)/0.50)] mt-1">{r.sub}</div>
                </div>
                <div className="text-4xl font-black">{r.count}</div>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: "var(--brand)" }}
                />
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--ink-rgb)/0.40)] font-bold">
                {pct}% das etapas
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepsSlide({
  chunk,
  startIdx,
  total,
}: {
  chunk: OnboardingStep[];
  startIdx: number;
  total: number;
}) {
  const RESP_LABEL: Record<string, string> = {
    agency: "Nós",
    client: "Você",
    both: "Juntos",
  };
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <SlideEyebrow>Etapas</SlideEyebrow>
          <h2 className="text-4xl font-black tracking-tight mt-3">
            {startIdx + 1}–{startIdx + chunk.length}{" "}
            <span className="text-[rgb(var(--ink-rgb)/0.30)] text-2xl font-light">
              de {total}
            </span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chunk.map((step, i) => {
          const num = startIdx + i + 1;
          const isDone = step.status === "done";
          const isProgress = step.status === "in_progress";
          const isBlocked = step.status === "blocked";
          return (
            <div
              key={step.id}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex gap-4 min-h-[180px]"
              style={
                isProgress
                  ? {
                      borderColor: "var(--brand)",
                      backgroundColor: "var(--brand-soft)",
                    }
                  : undefined
              }
            >
              {/* Number / status */}
              <div className="shrink-0">
                {isDone ? (
                  <div
                    className="size-11 rounded-xl grid place-items-center"
                    style={{
                      backgroundColor: "var(--brand)",
                      color: "#0F0F1A",
                    }}
                  >
                    <CheckCircle2 className="size-6" strokeWidth={3} />
                  </div>
                ) : isBlocked ? (
                  <div className="size-11 rounded-xl border-2 border-rose-500/60 grid place-items-center">
                    <AlertCircle className="size-5 text-rose-400" />
                  </div>
                ) : isProgress ? (
                  <div
                    className="relative size-11 rounded-xl border-2 grid place-items-center"
                    style={{ borderColor: "var(--brand)" }}
                  >
                    <Clock
                      className="size-5"
                      style={{ color: "var(--brand)" }}
                    />
                  </div>
                ) : (
                  <div className="size-11 rounded-xl border border-white/10 grid place-items-center text-[rgb(var(--ink-rgb)/0.40)]">
                    <span className="text-sm font-black">
                      {String(num).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {RESP_LABEL[step.responsible_type] || step.responsible_type}
                  </span>
                  {isProgress && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: "var(--brand)",
                        color: "#0F0F1A",
                      }}
                    >
                      Em andamento
                    </span>
                  )}
                </div>
                <h3
                  className={`text-lg font-bold leading-tight ${
                    isDone ? "line-through text-[rgb(var(--ink-rgb)/0.40)]" : "text-[rgb(var(--ink-rgb))]"
                  }`}
                >
                  {step.title}
                </h3>
                {step.description && (
                  <p className="text-sm text-[rgb(var(--ink-rgb)/0.55)] leading-relaxed line-clamp-3">
                    {step.description}
                  </p>
                )}
                {step.due_date && !isDone && (
                  <p
                    className="text-[11px] inline-flex items-center gap-1.5 font-medium pt-1"
                    style={{
                      color: isProgress
                        ? "var(--brand)"
                        : "rgba(255,255,255,0.5)",
                    }}
                  >
                    <Calendar className="size-3" />
                    Prazo:{" "}
                    {format(
                      new Date(step.due_date + "T00:00:00"),
                      "dd 'de' MMM",
                      { locale: ptBR },
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeadlinesSlide({
  steps,
  onb,
}: {
  steps: OnboardingStep[];
  onb: { expected_end_date: string | null };
}) {
  const upcoming = steps
    .filter((s) => s.due_date && s.status !== "done" && s.status !== "skipped")
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <SlideEyebrow>Próximos marcos</SlideEyebrow>
      <h2 className="text-5xl font-black tracking-tight">
        Olho nessas <span style={{ color: "var(--brand)" }}>datas</span>.
      </h2>

      {upcoming.length === 0 ? (
        <p className="text-xl text-[rgb(var(--ink-rgb)/0.60)]">
          Nenhum prazo pendente — estamos em dia! 🎉
        </p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((s) => {
            const d = new Date(s.due_date + "T00:00:00");
            const daysFromNow = differenceInCalendarDays(d, new Date());
            const isOverdue = daysFromNow < 0;
            const RESP_LABEL: Record<string, string> = {
              agency: "Nós",
              client: "Você",
              both: "Juntos",
            };
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-4 flex items-center gap-5"
              >
                <div className="shrink-0 text-center">
                  <div
                    className="text-3xl font-black leading-none"
                    style={{
                      color: isOverdue ? "#fb7185" : "var(--brand)",
                    }}
                  >
                    {format(d, "dd")}
                  </div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.22em] mt-1"
                    style={{
                      color: isOverdue
                        ? "#fb7185"
                        : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {format(d, "MMM", { locale: ptBR })}
                  </div>
                </div>
                <div className="h-12 w-px bg-white/10" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">{s.title}</h3>
                  <p className="text-xs text-[rgb(var(--ink-rgb)/0.50)] mt-0.5">
                    Responsável: {RESP_LABEL[s.responsible_type]} ·{" "}
                    {isOverdue
                      ? `${Math.abs(daysFromNow)} dias atrasado`
                      : daysFromNow === 0
                        ? "vence hoje"
                        : `em ${daysFromNow} dia${daysFromNow > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onb.expected_end_date && (
        <div
          className="rounded-2xl px-6 py-5 flex items-center gap-4"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-soft), transparent)",
            border: "1px solid var(--brand-soft)",
          }}
        >
          <Rocket className="size-5" style={{ color: "var(--brand)" }} />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--ink-rgb)/0.50)]">
              Data prevista para o Go Live
            </div>
            <div
              className="text-2xl font-bold"
              style={{ color: "var(--brand)" }}
            >
              {format(
                new Date(onb.expected_end_date + "T00:00:00"),
                "dd 'de' MMMM 'de' yyyy",
                { locale: ptBR },
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClosingSlide({
  client,
  onb,
}: {
  client: { name: string; company: string | null; logo_url: string | null };
  onb: { title: string };
}) {
  return (
    <div className="text-center space-y-10">
      <SlideEyebrow center>Estamos prontos</SlideEyebrow>
      <h2 className="text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
        Vamos construir
        <br />
        <span style={{ color: "var(--brand)" }}>juntos.</span>
      </h2>
      <p className="text-xl text-[rgb(var(--ink-rgb)/0.60)] max-w-2xl mx-auto">
        Este onboarding é só o começo. A cada etapa concluída, estamos mais
        perto de transformar resultado em rotina para{" "}
        <span className="text-[rgb(var(--ink-rgb))] font-semibold">
          {client.company || client.name}
        </span>
        .
      </p>

      <div className="flex items-center justify-center gap-8 pt-6">
        {client.logo_url && (
          <img
            src={client.logo_url}
            alt={client.name}
            className="h-12 w-auto object-contain"
          />
        )}
        <div className="text-2xl text-[rgb(var(--ink-rgb)/0.30)]">×</div>
        <div className="text-sm font-bold tracking-[0.22em] uppercase text-[rgb(var(--ink-rgb)/0.60)]">
          Sua agência
        </div>
      </div>
    </div>
  );
}

function SlideEyebrow({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 ${center ? "" : ""}`}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: "var(--brand)" }}
      />
      <span
        className="text-[10px] font-bold uppercase tracking-[0.28em]"
        style={{ color: "var(--brand)" }}
      >
        {children}
      </span>
    </div>
  );
}

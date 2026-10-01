import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLeads, fetchStages, formatCurrency } from "@/lib/crm-api";
import { fetchOpenTaskCounts, fetchNextTasksByLead } from "@/lib/lead-tasks-api";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flame,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMMERCIAL_QUOTES = [
  {
    quote: "Negócios não acontecem por acaso: nascem de prospecção constante, follow-up ativo e fechamento.",
    tag: "Novos Contratos",
  },
  {
    quote: "Lead parado há mais de 5 dias esfria rápido. Priorize contatos ativos hoje.",
    tag: "Ritmo de Vendas",
  },
  {
    quote: "A operação entrega os resultados, mas a prospecção diária garante o futuro da agência.",
    tag: "Crescimento",
  },
  {
    quote: "Pipeline em movimento constante é segurança para o fluxo de caixa.",
    tag: "Pipeline Ativo",
  },
  {
    quote: "Proposta enviada precisa de acompanhamento direto para virar contrato assinado.",
    tag: "Follow-up",
  },
];

export function CommercialCommandBanner() {
  const navigate = useNavigate();
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ["crm", "leads"],
    queryFn: fetchLeads,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm", "stages"],
    queryFn: fetchStages,
  });

  // Autoplay quotes every 8 seconds if not hovered
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % COMMERCIAL_QUOTES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const metrics = useMemo(() => {
    const wonStageIds = new Set(stages.filter((s) => s.is_won).map((s) => s.id));
    const lostStageIds = new Set(stages.filter((s) => s.is_lost).map((s) => s.id));

    const activeLeads = leads.filter(
      (l) => !wonStageIds.has(l.stage_id) && !lostStageIds.has(l.stage_id)
    );

    const pipelineValue = activeLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);

    const now = Date.now();
    const stalledLeads = activeLeads.filter((l) => {
      const updated = new Date(l.updated_at || l.created_at).getTime();
      const diffDays = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
      return diffDays >= 5;
    });

    return {
      activeCount: activeLeads.length,
      pipelineValue,
      stalledCount: stalledLeads.length,
    };
  }, [leads, stages]);

  const currentQuote = COMMERCIAL_QUOTES[currentQuoteIndex];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-4 sm:p-5 shadow-sm transition-all"
    >
      {/* Glow highlight effects */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left Side: Dynamic Rotating Quote & Directive */}
        <div className="flex-1 min-w-0 pr-0 lg:pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono-kasa font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
              <TrendingUp className="size-3 text-primary" />
              Radar Comercial
            </span>
            <span className="text-[10px] text-muted-foreground font-mono-kasa">
              • {currentQuote.tag}
            </span>
          </div>

          <div className="min-h-[44px] flex flex-col justify-center">
            <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed transition-all duration-300">
              “{currentQuote.quote}”
            </p>
          </div>

          {/* Carousel indicators & manual controls */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              {COMMERCIAL_QUOTES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuoteIndex(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    idx === currentQuoteIndex
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                  aria-label={`Ir para frase ${idx + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-0.5 text-muted-foreground ml-2">
              <button
                onClick={() =>
                  setCurrentQuoteIndex(
                    (prev) => (prev - 1 + COMMERCIAL_QUOTES.length) % COMMERCIAL_QUOTES.length
                  )
                }
                className="size-5 rounded hover:bg-muted/80 grid place-items-center transition text-foreground/60 hover:text-foreground"
                aria-label="Frase anterior"
              >
                <ChevronLeft className="size-3" />
              </button>
              <button
                onClick={() =>
                  setCurrentQuoteIndex((prev) => (prev + 1) % COMMERCIAL_QUOTES.length)
                }
                className="size-5 rounded hover:bg-muted/80 grid place-items-center transition text-foreground/60 hover:text-foreground"
                aria-label="Próxima frase"
              >
                <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Real-time Funnel Metrics & Quick Action */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
          {/* Active Leads Counter */}
          <button
            type="button"
            onClick={() => navigate({ to: "/crm", search: { status: "all" } as any })}
            className="bg-background/80 hover:bg-background backdrop-blur-xs border border-border/70 hover:border-primary/50 rounded-xl px-3 py-2 flex items-center gap-2.5 min-w-[110px] shadow-2xs transition-all text-left cursor-pointer group/stat"
            title="Ver todas as oportunidades em aberto"
          >
            <div className="size-7 rounded-lg bg-primary/10 text-primary group-hover/stat:bg-primary/20 grid place-items-center shrink-0 transition-colors">
              <Target className="size-4" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Em Aberto</div>
              <div className="text-sm font-bold font-mono-kasa text-foreground">{metrics.activeCount} leads</div>
            </div>
          </button>

          {/* Stalled Leads Alert */}
          <button
            type="button"
            onClick={() => navigate({ to: "/crm", search: { status: "stalled" } as any })}
            className={cn(
              "backdrop-blur-xs border rounded-xl px-3 py-2 flex items-center gap-2.5 min-w-[110px] shadow-2xs transition-all text-left cursor-pointer group/stat",
              metrics.stalledCount > 0
                ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500 text-amber-600 dark:text-amber-400"
                : "bg-background/80 hover:bg-background border-border/70 text-muted-foreground"
            )}
            title="Filtrar oportunidades paradas há mais de 5 dias no CRM"
          >
            <div
              className={cn(
                "size-7 rounded-lg grid place-items-center shrink-0 transition-colors",
                metrics.stalledCount > 0 ? "bg-amber-500/15 group-hover/stat:bg-amber-500/25 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
              )}
            >
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-tight">Parados (+5d)</div>
              <div className="text-sm font-bold font-mono-kasa">{metrics.stalledCount} leads</div>
            </div>
          </button>

          {/* Pipeline Value */}
          <button
            type="button"
            onClick={() => navigate({ to: "/crm", search: { status: "all" } as any })}
            className="bg-background/80 hover:bg-background backdrop-blur-xs border border-border/70 hover:border-emerald-500/50 rounded-xl px-3 py-2 flex items-center gap-2.5 min-w-[130px] shadow-2xs transition-all text-left cursor-pointer group/stat"
            title="Ver o funil completo no CRM"
          >
            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover/stat:bg-emerald-500/20 grid place-items-center shrink-0 transition-colors">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Funil Ativo</div>
              <div className="text-sm font-bold font-mono-kasa text-foreground">{formatCurrency(metrics.pipelineValue)}</div>
            </div>
          </button>

          {/* Direct CTA button to CRM */}
          <Button
            onClick={() => navigate({ to: "/crm" })}
            className="w-full sm:w-auto h-10 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs transition cursor-pointer"
          >
            <span>Acessar CRM</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

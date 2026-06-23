import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchProposal,
  fetchProposalItems,
  formatCurrency,
  type Proposal,
  type ProposalItem,
} from "@/lib/crm-api";
import { ScopeRenderer } from "./ScopeRenderer";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import logoWhite from "@/assets/logo-white.png.asset.json";
import { cn } from "@/lib/utils";

type Slide = {
  id: string;
  kind:
    | "cover"
    | "intro"
    | "scope"
    | "items"
    | "investment"
    | "conditions"
    | "closing";
  title?: string;
};

function buildSlides(p: Proposal | undefined, items: ProposalItem[]): Slide[] {
  if (!p) return [];
  const slides: Slide[] = [{ id: "cover", kind: "cover" }];
  if (p.intro && p.intro.trim()) slides.push({ id: "intro", kind: "intro", title: "Sobre" });
  if (p.scope_text || p.scope) slides.push({ id: "scope", kind: "scope", title: "Escopo" });
  if (items.length) slides.push({ id: "items", kind: "items", title: "Serviços" });
  slides.push({ id: "investment", kind: "investment", title: "Investimento" });
  slides.push({ id: "conditions", kind: "conditions", title: "Condições" });
  slides.push({ id: "closing", kind: "closing" });
  return slides;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  cartao: "Cartão",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
};

export function ProposalPresentation({
  proposalId,
  open,
  onClose,
}: {
  proposalId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: proposal, isLoading: loadingProposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
    enabled: open,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["proposal-items", proposalId],
    queryFn: () => fetchProposalItems(proposalId),
    enabled: open,
  });

  const slides = useMemo(() => buildSlides(proposal, items), [proposal, items]);
  const [idx, setIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset idx when reopening
  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        setIdx(0);
      } else if (e.key === "End") {
        setIdx(slides.length - 1);
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, slides.length, onClose]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!open) return null;

  const slide = slides[idx];
  const loading = loadingProposal || loadingItems;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-[#0c1618] text-white overflow-hidden"
    >
      {/* KASA pattern background */}
      <div className="absolute inset-0 kasa-pattern opacity-[0.04] pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 15% 10%, color-mix(in oklab, #FFBC45 18%, transparent), transparent 55%), radial-gradient(circle at 85% 90%, color-mix(in oklab, #FFBC45 10%, transparent), transparent 50%)",
        }}
      />

      {/* Topbar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 lg:px-10 py-4">
        <div className="flex items-center gap-3">
          <img src={logoWhite.url} alt="KASA" className="h-7 w-auto opacity-90" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono-kasa hidden md:block">
            Apresentação · Proposta
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-white/70 hover:text-white hover:bg-white/10 gap-2"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline text-xs">{isFullscreen ? "Sair tela cheia" : "Tela cheia"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 gap-2"
          >
            <X className="size-4" />
            <span className="hidden sm:inline text-xs">Sair (Esc)</span>
          </Button>
        </div>
      </div>

      {/* Slide */}
      <div className="absolute inset-0 flex items-center justify-center p-10 md:p-20">
        {loading ? (
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 className="size-5 animate-spin" />
            Carregando proposta…
          </div>
        ) : !proposal ? (
          <div className="text-white/60">Proposta não encontrada</div>
        ) : (
          <div key={slide.id} className="w-full max-w-6xl mx-auto animate-reveal">
            <SlideBody slide={slide} proposal={proposal} items={items} />
          </div>
        )}
      </div>

      {/* Nav controls */}
      <div className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-between px-6 lg:px-10 py-5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIdx((i) => Math.max(i - 1, 0))}
          disabled={idx === 0}
          className="text-white/70 hover:text-white hover:bg-white/10 gap-2 disabled:opacity-20"
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-8 bg-[#FFBC45]" : "w-1.5 bg-white/25 hover:bg-white/50",
                )}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono-kasa ml-3">
            {String(idx + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIdx((i) => Math.min(i + 1, slides.length - 1))}
          disabled={idx === slides.length - 1}
          className="text-white/70 hover:text-white hover:bg-white/10 gap-2 disabled:opacity-20"
        >
          Próximo
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-6">
      <span className="size-1.5 rounded-full bg-[#FFBC45]" />
      <span className="text-[10px] uppercase tracking-[0.4em] text-[#FFBC45] font-mono-kasa font-bold">
        {children}
      </span>
    </div>
  );
}

function SlideBody({
  slide,
  proposal,
  items,
}: {
  slide: Slide;
  proposal: Proposal;
  items: ProposalItem[];
}) {
  switch (slide.kind) {
    case "cover":
      return <CoverSlide proposal={proposal} />;
    case "intro":
      return <IntroSlide proposal={proposal} />;
    case "scope":
      return <ScopeSlide proposal={proposal} />;
    case "items":
      return <ItemsSlide items={items} />;
    case "investment":
      return <InvestmentSlide proposal={proposal} />;
    case "conditions":
      return <ConditionsSlide proposal={proposal} />;
    case "closing":
      return <ClosingSlide proposal={proposal} />;
  }
}

function CoverSlide({ proposal }: { proposal: Proposal }) {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="text-center space-y-10">
      <div className="text-[10px] uppercase tracking-[0.5em] text-[#FFBC45] font-mono-kasa">
        Proposta Comercial
      </div>
      <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight">
        {proposal.title}
      </h1>
      <div className="h-px w-24 bg-[#FFBC45] mx-auto" />
      <div className="space-y-2">
        <p className="text-xl md:text-2xl text-white/80 font-light">
          Preparado para
        </p>
        <p className="font-display text-3xl md:text-4xl font-bold text-white">
          {proposal.client_name}
        </p>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-mono-kasa pt-6">
        {date}
      </p>
    </div>
  );
}

function IntroSlide({ proposal }: { proposal: Proposal }) {
  return (
    <div className="max-w-4xl">
      <SectionLabel>Sobre</SectionLabel>
      <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 leading-tight">
        Apresentação
      </h2>
      <p className="text-xl md:text-2xl text-white/85 leading-relaxed whitespace-pre-wrap">
        {proposal.intro}
      </p>
    </div>
  );
}

function ScopeSlide({ proposal }: { proposal: Proposal }) {
  return (
    <div className="max-w-5xl">
      <SectionLabel>O que vamos entregar</SectionLabel>
      <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 leading-tight">
        Escopo do trabalho
      </h2>
      <div className="text-lg md:text-xl text-white/85 leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-3 [&_li]:!text-white/85 [&_strong]:text-white [&_p]:mb-4">
        <ScopeRenderer
          text={(proposal as any).scope_text || proposal.scope}
          className="text-white/85"
        />
      </div>
    </div>
  );
}

function ItemsSlide({ items }: { items: ProposalItem[] }) {
  return (
    <div className="max-w-5xl w-full">
      <SectionLabel>Composição</SectionLabel>
      <h2 className="font-display text-4xl md:text-5xl font-bold mb-10 leading-tight">
        Serviços incluídos
      </h2>
      <div className="space-y-3">
        {items.map((it, i) => {
          const sub = Number(it.quantity) * Number(it.unit_price);
          return (
            <div
              key={it.id}
              className="flex items-center justify-between gap-6 border-b border-white/10 py-4 group"
            >
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <span className="font-mono-kasa text-xs text-[#FFBC45] mt-1 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg md:text-xl font-semibold text-white truncate">
                    {it.title}
                  </p>
                  {it.description && (
                    <p className="text-sm text-white/55 mt-0.5 line-clamp-2">{it.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-lg md:text-xl font-bold tabular-nums text-white">
                  {formatCurrency(sub)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono-kasa">
                  {it.recurrence === "monthly" ? "Mensal" : "Único"}
                  {Number(it.quantity) > 1 ? ` · ${it.quantity}x` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvestmentSlide({ proposal }: { proposal: Proposal }) {
  const monthly = Number(proposal.monthly_investment || 0);
  const oneTime = Number(proposal.one_time_investment || 0);
  const months = Number((proposal as any).recurring_months || 0);
  const totalContract = monthly * months + oneTime;

  return (
    <div className="max-w-5xl w-full">
      <SectionLabel>Investimento</SectionLabel>
      <h2 className="font-display text-4xl md:text-5xl font-bold mb-12 leading-tight">
        O valor desta proposta
      </h2>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {monthly > 0 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono-kasa mb-4">
              Mensalidade
            </p>
            <p className="font-display text-5xl md:text-6xl font-black text-[#FFBC45] tabular-nums leading-none">
              {formatCurrency(monthly)}
            </p>
            <p className="text-sm text-white/50 mt-3">
              por mês{months ? ` · ${months} meses` : ""}
            </p>
          </div>
        )}
        {oneTime > 0 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono-kasa mb-4">
              Pagamento único
            </p>
            <p className="font-display text-5xl md:text-6xl font-black text-white tabular-nums leading-none">
              {formatCurrency(oneTime)}
            </p>
            <p className="text-sm text-white/50 mt-3">setup / implantação</p>
          </div>
        )}
      </div>

      {totalContract > 0 && monthly > 0 && months > 0 && (
        <div className="border-t border-white/10 pt-6 flex items-baseline justify-between">
          <span className="text-sm uppercase tracking-[0.25em] text-white/50 font-mono-kasa">
            Total do contrato
          </span>
          <span className="font-display text-3xl md:text-4xl font-bold tabular-nums">
            {formatCurrency(totalContract)}
          </span>
        </div>
      )}
    </div>
  );
}

function ConditionsSlide({ proposal }: { proposal: Proposal }) {
  const p = proposal as any;
  const items: { label: string; value: string }[] = [];

  if (p.contract_type)
    items.push({ label: "Tipo de contrato", value: String(p.contract_type) });
  if (p.recurring_months)
    items.push({ label: "Vigência", value: `${p.recurring_months} meses` });
  if (p.installments && p.installments > 1)
    items.push({ label: "Parcelas", value: `${p.installments}x` });
  if (p.payment_method)
    items.push({
      label: "Forma de pagamento",
      value: PAYMENT_METHOD_LABELS[p.payment_method] || String(p.payment_method),
    });
  if (p.billing_day)
    items.push({ label: "Dia de cobrança", value: `Dia ${p.billing_day}` });
  if (p.first_due_date)
    items.push({
      label: "Primeiro vencimento",
      value: new Date(p.first_due_date).toLocaleDateString("pt-BR"),
    });
  if (p.service_start_date)
    items.push({
      label: "Início do serviço",
      value: new Date(p.service_start_date).toLocaleDateString("pt-BR"),
    });
  if (p.valid_until)
    items.push({
      label: "Proposta válida até",
      value: new Date(p.valid_until).toLocaleDateString("pt-BR"),
    });

  return (
    <div className="max-w-5xl w-full">
      <SectionLabel>Condições comerciais</SectionLabel>
      <h2 className="font-display text-4xl md:text-5xl font-bold mb-12 leading-tight">
        Como vai funcionar
      </h2>
      <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
        {items.length === 0 ? (
          <p className="text-white/50 col-span-2">Nenhuma condição definida.</p>
        ) : (
          items.map((it) => (
            <div key={it.label} className="border-b border-white/10 pb-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono-kasa mb-2">
                {it.label}
              </p>
              <p className="font-display text-xl md:text-2xl font-semibold text-white">
                {it.value}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ClosingSlide({ proposal }: { proposal: Proposal }) {
  return (
    <div className="text-center space-y-10">
      <SectionLabel>Próximos passos</SectionLabel>
      <h2 className="font-display text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
        Vamos começar?
      </h2>
      <div className="h-px w-24 bg-[#FFBC45] mx-auto" />
      <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed">
        Após o aceite enviamos o contrato para assinatura e iniciamos o
        cronograma combinado com a equipe.
      </p>
      <div className="pt-8 inline-flex flex-col items-center gap-2">
        <img src={logoWhite.url} alt="KASA" className="h-10 w-auto opacity-90" />
        <p className="text-[10px] uppercase tracking-[0.5em] text-white/40 font-mono-kasa">
          Obrigado, {proposal.client_name}
        </p>
      </div>
    </div>
  );
}

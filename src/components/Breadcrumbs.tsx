import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

// Mapeamento estático de segmento → label legível
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  projetos: "Projetos",
  jobs: "Tarefas",
  propostas: "Propostas",
  relatorios: "Financeiro",
  dmes: "DMEs",
  vales: "Vales",
  parceiros: "Parceiros",
  config: "Configurações",
  integracoes: "Integrações",
  calendario: "Calendário",
  chat: "Chat",
  crm: "CRM",
  aprovacoes: "Aprovações",
  distribuicao: "Distribuição",
  ceo: "CEO",
  portal: "Portal do Cliente",
  gestao: "Gestão",
  "construtor-relatorios": "Construtor de Relatórios",
  onboarding: "Onboarding",
  apresentar: "Apresentar",
  pdf: "PDF",
};

// Resolve um ID dinâmico via cache do React Query, sem refetch
function resolveDynamicLabel(qc: ReturnType<typeof useQueryClient>, parentSegment: string, id: string): string {
  const tryKeys: any[][] = [];
  switch (parentSegment) {
    case "clientes":
      tryKeys.push(["client", id]);
      break;
    case "projetos":
      tryKeys.push(["project", id]);
      break;
    case "propostas":
      tryKeys.push(["proposal", id]);
      break;
    case "onboarding":
      tryKeys.push(["onboarding", id]);
      break;
    case "construtor-relatorios":
      tryKeys.push(["report", id], ["report-template", id]);
      break;
  }
  for (const key of tryKeys) {
    const data = qc.getQueryData<any>(key);
    if (data) {
      const label = data.company || data.name || data.title || data.full_name;
      if (label) return String(label);
    }
  }
  // Fallback: id encurtado
  return id.length > 12 ? `${id.slice(0, 6)}…` : id;
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return [];

    const out: { label: string; href: string; isLast: boolean }[] = [];
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      acc += `/${seg}`;
      const isLast = i === parts.length - 1;

      // ID-like segment (UUID, número longo) — resolve com query cache
      const isLikelyId =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) ||
        (/^[a-z0-9-]{12,}$/i.test(seg) && !SEGMENT_LABELS[seg]);

      let label: string;
      if (isLikelyId && i > 0) {
        label = resolveDynamicLabel(qc, parts[i - 1], seg);
      } else {
        label = SEGMENT_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
      }
      out.push({ label, href: acc, isLast });
    }
    return out;
  }, [pathname, qc]);

  // Esconde em telas raiz e dashboard (já é "casa")
  if (crumbs.length === 0) return null;
  if (crumbs.length === 1 && (crumbs[0].href === "/dashboard" || crumbs[0].href === "/")) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 text-xs text-foreground/50 px-6 lg:px-10 h-9 border-b border-border/40 bg-background/60 backdrop-blur-sm overflow-x-auto whitespace-nowrap",
        className,
      )}
    >
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-primary transition-colors shrink-0"
        aria-label="Dashboard"
      >
        <Home className="size-3.5" />
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="size-3 text-foreground/30" />
          {c.isLast ? (
            <span className="font-medium text-foreground/90 truncate max-w-[260px]" title={c.label}>
              {c.label}
            </span>
          ) : (
            <Link
              to={c.href as any}
              className="hover:text-primary transition-colors truncate max-w-[180px]"
              title={c.label}
            >
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

import { TrendingUp, Calendar, CheckSquare, HeartPulse } from "lucide-react";
import { brl } from "@/lib/utils-format";

type Health = { label: string; tone: string; bar: string };

function computeHealth(input: { overdue: number; paidCount: number; pendingCount: number }): Health {
  const { overdue, paidCount, pendingCount } = input;
  if (overdue >= 3) return { label: "Crítica", tone: "text-red-500", bar: "bg-red-500" };
  if (overdue >= 1) return { label: "Atenção", tone: "text-amber-500", bar: "bg-amber-500" };
  if (paidCount >= 1) return { label: "Ótima", tone: "text-emerald-500", bar: "bg-emerald-500" };
  if (pendingCount >= 1) return { label: "Em dia", tone: "text-blue-500", bar: "bg-blue-500" };
  return { label: "Sem dados", tone: "text-foreground/40", bar: "bg-border" };
}

function relativeFrom(iso: string | null | undefined): string {
  if (!iso) return "Sem registro";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "agora";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  const mo = Math.floor(d / 30);
  return `${mo}mo atrás`;
}

export function ClientKpiHeader({
  mrr,
  lastContactAt,
  lastContactSource,
  activeJobsCount,
  overdueIncomeCount,
  paidIncomeCount,
  pendingIncomeCount,
}: {
  mrr: number;
  lastContactAt: string | null;
  lastContactSource?: string | null;
  activeJobsCount: number;
  overdueIncomeCount: number;
  paidIncomeCount: number;
  pendingIncomeCount: number;
}) {
  const health = computeHealth({
    overdue: overdueIncomeCount,
    paidCount: paidIncomeCount,
    pendingCount: pendingIncomeCount,
  });

  const items: { label: string; value: string; sub?: string; icon: any; tone: string; barTone?: string }[] = [
    {
      label: "MRR Ativo",
      value: brl(mrr),
      sub: mrr > 0 ? "Receita recorrente mensal" : "Nenhum contrato ativo",
      icon: TrendingUp,
      tone: mrr > 0 ? "text-emerald-500" : "text-foreground/40",
    },
    {
      label: "Último contato",
      value: relativeFrom(lastContactAt),
      sub: lastContactSource ?? "—",
      icon: Calendar,
      tone: lastContactAt ? "text-blue-500" : "text-foreground/40",
    },
    {
      label: "Jobs ativos",
      value: String(activeJobsCount),
      sub: activeJobsCount > 0 ? "Em execução" : "Nada em andamento",
      icon: CheckSquare,
      tone: activeJobsCount > 0 ? "text-purple-500" : "text-foreground/40",
    },
    {
      label: "Saúde financeira",
      value: health.label,
      sub: overdueIncomeCount > 0
        ? `${overdueIncomeCount} título(s) em atraso`
        : `${paidIncomeCount} pago(s) · ${pendingIncomeCount} pendente(s)`,
      icon: HeartPulse,
      tone: health.tone,
      barTone: health.bar,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
      {items.map((it) => {
        return (
          <div
            key={it.label}
            className="rounded-lg border border-border/60 bg-card p-3.5"
          >
            <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
              {it.label}
            </span>
            <div className="mt-1 font-mono-kasa text-xl font-bold text-foreground tabular-nums">
              {it.value}
            </div>
            {it.sub && (
              <p className="text-[11px] font-mono-kasa text-muted-foreground mt-0.5 truncate">{it.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Trophy, X, MessageCircle } from "lucide-react";
import { formatCurrency, type Lead, type Stage } from "@/lib/crm-api";

export function CrmFunnel({
  stages,
  leads,
  onOpenLead,
}: {
  stages: Stage[];
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
}) {
  const [openStageId, setOpenStageId] = useState<string | null>(null);

  const rows = useMemo(() => {
    // Ignore lost stages in the funnel visual — they are not part of the flow
    const flow = stages.filter((s) => !s.is_lost);
    return flow.map((s) => {
      const items = leads.filter((l) => l.stage_id === s.id);
      const value = items.reduce((acc, l) => acc + Number(l.value), 0);
      return { stage: s, items, value };
    });
  }, [stages, leads]);

  // Compute monotonically non-increasing widths so it always looks like a funnel.
  // Width per row is proportional to the max count seen up to that row divided by
  // the top stage count — this way later stages never get wider than earlier ones.
  const topCount = Math.max(1, rows[0]?.items.length ?? 0);
  const MIN_W = 22; // % — narrowest tip
  const MAX_W = 100; // % — widest top
  let runningMax = rows[0]?.items.length ?? 0;
  const widths = rows.map((r) => {
    runningMax = Math.min(runningMax, Math.max(r.items.length, 0));
    const ratio = topCount > 0 ? runningMax / topCount : 0;
    return MIN_W + ratio * (MAX_W - MIN_W);
  });
  // Ensure strictly non-increasing and add a subtle taper on the last row.
  for (let i = 1; i < widths.length; i++) {
    if (widths[i] > widths[i - 1]) widths[i] = widths[i - 1];
  }
  const bottomWidth = Math.max(MIN_W, (widths[widths.length - 1] ?? MIN_W) - 8);

  const openRow = openStageId ? rows.find((r) => r.stage.id === openStageId) ?? null : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 h-full">
      {/* Funnel */}
      <div className="bg-surface/40 border border-border rounded-2xl p-6 flex flex-col overflow-hidden">
        {rows.length === 0 && (
          <div className="text-center text-sm text-foreground/40 py-16">
            Sem etapas cadastradas.
          </div>
        )}
        {rows.map((row, i) => {
          const next = rows[i + 1];
          const topW = widths[i];
          const bottomW = next ? widths[i + 1] : bottomWidth;
          const conversion =
            next && row.items.length > 0
              ? Math.round((next.items.length / row.items.length) * 100)
              : null;

          return (
            <div key={row.stage.id} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setOpenStageId(row.stage.id)}
                className="w-full group relative"
                aria-label={`Ver leads em ${row.stage.name}`}
              >
                <div className="relative w-full h-20">
                  <svg
                    viewBox="0 0 100 20"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full transition group-hover:opacity-95"
                  >
                    <defs>
                      <linearGradient id={`grad-${row.stage.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={row.stage.color} stopOpacity="1" />
                        <stop offset="100%" stopColor={row.stage.color} stopOpacity="0.75" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`${50 - topW / 2},0 ${50 + topW / 2},0 ${50 + bottomW / 2},20 ${50 - bottomW / 2},20`}
                      fill={`url(#grad-${row.stage.id})`}
                      stroke="rgba(0,0,0,0.15)"
                      strokeWidth={0.2}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
                    <div className="flex items-center gap-2 text-white drop-shadow-md">
                      <span className="font-display font-semibold text-sm">
                        {row.stage.name}
                      </span>
                      {row.stage.is_won && <Trophy className="size-3.5" />}
                    </div>
                    <div className="flex items-center gap-4 text-white drop-shadow-md">
                      <span className="font-display font-bold text-xl leading-none">
                        {row.items.length}
                      </span>
                      <span className="text-[11px] opacity-90">
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
              {conversion !== null && (
                <div className="text-[10px] text-foreground/50 py-1">
                  ↓ {conversion}% de conversão
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Side panel — either summary or leads of selected stage */}
      <aside className="bg-surface/40 border border-border rounded-2xl p-5 flex flex-col min-h-[300px]">
        {openRow ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: openRow.stage.color }}
                />
                <h3 className="font-display font-semibold text-sm">
                  {openRow.stage.name}
                </h3>
                <span className="text-[10px] text-foreground/40">
                  {openRow.items.length}
                </span>
              </div>
              <button
                onClick={() => setOpenStageId(null)}
                className="size-6 grid place-items-center rounded-md hover:bg-surface-elevated text-foreground/50"
                aria-label="Fechar"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <ul className="space-y-2 overflow-y-auto flex-1">
              {openRow.items.map((lead) => (
                <li key={lead.id}>
                  <button
                    onClick={() => onOpenLead(lead)}
                    className="w-full text-left bg-surface-elevated border border-border rounded-lg p-3 hover:border-primary/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {lead.name}
                        </div>
                        {lead.company && (
                          <div className="text-[11px] text-foreground/50 truncate">
                            {lead.company}
                          </div>
                        )}
                      </div>
                      {Number(lead.value) > 0 && (
                        <span className="text-[11px] text-primary shrink-0">
                          {formatCurrency(Number(lead.value))}
                        </span>
                      )}
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-500 mt-2">
                        <MessageCircle className="size-3" /> WhatsApp
                      </div>
                    )}
                  </button>
                </li>
              ))}
              {openRow.items.length === 0 && (
                <p className="text-xs text-foreground/40 text-center py-6">
                  Nenhum lead nesta etapa.
                </p>
              )}
            </ul>
          </>
        ) : (
          <FunnelSummary rows={rows} />
        )}
      </aside>
    </div>
  );
}

function FunnelSummary({
  rows,
}: {
  rows: { stage: Stage; items: Lead[]; value: number }[];
}) {
  const totalLeads = rows.reduce((acc, r) => acc + r.items.length, 0);
  const totalValue = rows.reduce((acc, r) => acc + r.value, 0);
  const avgTicket = totalLeads > 0 ? totalValue / totalLeads : 0;
  const firstStage = rows[0];
  const wonStage = rows.find((r) => r.stage.is_won);
  const overallConv =
    firstStage && firstStage.items.length > 0 && wonStage
      ? Math.round((wonStage.items.length / firstStage.items.length) * 100)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display font-semibold text-sm">Resumo do funil</h3>
      <Metric label="Leads no funil" value={String(totalLeads)} />
      <Metric label="Valor em pipeline" value={formatCurrency(totalValue)} />
      <Metric label="Ticket médio" value={formatCurrency(avgTicket)} />
      {overallConv !== null && (
        <Metric label="Conversão geral" value={`${overallConv}%`} />
      )}
      <p className="text-[10px] text-foreground/40 mt-2">
        Clique em uma faixa do funil para ver os leads dentro dela.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
      <span className="text-[10px] uppercase tracking-wide text-foreground/50">
        {label}
      </span>
      <span className="font-display font-semibold text-base text-foreground">
        {value}
      </span>
    </div>
  );
}

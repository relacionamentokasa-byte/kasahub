import { useMemo, useState } from "react";
import { Trophy, X, MessageCircle, TrendingDown, ArrowDown } from "lucide-react";
import { formatCurrency, type Lead, type Stage } from "@/lib/crm-api";
import { cn } from "@/lib/utils";

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

  // Consider all non-lost stages in sequence
  const flowStages = useMemo(() => stages.filter((s) => !s.is_lost), [stages]);

  const rows = useMemo(() => {
    // Cumulative logic for agency pipeline:
    // Every lead currently at stage index >= i has passed through stage i.
    const stageIndexMap = new Map<string, number>();
    flowStages.forEach((s, idx) => stageIndexMap.set(s.id, idx));

    return flowStages.map((stage, idx) => {
      // Leads currently in this exact stage
      const currentLeads = leads.filter((l) => l.stage_id === stage.id);
      const stageValue = currentLeads.reduce((acc, l) => acc + Number(l.value || 0), 0);

      // Cumulative leads that reached or passed this stage
      const passedLeads = leads.filter((l) => {
        if (!l.stage_id) return false;
        const leadStageIdx = stageIndexMap.get(l.stage_id);
        return leadStageIdx !== undefined && leadStageIdx >= idx;
      });

      return {
        stage,
        currentLeads,
        currentCount: currentLeads.length,
        cumulativeCount: passedLeads.length,
        value: stageValue,
      };
    });
  }, [flowStages, leads]);

  // Overall top of funnel count (cumulative leads at stage 0, or total active if 0)
  const topCount = Math.max(1, rows[0]?.cumulativeCount || leads.filter((l) => !stages.find((s) => s.id === l.stage_id)?.is_lost).length || 1);

  // Progressive width calculation (100% down to minimum 42% for clean typography)
  const widths = useMemo(() => {
    const totalSteps = Math.max(1, rows.length);
    return rows.map((_, idx) => {
      const stepFactor = (totalSteps - 1 - idx) / Math.max(1, totalSteps - 1);
      return 45 + stepFactor * 55; // Scales smoothly from 100% to 45%
    });
  }, [rows]);

  const openRow = openStageId ? rows.find((r) => r.stage.id === openStageId) ?? null : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 h-full items-start">
      {/* Visual Funnel Container */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col items-center shadow-xs">
        {rows.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-20">
            Nenhuma etapa cadastrada no funil.
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col items-center space-y-2">
            {rows.map((row, i) => {
              const next = rows[i + 1];
              const widthPct = widths[i];
              const isSelected = openStageId === row.stage.id;

              // Correct cumulative conversion rate from top of funnel
              const convFromTop = Math.min(100, Math.round((row.cumulativeCount / topCount) * 100));

              // Conversion to next stage
              const nextConv =
                next && row.cumulativeCount > 0
                  ? Math.min(100, Math.round((next.cumulativeCount / row.cumulativeCount) * 100))
                  : null;

              return (
                <div key={row.stage.id} className="w-full flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setOpenStageId(row.stage.id)}
                    style={{ width: `${widthPct}%` }}
                    className={cn(
                      "group relative transition-all duration-200 cursor-pointer rounded-xl p-3.5 sm:p-4 text-left border select-none",
                      isSelected
                        ? "bg-foreground/5 border-foreground/50 shadow-sm ring-1 ring-foreground/20"
                        : "bg-muted/50 dark:bg-muted/30 hover:bg-muted/75 dark:hover:bg-muted/45 border-border hover:border-foreground/20 shadow-2xs"
                    )}
                  >
                    {/* Stage color accent indicator */}
                    <div
                      className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full"
                      style={{ background: row.stage.color || "#888" }}
                    />

                    <div className="flex items-center justify-between gap-3 pl-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-semibold text-xs text-foreground uppercase tracking-wide truncate">
                            {row.stage.name}
                          </span>
                          {row.stage.is_won && <Trophy className="size-3.5 text-primary shrink-0" />}
                        </div>
                        <div className="text-[11px] font-mono-kasa text-muted-foreground mt-0.5">
                          {row.currentCount} {row.currentCount === 1 ? "oportunidade" : "oportunidades"}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono-kasa font-bold text-xs sm:text-sm text-foreground tabular-nums block">
                          {formatCurrency(row.value)}
                        </span>
                        <span className="text-[10px] font-mono-kasa text-muted-foreground block">
                          {convFromTop}% do topo
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Inter-stage conversion indicator */}
                  {nextConv !== null && (
                    <div className="flex items-center gap-1.5 py-1 text-[10px] font-mono-kasa text-muted-foreground select-none">
                      <ArrowDown className="size-3 text-muted-foreground/70" />
                      <span>{nextConv}% de passagem para {next.stage.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side Panel: Leads list or Overall Summary */}
      <aside className="bg-card border border-border rounded-2xl p-5 flex flex-col min-h-[340px] shadow-xs">
        {openRow ? (
          <>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ background: openRow.stage.color }}
                />
                <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-foreground">
                  {openRow.stage.name}
                </h3>
                <span className="text-[11px] font-mono-kasa text-muted-foreground tabular-nums">
                  ({openRow.currentCount})
                </span>
              </div>
              <button
                onClick={() => setOpenStageId(null)}
                className="size-6 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label="Fechar"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <ul className="space-y-2 overflow-y-auto flex-1 max-h-[500px] pr-1">
              {openRow.currentLeads.map((lead) => (
                <li key={lead.id}>
                  <button
                    onClick={() => onOpenLead(lead)}
                    className="w-full text-left bg-muted/20 border border-border/60 rounded-xl p-3 hover:border-foreground/20 hover:bg-muted/40 transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                          {lead.name}
                        </div>
                        {lead.company && lead.company !== lead.name && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {lead.company}
                          </div>
                        )}
                      </div>
                      {Number(lead.value) > 0 && (
                        <span className="font-mono-kasa font-semibold text-xs text-foreground tabular-nums shrink-0">
                          {formatCurrency(Number(lead.value))}
                        </span>
                      )}
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                        <MessageCircle className="size-3" /> WhatsApp
                      </div>
                    )}
                  </button>
                </li>
              ))}
              {openRow.currentLeads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-10">
                  Nenhuma oportunidade nesta etapa no momento.
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
  rows: { stage: Stage; currentCount: number; cumulativeCount: number; value: number }[];
}) {
  const totalActiveLeads = rows.reduce((acc, r) => acc + r.currentCount, 0);
  const totalPipelineValue = rows.reduce((acc, r) => acc + r.value, 0);
  const avgTicket = totalActiveLeads > 0 ? totalPipelineValue / totalActiveLeads : 0;

  const topStage = rows[0];
  const wonStage = rows.find((r) => r.stage.is_won);
  const overallConversion =
    topStage && topStage.cumulativeCount > 0 && wonStage
      ? Math.round((wonStage.cumulativeCount / topStage.cumulativeCount) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="pb-3 border-b border-border/60">
        <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-foreground">
          Visão Geral do Funil
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Desempenho da esteira comercial da agência
        </p>
      </div>

      <div className="space-y-3">
        <Metric label="Oportunidades em aberto" value={String(totalActiveLeads)} />
        <Metric label="Valor total em pipeline" value={formatCurrency(totalPipelineValue)} />
        <Metric label="Ticket médio" value={formatCurrency(avgTicket)} />
        <Metric label="Taxa de conversão final" value={`${overallConversion}%`} />
      </div>

      <p className="text-[11px] text-muted-foreground/80 mt-4 border-t border-border/60 pt-3 leading-relaxed">
        Clique em qualquer etapa do funil para inspecionar os leads correspondentes no painel lateral.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 pb-2">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className="font-mono-kasa font-bold text-xs text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

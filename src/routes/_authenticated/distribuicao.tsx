import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PiggyBank, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  fetchDistributionSummary,
  fetchOpenAdvancesByPartner,
  confirmDistribution,
} from "@/lib/distribution-api";
import { fetchContasBancarias } from "@/lib/contas-bancarias-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardListSkeleton } from "@/components/ui/loading-skeletons";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/distribuicao")({
  head: () => ({ meta: [{ title: "Distribuição aos Sócios — KASA HUB" }] }),
  component: DistribuicaoPage,
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function DistribuicaoPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [contaId, setContaId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Overrides do usuário
  const [proLaboreOverrides, setProLaboreOverrides] = useState<Record<string, string>>({});
  const [skipAdvances, setSkipAdvances] = useState<Record<string, boolean>>({});

  const { data: summary, isLoading } = useQuery({
    queryKey: ["distribution-summary", month],
    queryFn: () => fetchDistributionSummary(month),
  });
  const { data: advancesByPartner = {} } = useQuery({
    queryKey: ["partner-advances-open"],
    queryFn: fetchOpenAdvancesByPartner,
  });
  const { data: contas = [] } = useQuery({
    queryKey: ["contas_bancarias"],
    queryFn: fetchContasBancarias,
  });

  const proLaboreTotal = useMemo(() => {
    if (!summary) return 0;
    return summary.pro_labore_partners.reduce((s, p) => {
      const ov = proLaboreOverrides[p.id];
      const v = ov !== undefined ? Number((ov || "0").replace(",", ".")) : Number(p.pro_labore_amount || 0);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
  }, [summary, proLaboreOverrides]);

  const base = useMemo(() => {
    if (!summary) return 0;
    return Math.max(0, summary.net_result - proLaboreTotal);
  }, [summary, proLaboreTotal]);

  const profitPartners = useMemo(
    () => (summary?.partners || []).filter((p) => p.distribution_type === "profit_share"),
    [summary]
  );

  type Line = {
    partner_id: string; partner_name: string;
    distribution_type: "profit_share" | "pro_labore_only";
    gross: number; advance_ids: string[]; advances_total: number; net: number;
  };

  const lines: Line[] = useMemo(() => {
    const out: Line[] = [];
    for (const p of profitPartners) {
      const gross = (base * Number(p.share_percentage || 0)) / 100;
      const advs = (advancesByPartner[p.id] || []).filter((a) => !skipAdvances[a.id]);
      const advTotal = advs.reduce((s, a) => s + (Number(a.amount) - Number(a.settled_amount || 0)), 0);
      out.push({
        partner_id: p.id,
        partner_name: p.full_name,
        distribution_type: "profit_share",
        gross,
        advance_ids: advs.map((a) => a.id),
        advances_total: advTotal,
        net: Math.max(0, gross - advTotal),
      });
    }
    for (const p of summary?.pro_labore_partners || []) {
      const ov = proLaboreOverrides[p.id];
      const gross = ov !== undefined ? Number((ov || "0").replace(",", ".")) : Number(p.pro_labore_amount || 0);
      const advs = (advancesByPartner[p.id] || []).filter((a) => !skipAdvances[a.id]);
      const advTotal = advs.reduce((s, a) => s + (Number(a.amount) - Number(a.settled_amount || 0)), 0);
      out.push({
        partner_id: p.id,
        partner_name: p.full_name,
        distribution_type: "pro_labore_only",
        gross,
        advance_ids: advs.map((a) => a.id),
        advances_total: advTotal,
        net: Math.max(0, gross - advTotal),
      });
    }
    return out;
  }, [profitPartners, summary, base, advancesByPartner, proLaboreOverrides, skipAdvances]);

  const totalNet = lines.reduce((s, l) => s + l.net, 0);

  const confirmMut = useMutation({
    mutationFn: () => {
      if (!contaId) throw new Error("Selecione a conta de saída.");
      if (!dueDate) throw new Error("Defina a data de pagamento.");
      return confirmDistribution({
        month,
        conta_id: contaId,
        due_date: dueDate,
        partner_lines: lines.map((l) => ({
          partner_id: l.partner_id,
          partner_name: l.partner_name,
          distribution_type: l.distribution_type,
          gross: Number(l.gross.toFixed(2)),
          advance_ids: l.advance_ids,
          advances_total: Number(l.advances_total.toFixed(2)),
        })),
      });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["distribution-summary"] });
      qc.invalidateQueries({ queryKey: ["partner-advances-open"] });
      qc.invalidateQueries({ queryKey: ["partner-advances"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`Distribuição confirmada: ${r.createdTxIds.length} lançamentos · ${r.settledAdvanceIds.length} vales quitados.`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao confirmar"),
  });

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <PiggyBank className="size-7 text-primary" /> Distribuição aos Sócios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Calcula automaticamente a divisão mensal das receitas operacionais entre os sócios, descontando vales em aberto e gerando os lançamentos a pagar.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <Label className="text-xs">Mês de referência</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[170px]" />
        </div>
        <div>
          <Label className="text-xs">Conta de saída</Label>
          <Select value={contaId} onValueChange={setContaId}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {contas.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.nome} ({brl(c.saldo_atual)})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Data de pagamento</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-[170px]" />
        </div>
      </div>

      {isLoading || !summary ? (
        <CardListSkeleton count={4} className="py-4" />
      ) : (
        <>
          {summary.alreadyDistributed && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3 text-sm">
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Já existe distribuição confirmada para {month}.</div>
                <div className="text-muted-foreground">Confirmar novamente vai gerar novos lançamentos. Verifique antes para não duplicar.</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard label="Receitas operacionais" value={summary.income_operational} className="text-emerald-600 dark:text-emerald-400" />
            <SummaryCard label="Despesas operacionais" value={-summary.expense_operational} className="text-red-600 dark:text-red-400" />
            <SummaryCard label="Resultado do mês" value={summary.net_result} className={summary.net_result >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} />
            <SummaryCard label="Base de distribuição" value={base} className="text-primary" />
          </div>

          {/* Pró-labore */}
          {summary.pro_labore_partners.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg">Pró-labore fixo (fora da divisão)</h2>
                  <p className="text-xs text-muted-foreground">Sócios que recebem apenas pró-labore. O valor é descontado do resultado antes de calcular a base.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.pro_labore_partners.map((p) => {
                  const ov = proLaboreOverrides[p.id];
                  const v = ov !== undefined ? ov : String(Number(p.pro_labore_amount || 0));
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                      <div className="flex-1">
                        <div className="font-medium">{p.full_name}</div>
                        <div className="text-xs text-muted-foreground">Apenas pró-labore</div>
                      </div>
                      <div className="w-[160px]">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor do mês</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={v}
                          onChange={(e) => setProLaboreOverrides((s) => ({ ...s, [p.id]: e.target.value }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sócios profit-share */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Divisão por participação
              </h2>
              <p className="text-xs text-muted-foreground">Base × % de cada sócio. Vales em aberto são abatidos do bruto; ao confirmar, eles são quitados automaticamente.</p>
            </div>

            <div className="space-y-3">
              {lines.filter((l) => l.distribution_type === "profit_share").map((l) => {
                const partner = profitPartners.find((p) => p.id === l.partner_id)!;
                const advs = advancesByPartner[l.partner_id] || [];
                return (
                  <div key={l.partner_id} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{l.partner_name}</div>
                        <div className="text-xs text-muted-foreground">{Number(partner.share_percentage).toFixed(2)}% de participação</div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bruto</div>
                          <div className="font-mono font-medium">{brl(l.gross)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vales abatidos</div>
                          <div className="font-mono text-amber-600 dark:text-amber-400">- {brl(l.advances_total)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Líquido a pagar</div>
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{brl(l.net)}</div>
                        </div>
                      </div>
                    </div>

                    {advs.length > 0 && (
                      <div className="space-y-1.5 border-t border-border/40 pt-3">
                        <div className="text-xs font-medium text-muted-foreground">Vales em aberto deste sócio</div>
                        {advs.map((a) => {
                          const open = Number(a.amount) - Number(a.settled_amount || 0);
                          const checked = !skipAdvances[a.id];
                          return (
                            <label key={a.id} className="flex items-center gap-3 text-sm cursor-pointer">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => setSkipAdvances((s) => ({ ...s, [a.id]: !v }))}
                              />
                              <span className="flex-1">
                                {new Date(a.advance_date + "T00:00:00").toLocaleDateString("pt-BR")} · {a.description || "Vale"}
                              </span>
                              <span className="font-mono text-amber-600 dark:text-amber-400">{brl(open)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {lines.filter((l) => l.distribution_type === "pro_labore_only" && l.gross > 0).map((l) => (
                <div key={l.partner_id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{l.partner_name}</div>
                      <Badge variant="outline" className="mt-1 text-[10px]">Pró-labore</Badge>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bruto</div>
                        <div className="font-mono font-medium">{brl(l.gross)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vales abatidos</div>
                        <div className="font-mono text-amber-600 dark:text-amber-400">- {brl(l.advances_total)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Líquido a pagar</div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{brl(l.net)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total a pagar aos sócios</div>
              <div className="text-3xl font-display font-bold text-primary">{brl(totalNet)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {lines.length} lançamento(s) serão criados como "a pagar" na conta selecionada.
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => confirmMut.mutate()}
              disabled={confirmMut.isPending || lines.every((l) => l.net <= 0)}
              className="gap-2"
            >
              {confirmMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Confirmar distribuição de {month}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display font-bold mt-1 ${className || ""}`}>{brl(value)}</div>
    </div>
  );
}

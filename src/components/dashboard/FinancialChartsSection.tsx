import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  PieChart as PieIcon,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Target,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/utils-format";

interface FinancialChartsProps {
  mrr: number;
  avulsa: number;
  receitaEfetivada: number;
  despesasPagas?: number;
  receitasPrevistas?: number;
  despesasPrevistas?: number;
  topClients?: { name: string; total: number }[];
  metaMensal?: number;
  metaAnual?: number;
  faturadoAnual?: number;
  editingMeta?: boolean;
  draftMeta?: string;
  onStartEditMeta?: () => void;
  onDraftChange?: (val: string) => void;
  onCommitMeta?: () => void;
  onCancelEditMeta?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function FinancialChartsSection({
  mrr = 0,
  avulsa = 0,
  receitaEfetivada = 0,
  despesasPagas = 0,
  receitasPrevistas = 0,
  despesasPrevistas = 0,
  topClients = [],
  metaMensal = 0,
  metaAnual = 0,
  faturadoAnual = 0,
  editingMeta = false,
  draftMeta = "",
  onStartEditMeta,
  onDraftChange,
  onCommitMeta,
  onCancelEditMeta,
  inputRef,
}: FinancialChartsProps) {
  // 1. Dados do Donut: Mix de Faturamento (MRR vs Avulso)
  const revenueMixData = useMemo(() => {
    const total = mrr + avulsa;
    if (total === 0) {
      return [{ name: "Sem receitas", value: 1, amount: 0, color: "#64748B", pct: 0 }];
    }
    const mrrPct = Math.round((mrr / total) * 100);
    const avulsoPct = Math.round((avulsa / total) * 100);

    return [
      {
        name: "Recorrente (MRR)",
        value: mrr || 0.001,
        amount: mrr,
        color: "#10B981",
        pct: mrrPct,
      },
      {
        name: "Avulso / Pontual",
        value: avulsa || 0.001,
        amount: avulsa,
        color: "#FFBC45",
        pct: avulsoPct,
      },
    ];
  }, [mrr, avulsa]);

  // 2. Dados de Colunas: Comparativo Financeiro (Entradas vs Saídas)
  const cashFlowData = useMemo(() => {
    return [
      {
        name: "Previsto",
        Receitas: receitasPrevistas || (mrr + avulsa),
        Despesas: despesasPrevistas,
      },
      {
        name: "Efetivado",
        Receitas: receitaEfetivada,
        Despesas: despesasPagas,
      },
    ];
  }, [receitasPrevistas, despesasPrevistas, receitaEfetivada, despesasPagas, mrr, avulsa]);

  // 3. Progresso das Metas (Gráfico Radial / Medidor Circular)
  const progressoMensal = metaMensal > 0 ? Math.min(100, Math.round((receitaEfetivada / metaMensal) * 100)) : 0;
  const progressoAnual = metaAnual > 0 ? Math.min(100, Math.round((faturadoAnual / metaAnual) * 100)) : 0;
  const faltaMensal = Math.max(0, metaMensal - receitaEfetivada);
  const faltaAnual = Math.max(0, metaAnual - faturadoAnual);
  const anoRef = new Date().getFullYear();

  // Em caso de atingir 0% ou valor muito baixo, garante um arco visível proporcional
  const monthlyGaugeData = useMemo(() => {
    if (metaMensal <= 0) {
      return [{ name: "Sem Meta", value: 1, color: "#94A3B8" }];
    }
    const atingido = Math.min(receitaEfetivada, metaMensal);
    const falta = Math.max(0, metaMensal - receitaEfetivada);
    return [
      { name: "Atingido", value: atingido || 0.0001, color: "#FFBC45" },
      { name: "Falta", value: falta || 0.0001, color: "#CBD5E1" },
    ];
  }, [receitaEfetivada, metaMensal]);

  const annualGaugeData = useMemo(() => {
    if (metaAnual <= 0) {
      return [{ name: "Sem Meta", value: 1, color: "#94A3B8" }];
    }
    const atingido = Math.min(faturadoAnual, metaAnual);
    const falta = Math.max(0, metaAnual - faturadoAnual);
    return [
      { name: "Atingido", value: atingido || 0.0001, color: "#10B981" },
      { name: "Falta", value: falta || 0.0001, color: "#CBD5E1" },
    ];
  }, [faturadoAnual, metaAnual]);

  // 4. Top Clientes por Faturamento
  const clientsChartData = useMemo(() => {
    const filtered = (topClients || [])
      .filter((c) => c.total > 0)
      .slice(0, 4);

    const maxVal = Math.max(...filtered.map((c) => c.total), 1);

    return filtered.map((c) => ({
      name: c.name,
      total: c.total,
      percent: Math.min(100, Math.round((c.total / maxVal) * 100)),
    }));
  }, [topClients]);

  const totalFaturamento = mrr + avulsa;
  const saldoOperacional = receitaEfetivada - despesasPagas;

  return (
    <div className="space-y-4">
      {/* Grade Principal: Metas Circulares + Balanço Financeiro + Composição */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bloco 1: Card de Metas com 2 Medidores Circulares (5 Colunas) */}
        <Card className="lg:col-span-5 bg-card border-border/70 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                <Target className="size-4 text-primary" /> Metas de Faturamento
              </h4>
              <p className="text-xs text-muted-foreground font-mono-kasa mt-0.5">
                Progresso mensal e anual consolidado
              </p>
            </div>
          </div>

          {/* Dois Medidores Circulares Lado a Lado */}
          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Medidor 1: Meta Mensal */}
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/20 border border-border/40 text-center">
              <span className="text-[11px] font-semibold text-foreground tracking-tight">
                Meta do Mês
              </span>

              <div className="size-28 relative my-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={monthlyGaugeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={48}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      {monthlyGaugeData.map((entry, index) => (
                        <Cell key={`cell-m-gauge-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-bold font-display text-foreground leading-none">
                    {metaMensal > 0 ? `${progressoMensal}%` : "—"}
                  </span>
                  <span className="text-[8px] font-mono-kasa text-muted-foreground uppercase mt-0.5">
                    Atingido
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono-kasa text-muted-foreground space-y-0.5">
                <p className="text-foreground font-bold">{brl(receitaEfetivada)}</p>
                <div className="flex items-center justify-center gap-1">
                  <span>de</span>
                  {editingMeta ? (
                    <Input
                      ref={inputRef}
                      type="number"
                      inputMode="decimal"
                      value={draftMeta}
                      onChange={(e) => onDraftChange?.(e.target.value)}
                      onBlur={onCommitMeta}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onCommitMeta?.();
                        if (e.key === "Escape") onCancelEditMeta?.();
                      }}
                      className="h-5 w-20 text-[10px] px-1 text-center"
                      placeholder="0.00"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={onStartEditMeta}
                      className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors underline underline-offset-2"
                    >
                      <span>{metaMensal > 0 ? brl(metaMensal) : "definir"}</span>
                      <Pencil className="size-2 opacity-60" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Medidor 2: Meta Anual */}
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/20 border border-border/40 text-center">
              <span className="text-[11px] font-semibold text-foreground tracking-tight">
                Meta Anual · {anoRef}
              </span>

              <div className="size-28 relative my-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={annualGaugeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={48}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      {annualGaugeData.map((entry, index) => (
                        <Cell key={`cell-a-gauge-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-bold font-display text-foreground leading-none">
                    {metaAnual > 0 ? `${progressoAnual}%` : "—"}
                  </span>
                  <span className="text-[8px] font-mono-kasa text-muted-foreground uppercase mt-0.5">
                    Atingido
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono-kasa text-muted-foreground space-y-0.5">
                <p className="text-foreground font-bold">{brl(faturadoAnual)}</p>
                <p className="text-[10px] text-muted-foreground">
                  de {metaAnual > 0 ? brl(metaAnual) : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-border/40 font-mono-kasa text-[11px] text-muted-foreground">
            {metaMensal > 0 && faltaMensal > 0 ? (
              <span>Faltam <strong className="text-primary">{brl(faltaMensal)}</strong> para fechar a meta do mês</span>
            ) : metaMensal > 0 ? (
              <span className="text-emerald-500 font-bold">Meta mensal atingida com sucesso!</span>
            ) : (
              <span>Clique no valor para definir a meta mensal</span>
            )}
          </div>
        </Card>

        {/* Bloco 2: Fluxo Entradas vs Saídas em Colunas (7 Colunas) */}
        <Card className="lg:col-span-7 bg-card border-border/70 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                <Wallet className="size-4 text-primary" /> Balanço de Receitas x Despesas Operacionais
              </h4>
              <p className="text-xs text-muted-foreground font-mono-kasa mt-0.5">
                Entradas vs saídas operacionais (sem pró-labore)
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono-kasa">
              <span className="text-muted-foreground">Saldo Realizado:</span>
              <span className={`font-bold tabular-nums ${saldoOperacional >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {brl(saldoOperacional)}
              </span>
            </div>
          </div>

          <div className="h-[210px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-muted-foreground font-mono-kasa"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  tick={{ fill: "currentColor", fontSize: 10 }}
                  className="text-muted-foreground font-mono-kasa"
                />
                <Tooltip
                  cursor={{ fill: "currentColor", opacity: 0.05 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border/80 px-3 py-2 rounded-lg shadow-lg text-xs font-mono-kasa space-y-1">
                          <p className="font-bold text-foreground">{payload[0]?.payload?.name}</p>
                          {payload.map((p: any) => (
                            <div key={p.dataKey} className="flex items-center justify-between gap-4">
                              <span style={{ color: p.color }}>{p.dataKey}:</span>
                              <span className="font-bold text-foreground">{brl(Number(p.value || 0))}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Receitas" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Bar dataKey="Despesas" fill="#F43F5E" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Destaques rápidos */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 font-mono-kasa text-xs">
            <div className="flex items-center justify-between bg-muted/20 p-2.5 rounded-lg border border-border/40">
              <span className="text-[11px] text-muted-foreground">Recebido no Mês</span>
              <span className="font-bold text-foreground tabular-nums">{brl(receitaEfetivada)}</span>
            </div>

            <div className="flex items-center justify-between bg-muted/20 p-2.5 rounded-lg border border-border/40">
              <span className="text-[11px] text-muted-foreground">Pago no Mês</span>
              <span className="font-bold text-foreground tabular-nums">{brl(despesasPagas)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bloco 3: Mix de Receita Donut + Top Clientes por Faturamento Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Gráfico 3: Mix de Receita - Donut MRR vs Avulso (5 Colunas) */}
        <Card className="lg:col-span-5 bg-card border-border/70 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                <PieIcon className="size-4 text-emerald-500" /> Composição de Faturamento
              </h4>
              <p className="text-xs text-muted-foreground font-mono-kasa mt-0.5">
                Previsibilidade (MRR) vs Jobs Pontuais
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono-kasa">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-foreground tabular-nums">
                {brl(totalFaturamento)}
              </span>
            </div>
          </div>

          <div className="h-[175px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={74}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {revenueMixData.map((entry, index) => (
                    <Cell key={`cell-rev-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border/80 px-3 py-1.5 rounded-lg shadow-md text-xs font-mono-kasa">
                          <p className="font-bold text-foreground">{data.name}</p>
                          <p className="text-emerald-500 font-bold mt-0.5">{brl(data.amount)}</p>
                          <p className="text-muted-foreground text-[10px]">{data.pct}% do total</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-bold font-display text-foreground leading-none">
                {revenueMixData[0]?.pct || 0}%
              </span>
              <span className="text-[9px] font-mono-kasa text-muted-foreground uppercase mt-0.5">
                Recorrente
              </span>
            </div>
          </div>

          {/* Legenda com percentuais */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            {revenueMixData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-mono-kasa">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-foreground/80">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-bold">{brl(item.amount)}</span>
                  <span className="text-[10px] text-muted-foreground">({item.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gráfico 4: Principais Clientes por Faturamento (7 Colunas) */}
        <Card className="lg:col-span-7 bg-card border-border/70 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                <Users className="size-4 text-sky-500" /> Principais Clientes por Faturamento
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto">
            {clientsChartData.map((client, idx) => (
              <div
                key={client.name}
                className="bg-muted/30 border border-border/60 rounded-xl p-3.5 flex flex-col justify-between space-y-2 hover:border-foreground/20 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono-kasa font-bold text-muted-foreground">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold font-mono-kasa text-foreground tabular-nums">
                    {brl(client.total)}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate" title={client.name}>
                    {client.name}
                  </p>
                  <div className="w-full bg-border/60 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${client.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/40 flex justify-between items-center text-[10px] font-mono-kasa text-muted-foreground">
            <span>Base de cálculo: receitas operacionais recebidas/previstas</span>
            <span>Kasa Finance</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

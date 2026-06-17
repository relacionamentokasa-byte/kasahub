import { useMemo } from "react";
import {
  TrendingUp,
  PiggyBank,
  Users,
  Building2,
  Wallet,
  Receipt,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { brl } from "@/lib/utils-format";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRO_LABORE_POR_SOCIO = 1621;
const TOTAL_SOCIOS = 4;
const SOCIOS_COM_DISTRIBUICAO = 3;
const PRO_LABORE_FIXO = PRO_LABORE_POR_SOCIO * TOTAL_SOCIOS; // 4 sócios x R$ 1.621,00

interface FinancialRulesPanelProps {
  totalFaturamento: number;
  despesasReais?: number;
  investimentoRealizado?: number;
  periodoLabel?: string;
}

export function FinancialRulesPanel({
  totalFaturamento,
  despesasReais = 0,
  investimentoRealizado = 0,
  periodoLabel,
}: FinancialRulesPanelProps) {
  const calc = useMemo(() => {
    const tetoDespesas = totalFaturamento * 0.25;
    const reservaInvestimento = totalFaturamento * 0.10;
    const totalProLabore = PRO_LABORE_FIXO;
    const lucroBruto =
      totalFaturamento - despesasReais - reservaInvestimento - totalProLabore;
    const lucroLiquido = Math.max(lucroBruto, 0);
    const distribuicaoSocios = lucroLiquido * 0.75;
    const caixaEmpresa = lucroLiquido * 0.25;
    const economiaDespesas = tetoDespesas - despesasReais;
    const dentroDaMeta = despesasReais <= tetoDespesas;
    const pctTeto =
      tetoDespesas > 0 ? (despesasReais / tetoDespesas) * 100 : 0;
    const pctInvest =
      reservaInvestimento > 0
        ? (investimentoRealizado / reservaInvestimento) * 100
        : 0;
    const investimentoRestante = reservaInvestimento - investimentoRealizado;
    return {
      tetoDespesas,
      despesasReais,
      reservaInvestimento,
      investimentoRealizado,
      investimentoRestante,
      pctInvest,
      totalProLabore,
      lucroLiquido,
      lucroBruto,
      distribuicaoSocios,
      caixaEmpresa,
      economiaDespesas,
      dentroDaMeta,
      pctTeto,
    };
  }, [totalFaturamento, despesasReais, investimentoRealizado]);

  const pct = (v: number) =>
    totalFaturamento > 0 ? (v / totalFaturamento) * 100 : 0;

  const chartData = [
    { name: "Despesas Reais", value: calc.despesasReais, color: calc.dentroDaMeta ? "#10b981" : "#ef4444" },
    { name: "Investimento (10%)", value: calc.reservaInvestimento, color: "#3b82f6" },
    { name: "Pró-labore", value: calc.totalProLabore, color: "#a855f7" },
    { name: "Distribuição Sócios", value: calc.distribuicaoSocios, color: "#059669" },
    { name: "Caixa da Empresa", value: calc.caixaEmpresa, color: "#0ea5e9" },
  ].filter((d) => d.value > 0);

  return (
    <section className="rounded-3xl border border-border bg-gradient-to-br from-surface via-background to-surface p-6 shadow-sm space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">
              Distribuição Financeira do Mês
            </h3>
            <p className="text-xs text-foreground/50">
              Regra de Ouro {periodoLabel ? `· ${periodoLabel}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">
            Faturamento Total
          </div>
          <div className="text-2xl font-bold text-primary">
            {brl(totalFaturamento)}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <BlockCard
            icon={TrendingUp}
            label="Faturamento Bruto (100%)"
            value={totalFaturamento}
            percentage={100}
            tone="primary"
            big
          />

          <div className="grid sm:grid-cols-2 gap-3">
            {/* Despesas: Realizado vs Teto */}
            <div
              className={cn(
                "rounded-2xl border p-4 space-y-2",
                calc.dentroDaMeta
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-rose-50 border-rose-200",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Receipt
                    className={cn(
                      "size-4",
                      calc.dentroDaMeta ? "text-emerald-700" : "text-rose-700",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      calc.dentroDaMeta ? "text-emerald-700" : "text-rose-700",
                    )}
                  >
                    Despesas
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums",
                    calc.dentroDaMeta ? "text-emerald-700" : "text-rose-700",
                  )}
                >
                  {calc.pctTeto.toFixed(1)}% do teto
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-xl font-bold tabular-nums text-foreground">
                  {brl(calc.despesasReais)}
                </div>
                <div className="text-[11px] text-foreground/60">
                  Realizado · Teto: <span className="font-semibold">{brl(calc.tetoDespesas)}</span>
                </div>
              </div>
              <Progress
                value={Math.min(calc.pctTeto, 100)}
                className={cn(
                  "h-1.5",
                  calc.dentroDaMeta
                    ? "[&>div]:bg-emerald-500"
                    : "[&>div]:bg-rose-500",
                )}
              />
              {calc.dentroDaMeta ? (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1"
                >
                  <CheckCircle2 className="size-3" />
                  Economia de {brl(calc.economiaDespesas)}
                </Badge>
              ) : (
                <Badge
                  variant="destructive"
                  className="gap-1"
                >
                  <AlertTriangle className="size-3" />
                  Acima do teto em {brl(Math.abs(calc.economiaDespesas))}
                </Badge>
              )}
            </div>

            <div className="rounded-2xl border p-4 space-y-2 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PiggyBank className="size-4 text-blue-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Investimento (10%)
                  </span>
                </div>
                <span className="text-[10px] font-bold tabular-nums text-blue-700">
                  {calc.pctInvest.toFixed(1)}% da reserva
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-xl font-bold tabular-nums text-foreground">
                  {brl(calc.investimentoRealizado)}
                </div>
                <div className="text-[11px] text-foreground/60">
                  Realizado · Reserva: <span className="font-semibold">{brl(calc.reservaInvestimento)}</span>
                </div>
              </div>
              <Progress
                value={Math.min(calc.pctInvest, 100)}
                className="h-1.5 [&>div]:bg-blue-500"
              />
              <p className="text-[10px] text-foreground/50">
                {calc.investimentoRestante > 0
                  ? `Restam ${brl(calc.investimentoRestante)} para investir`
                  : `Reserva totalmente aplicada`}
              </p>
            </div>
          </div>


          <BlockCard
            icon={Users}
            label="Pró-labore Fixo (4 Sócios)"
            value={calc.totalProLabore}
            percentage={pct(calc.totalProLabore)}
            tone="purple"
            hint="4 × R$ 1.621,00"
          />


          <div
            className={cn(
              "rounded-2xl p-5 border-2 space-y-4",
              calc.lucroBruto < 0
                ? "bg-rose-50 border-rose-200"
                : "bg-emerald-50 border-emerald-200",
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-700/70">
                  Lucro Líquido
                </div>
                <div
                  className={cn(
                    "text-3xl font-bold",
                    calc.lucroBruto < 0 ? "text-rose-700" : "text-emerald-700",
                  )}
                >
                  {brl(calc.lucroLiquido)}
                </div>
                {calc.lucroBruto < 0 && (
                  <div className="text-xs text-rose-600 mt-1">
                    Operação no vermelho: {brl(calc.lucroBruto)}
                  </div>
                )}
                {calc.dentroDaMeta && calc.economiaDespesas > 0 && (
                  <div className="text-[11px] text-emerald-700/80 mt-1">
                    + {brl(calc.economiaDespesas)} adicionados pela economia em despesas
                  </div>
                )}
              </div>
              <Wallet className="size-10 text-emerald-300" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <BlockCard
                icon={Users}
                label="Distribuição (3 Sócios · 75%)"
                value={calc.distribuicaoSocios}
                percentage={pct(calc.distribuicaoSocios)}
                tone="emerald"
              />
              <BlockCard
                icon={Building2}
                label="Caixa da Empresa (25%)"
                value={calc.caixaEmpresa}
                percentage={pct(calc.caixaEmpresa)}
                tone="sky"
              />
            </div>

            <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Wallet className="size-5 text-emerald-700" />
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-700/70">
                      Salário Projetado por Sócio
                    </div>
                    <div className="text-[11px] text-foreground/60">
                      Se o mês fechar conforme planejado · Pró-labore + Distribuição
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-emerald-200/60 text-emerald-800 border-emerald-300 text-[10px]">
                  Projeção
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/70 border border-emerald-200 p-4 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700/80">
                    3 Sócios (com distribuição)
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-emerald-700">
                    {brl(PRO_LABORE_POR_SOCIO + calc.distribuicaoSocios / SOCIOS_COM_DISTRIBUICAO)}
                  </div>
                  <div className="text-[11px] text-foreground/60 tabular-nums">
                    {brl(PRO_LABORE_POR_SOCIO)} pró-labore + {brl(calc.distribuicaoSocios / SOCIOS_COM_DISTRIBUICAO)} distribuição
                  </div>
                </div>

                <div className="rounded-xl bg-white/70 border border-purple-200 p-4 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-purple-700/80">
                    1 Sócio (somente pró-labore)
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-purple-700">
                    {brl(PRO_LABORE_POR_SOCIO)}
                  </div>
                  <div className="text-[11px] text-foreground/60">
                    Pró-labore fixo mensal
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-emerald-200">
                <span className="text-foreground/60">Total saindo do caixa para sócios</span>
                <span className="font-bold tabular-nums text-emerald-800">
                  {brl(calc.totalProLabore + calc.distribuicaoSocios)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col">
          <div className="text-[10px] uppercase tracking-widest font-bold text-foreground/50 mb-2">
            Composição do Faturamento
          </div>
          <div className="flex-1 min-h-[220px]">
            {totalFaturamento > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => brl(v)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-foreground/40">
                Sem faturamento no período
              </div>
            )}
          </div>
          <ul className="space-y-1.5 mt-3">
            {chartData.map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-foreground/70">{d.name}</span>
                </span>
                <span className="font-semibold">{brl(d.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

interface BlockCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  percentage: number;
  tone: "primary" | "amber" | "blue" | "purple" | "emerald" | "sky";
  big?: boolean;
  hint?: string;
}

const TONES: Record<BlockCardProps["tone"], { bg: string; text: string; bar: string }> = {
  primary: { bg: "bg-primary/5 border-primary/20", text: "text-primary", bar: "[&>div]:bg-primary" },
  amber: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", bar: "[&>div]:bg-amber-500" },
  blue: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", bar: "[&>div]:bg-blue-500" },
  purple: { bg: "bg-purple-50 border-purple-200", text: "text-purple-700", bar: "[&>div]:bg-purple-500" },
  emerald: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", bar: "[&>div]:bg-emerald-500" },
  sky: { bg: "bg-sky-50 border-sky-200", text: "text-sky-700", bar: "[&>div]:bg-sky-500" },
};

function BlockCard({ icon: Icon, label, value, percentage, tone, big, hint }: BlockCardProps) {
  const t = TONES[tone];
  return (
    <div className={cn("rounded-2xl border p-4 space-y-2", t.bg)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4", t.text)} />
          <span className={cn("text-xs font-bold uppercase tracking-wider", t.text)}>
            {label}
          </span>
        </div>
        <span className={cn("text-[10px] font-bold tabular-nums", t.text)}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className={cn("font-bold tabular-nums", big ? "text-3xl text-primary" : "text-xl text-foreground")}>
        {brl(value)}
      </div>
      <Progress value={Math.min(percentage, 100)} className={cn("h-1.5", t.bar)} />
      {hint && <p className="text-[10px] text-foreground/50">{hint}</p>}
    </div>
  );
}

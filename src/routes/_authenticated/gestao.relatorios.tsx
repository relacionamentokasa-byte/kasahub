import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  AlertTriangle,
  Percent,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Link2,
} from "lucide-react";


import { fetchTransactions } from "@/lib/finance-api";
import { effectiveAmount } from "@/lib/finance-values";
import { PRO_LABORE_CATEGORY, DISTRIBUTION_CATEGORY } from "@/lib/distribution-api";
import { fetchClients } from "@/lib/ops-api";
import { brl } from "@/lib/utils-format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import { UnlinkedTransactionsDialog } from "@/components/finance/UnlinkedTransactionsDialog";

export const Route = createFileRoute("/_authenticated/gestao/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios de Gestão — KASA HUB" },
      { name: "description", content: "Evolução financeira, rentabilidade por cliente e indicadores de gestão." },
    ],
  }),
  component: RelatoriosGestaoPage,
});

type RangeKey = "3m" | "6m" | "12m" | "ytd" | "year";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[Number(m) - 1]}/${y.slice(2)}`;
}

function RelatoriosGestaoPage() {
  const [range, setRange] = useState<RangeKey>("12m");
  const [includeNonOp, setIncludeNonOp] = useState(false);
  const [includeProLabore, setIncludeProLabore] = useState(true);
  const [unlinkedModalOpen, setUnlinkedModalOpen] = useState(false);

  const { startDate, endDate, months } = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let start: Date;
    switch (range) {
      case "3m": start = new Date(now.getFullYear(), now.getMonth() - 2, 1); break;
      case "6m": start = new Date(now.getFullYear(), now.getMonth() - 5, 1); break;
      case "ytd": start = new Date(now.getFullYear(), 0, 1); break;
      case "year": start = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1); break;
      case "12m":
      default: start = new Date(now.getFullYear(), now.getMonth() - 11, 1); break;
    }
    const months: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      months.push(monthKey(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { startDate: iso(start), endDate: iso(end), months };
  }, [range]);

  const { data: transactionsResponse, isLoading: tLoading } = useQuery({
    queryKey: ["gestao-relatorios", "transactions", startDate, endDate],
    queryFn: () => fetchTransactions({ startDate, endDate, pageSize: 5000 }), // Módulo de gestão precisa de todos os dados do período
  });
  const transactions = transactionsResponse?.data || [];

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });




  // ── Evolução mensal ────────────────────────────────────────────────
  const monthly = useMemo(() => {
    const map = new Map<string, { mes: string; receita: number; receitaNaoOp: number; despesaOp: number; despesaProLabore: number; despesaNaoOp: number; lucro: number }>();
    months.forEach((k) => map.set(k, { mes: monthLabel(k), receita: 0, receitaNaoOp: 0, despesaOp: 0, despesaProLabore: 0, despesaNaoOp: 0, lucro: 0 }));

    transactions.forEach((t: any) => {
      const isPaid = t.status === "paid" || !!t.payment_date;
      // Receita: SÓ conta o que foi efetivamente recebido (pago)
      // Despesa: usa data de pagamento se houver, senão vencimento (regime de competência)
      const ref = t.type === "income"
        ? t.payment_date
        : (t.payment_date || t.due_date);
      if (!ref) return;
      if (t.type === "income" && !isPaid) return;
      const key = ref.slice(0, 7);
      const bucket = map.get(key);
      if (!bucket) return;
      const amount = effectiveAmount(t);
      const desc = String(t.description || "").toLowerCase();
      const isProLabore =
        t.category === PRO_LABORE_CATEGORY ||
        t.category === DISTRIBUTION_CATEGORY ||
        desc.includes("labore") ||
        desc.includes("distribui");
      if (t.type === "income") {
        if (t.nature === "nao_operacional") bucket.receitaNaoOp += amount;
        else bucket.receita += amount;
      } else {
        if (t.nature === "nao_operacional") bucket.despesaNaoOp += amount;
        else if (isProLabore) bucket.despesaProLabore += amount;
        else bucket.despesaOp += amount;
      }
    });

    map.forEach((b: any) => {
      if (includeNonOp) b.receita += b.receitaNaoOp;
      const desp = b.despesaOp + (includeProLabore ? b.despesaProLabore : 0) + (includeNonOp ? b.despesaNaoOp : 0);
      b.despesaTotal = desp;
      b.lucro = b.receita - desp;
    });
    return Array.from(map.values());
  }, [transactions, months, includeNonOp, includeProLabore]);

  // ── Totais do período ──────────────────────────────────────────────
  const totals = useMemo(() => {
    const t = monthly.reduce(
      (acc, m) => {
        acc.receita += m.receita;
        acc.despesaOp += m.despesaOp;
        acc.despesaProLabore += m.despesaProLabore;
        acc.despesaNaoOp += m.despesaNaoOp;
        acc.lucro += m.lucro;
        return acc;
      },
      { receita: 0, despesaOp: 0, despesaProLabore: 0, despesaNaoOp: 0, lucro: 0 }
    );
    const totalDespesas = t.despesaOp + (includeProLabore ? t.despesaProLabore : 0) + (includeNonOp ? t.despesaNaoOp : 0);
    const margem = t.receita > 0 ? (t.lucro / t.receita) * 100 : 0;
    return { ...t, totalDespesas, margem };
  }, [monthly, includeNonOp, includeProLabore]);

  // ── Composição de Custos & Despesas (Donut / Pizza) ───────────────────
  const expenseComposition = useMemo(() => {
    const list: { name: string; value: number; color: string; pct: number }[] = [];
    const total = totals.totalDespesas;

    if (totals.despesaOp > 0) {
      list.push({
        name: "Operacional / Produção",
        value: totals.despesaOp,
        color: "hsl(0 72% 51%)",
        pct: total > 0 ? (totals.despesaOp / total) * 100 : 0,
      });
    }

    if (includeProLabore && totals.despesaProLabore > 0) {
      list.push({
        name: "Pró-labore & Distribuição",
        value: totals.despesaProLabore,
        color: "hsl(280 65% 55%)",
        pct: total > 0 ? (totals.despesaProLabore / total) * 100 : 0,
      });
    }

    if (includeNonOp && totals.despesaNaoOp > 0) {
      list.push({
        name: "Não-operacional / Outros",
        value: totals.despesaNaoOp,
        color: "hsl(25 80% 60%)",
        pct: total > 0 ? (totals.despesaNaoOp / total) * 100 : 0,
      });
    }

    return list;
  }, [totals, includeProLabore, includeNonOp]);

  // ── Por cliente: receita, custo, margem ────────────────────────────
  const perClient = useMemo(() => {
    const map = new Map<string, { id: string; name: string; receita: number; despesa: number }>();
    const ensure = (id: string | null, fallbackName = "Custos Gerais da Agência (KASA)") => {
      const key = id || "__none__";
      if (!map.has(key)) {
        const c = clients.find((c: any) => c.id === id);
        map.set(key, { id: key, name: c?.company || c?.name || fallbackName, receita: 0, despesa: 0 });
      }
      return map.get(key)!;
    };

    transactions.forEach((t: any) => {
      const amount = effectiveAmount(t);
      const bucket = ensure(t.client_id);
      if (t.type === "income") {
        const isPaid = t.status === "paid" || !!t.payment_date;
        if (!isPaid) return; // só conta receita efetivamente recebida
        if (t.nature === "nao_operacional" && !includeNonOp) return;
        bucket.receita += amount;
      }
      else {
        if (t.nature === "nao_operacional" && !includeNonOp) return;
        const desc = String(t.description || "").toLowerCase();
        const isProLabore =
          t.category === PRO_LABORE_CATEGORY ||
          t.category === DISTRIBUTION_CATEGORY ||
          desc.includes("labore") ||
          desc.includes("distribui");
        if (isProLabore && !includeProLabore) return;
        bucket.despesa += amount;
      }
    });

    return Array.from(map.values())
      .map((c) => {
        const margemAbs = c.receita - c.despesa;
        const margemPct = c.receita > 0 ? (margemAbs / c.receita) * 100 : 0;
        return { ...c, margemAbs, margemPct };
      })
      .sort((a, b) => b.receita - a.receita);
  }, [transactions, clients, includeNonOp, includeProLabore]);

  // ── Composição de Clientes: Top 5 vs Restante (Donut / Pizza) ──────────
  const clientConcentrationData = useMemo(() => {
    const withRevenue = perClient.filter((c) => c.id !== "__none__" && c.receita > 0);
    const totalRevenue = withRevenue.reduce((s, c) => s + c.receita, 0);
    if (totalRevenue === 0) return [];

    const top5 = withRevenue.slice(0, 5);
    const top5Revenue = top5.reduce((s, c) => s + c.receita, 0);
    const othersRevenue = Math.max(0, totalRevenue - top5Revenue);

    const colors = [
      "hsl(var(--primary))",
      "hsl(217 91% 60%)",
      "hsl(142 71% 45%)",
      "hsl(280 65% 55%)",
      "hsl(25 80% 60%)",
    ];

    const result = top5.map((c, i) => ({
      name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name,
      fullName: c.name,
      value: c.receita,
      pct: (c.receita / totalRevenue) * 100,
      color: colors[i % colors.length],
    }));

    if (othersRevenue > 0) {
      result.push({
        name: `Outros (${withRevenue.length - top5.length})`,
        fullName: `Outros (${withRevenue.length - top5.length} clientes)`,
        value: othersRevenue,
        pct: (othersRevenue / totalRevenue) * 100,
        color: "hsl(var(--muted-foreground) / 0.4)",
      });
    }

    return result;
  }, [perClient]);

  // ── Concentração / Clientes ────────────────────────────────────────
  const clientStats = useMemo(() => {
    const withRevenue = perClient.filter((c) => c.id !== "__none__" && c.receita > 0);
    const totalRevenue = withRevenue.reduce((s, c) => s + c.receita, 0);
    const top5 = withRevenue.slice(0, 5);
    const top5Revenue = top5.reduce((s, c) => s + c.receita, 0);
    const concentracao = totalRevenue > 0 ? (top5Revenue / totalRevenue) * 100 : 0;

    const activeClients = clients.filter((c: any) => c.status === "ativo" || c.status === "active").length;
    const recurring = clients.filter((c: any) => c.contract_type === "recorrente" && Number(c.contract_value) > 0);
    const mrr = recurring.reduce((s: number, c: any) => s + Number(c.contract_value || 0), 0);

    // Tempo médio de relacionamento (em meses)
    const now = Date.now();
    const withStart = clients.filter((c: any) => c.start_date || c.created_at);
    const tempoMedio = withStart.length === 0 ? 0 :
      withStart.reduce((s: number, c: any) => {
        const d = new Date(c.start_date || c.created_at).getTime();
        return s + (now - d) / (1000 * 60 * 60 * 24 * 30.4);
      }, 0) / withStart.length;

    return { concentracao, activeClients, mrr, tempoMedio, totalRevenue, top5 };
  }, [perClient, clients]);

  const top10ClientesChart = useMemo(
    () => perClient.filter((c) => c.id !== "__none__" && c.receita > 0).slice(0, 10).map((c) => ({
      name: c.name.length > 16 ? c.name.slice(0, 16) + "…" : c.name,
      Receita: c.receita,
    })),
    [perClient]
  );

  if (tLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full mx-auto animate-reveal">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border/80 pb-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
            <Skeleton className="h-9 w-40 rounded-xl" />
            <Skeleton className="h-9 w-48 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>

        {/* 4 KPIs Top Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="size-3.5 rounded-sm" />
              </div>
              <Skeleton className="h-6 sm:h-7 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border/80 shadow-xs rounded-xl p-4 space-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </div>
          <div className="bg-card border border-border/80 shadow-xs rounded-xl p-4 space-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2 bg-card border border-border/80 shadow-xs rounded-xl p-4 space-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </div>
        </div>

        {/* 4 KPIs Clientes Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="size-3.5 rounded-sm" />
              </div>
              <Skeleton className="h-6 sm:h-7 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full mx-auto animate-reveal">
      {/* Header Executivo */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="size-3" /> Dashboard
          </Link>
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-widest font-semibold block">
            Gestão · Inteligência & DRE
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-1">
            Relatórios de Gestão
          </h1>
          <p className="text-muted-foreground text-xs lg:text-sm mt-1">
            Evolução financeira, rentabilidade por cliente, margem operacional e indicadores estratégicos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/80 bg-card shadow-2xs">
            <Switch id="non-op" checked={includeNonOp} onCheckedChange={setIncludeNonOp} />
            <Label htmlFor="non-op" className="text-xs text-muted-foreground cursor-pointer select-none">
              Não-operacionais
            </Label>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/80 bg-card shadow-2xs">
            <Switch id="pro-labore" checked={includeProLabore} onCheckedChange={setIncludeProLabore} />
            <Label htmlFor="pro-labore" className="text-xs text-muted-foreground cursor-pointer select-none">
              Pró-labore / Distribuição
            </Label>
          </div>
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs rounded-xl bg-card border-border/80 shadow-2xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m" className="text-xs">Últimos 3 meses</SelectItem>
              <SelectItem value="6m" className="text-xs">Últimos 6 meses</SelectItem>
              <SelectItem value="12m" className="text-xs">Últimos 12 meses</SelectItem>
              <SelectItem value="ytd" className="text-xs">Ano corrente</SelectItem>
              <SelectItem value="year" className="text-xs">Últimos 12 meses (móvel)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs Gerais do Período - Grid 2x2 no Mobile e 4 cols no Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Faturamento
            </span>
            <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {brl(totals.receita)}
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa block mt-0.5 truncate">
            receita realizada
          </span>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Despesa Operacional
            </span>
            <TrendingDown className="size-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {brl(totals.despesaOp)}
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa block mt-0.5 truncate">
            {includeNonOp ? `Não-op: ${brl(totals.despesaNaoOp)}` : "custos operacionais"}
          </span>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Lucro do Período
            </span>
            <Wallet className={`size-3.5 shrink-0 ${totals.lucro >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-400"}`} />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className={`font-mono-kasa text-base sm:text-xl font-bold tabular-nums ${totals.lucro >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}>
              {brl(totals.lucro)}
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa block mt-0.5 truncate">
            resultado líquido
          </span>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Margem do Período
            </span>
            <Percent className={`size-3.5 shrink-0 ${totals.margem >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`} />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className={`font-mono-kasa text-base sm:text-xl font-bold tabular-nums ${totals.margem >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
              {totals.margem.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa block mt-0.5 truncate">
            mínimo alvo: 75%
          </span>
        </div>
      </div>

      {/* Gráficos de Evolução & DRE Executivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna 1 e 2 (Span 2): Evolução do Faturamento & DRE Comparativo em Colunas */}
        <div className="lg:col-span-2 space-y-4">
          <ChartCard title="DRE Mensal: Receita x Despesas x Resultado Líquido" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <RTooltip
                  formatter={(v: any, name: any) => [brl(Number(v)), name]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="despesaTotal" name="Despesas Totais" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="lucro" name="Resultado Líquido" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Evolução da Receita Realizada (Tendência)" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <RTooltip
                  formatter={(v: any) => [brl(Number(v)), "Receita"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  }}
                />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--primary))" fill="url(#gradRev)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Coluna 3 (Span 1): Gráfico Donut de Composição das Despesas */}
        <div className="space-y-4">
          <ChartCard title="Composição de Custos & Despesas" icon={PieChartIcon} className="h-full flex flex-col justify-between">
            <div className="relative flex items-center justify-center my-auto min-h-[250px]">
              {expenseComposition.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={expenseComposition}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={92}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseComposition.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RTooltip
                        formatter={(v: any, _name: any, item: any) => [
                          `${brl(Number(v))} (${item.payload.pct.toFixed(1)}%)`,
                          item.payload.name,
                        ]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0.75rem",
                          fontSize: "12px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total Central no Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground">Total Saídas</span>
                    <span className="text-sm sm:text-base font-bold font-mono-kasa tabular-nums text-foreground">
                      {brl(totals.totalDespesas)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center text-xs text-muted-foreground font-mono-kasa py-12">
                  Sem despesas registradas no período.
                </div>
              )}
            </div>

            {/* Legenda customizada com percentuais */}
            <div className="pt-2 border-t border-border/60 space-y-2 mt-auto">
              {expenseComposition.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono-kasa tabular-nums">
                    <span className="text-foreground font-medium">{brl(item.value)}</span>
                    <span className="text-[11px] text-muted-foreground">({item.pct.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Bloco de Clientes - Grid 2x2 no Mobile e 4 cols no Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Clientes Ativos
            </span>
            <Users className="size-3.5 text-primary shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {clientStats.activeClients}
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa block mt-0.5 truncate">
            carteira ativa
          </span>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              MRR Recorrente
            </span>
            <Wallet className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {brl(clientStats.mrr)}
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa block mt-0.5 truncate">
            receita mensal recorrente
          </span>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Concentração Top 5
            </span>
            <AlertTriangle className={`size-3.5 shrink-0 ${clientStats.concentracao > 60 ? "text-rose-600" : clientStats.concentracao > 40 ? "text-amber-500" : "text-emerald-600"}`} />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className={`font-mono-kasa text-base sm:text-xl font-bold tabular-nums ${clientStats.concentracao > 60 ? "text-rose-600" : clientStats.concentracao > 40 ? "text-amber-600" : "text-foreground"}`}>
              {clientStats.concentracao.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa block mt-0.5 truncate">
            {clientStats.concentracao > 60 ? "Alto risco" : clientStats.concentracao > 40 ? "Atenção" : "Saudável"}
          </span>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Relacionamento
            </span>
            <Users className="size-3.5 text-blue-500 shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {clientStats.tempoMedio.toFixed(1)}m
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa block mt-0.5 truncate">
            tempo médio de contrato
          </span>
        </div>
      </div>

      {/* Distribuição e Pareto de Clientes: Donut de Concentração + Top 10 Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Fatia da Receita: Top 5 vs Carteira" icon={PieChartIcon} className="flex flex-col justify-between">
          <div className="relative flex items-center justify-center my-auto min-h-[220px]">
            {clientConcentrationData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={clientConcentrationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {clientConcentrationData.map((entry, index) => (
                        <Cell key={`client-cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RTooltip
                      formatter={(v: any, _name: any, item: any) => [
                        `${brl(Number(v))} (${item.payload.pct.toFixed(1)}%)`,
                        item.payload.fullName,
                      ]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground">Top 5</span>
                  <span className="text-sm font-bold font-mono-kasa tabular-nums text-foreground">
                    {clientStats.concentracao.toFixed(1)}%
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center text-xs text-muted-foreground font-mono-kasa py-12">
                Sem receita de clientes no período.
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-border/60 space-y-1.5 mt-auto">
            {clientConcentrationData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </div>
                <span className="font-mono-kasa tabular-nums text-foreground font-medium shrink-0">
                  {item.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top 10 Clientes por Volume de Receita" icon={Layers} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={Math.max(260, top10ClientesChart.length * 30)}>
            <BarChart data={top10ClientesChart} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
              <YAxis type="category" dataKey="name" width={135} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <RTooltip
                formatter={(v: any) => [brl(Number(v)), "Receita"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              />
              <Bar dataKey="Receita" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tabela P&L / Rentabilidade por Cliente */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Rentabilidade por cliente</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receita menos despesas vinculadas ao cliente no período. Custos institucionais e de estrutura aparecem em &quot;Custos Gerais da Agência (KASA)&quot;.
              </p>
            </div>
            <span className="text-[11px] font-mono-kasa text-muted-foreground shrink-0">
              {perClient.length} {perClient.length === 1 ? "registro" : "registros"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Visualização Desktop: Tabela clássica refinada */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground font-mono-kasa uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground font-mono-kasa uppercase tracking-wider">Receita</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground font-mono-kasa uppercase tracking-wider">Custos</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground font-mono-kasa uppercase tracking-wider">Margem (R$)</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground font-mono-kasa uppercase tracking-wider">Margem (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perClient.map((c) => {
                  const isUnlinked = c.id === "__none__";
                  const tone =
                    c.receita === 0 ? "muted" :
                    c.margemPct >= 75 ? "emerald" : "rose";

                  return (
                    <TableRow key={c.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-xs text-foreground py-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[240px]">{c.name}</span>
                          {c.receita > 0 && (
                            <span className={`inline-block size-1.5 rounded-full shrink-0 ${
                              tone === "emerald" ? "bg-emerald-500" : "bg-rose-500"
                            }`} />
                          )}
                          {isUnlinked && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUnlinkedModalOpen(true)}
                              className="h-6 px-2 text-[10px] font-mono-kasa rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300 gap-1 ml-1"
                            >
                              <Link2 className="size-2.5" />
                              Auditar / Vincular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono-kasa text-xs py-3">{brl(c.receita)}</TableCell>
                      <TableCell className="text-right tabular-nums font-mono-kasa text-xs text-muted-foreground py-3">{brl(c.despesa)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-mono-kasa text-xs font-semibold py-3 ${c.margemAbs >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {brl(c.margemAbs)}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {c.receita > 0 ? (
                          <Badge variant="outline" className={`font-mono-kasa text-[11px] tabular-nums ${
                            tone === "emerald" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" :
                            "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                          }`}>{c.margemPct.toFixed(1)}%</Badge>
                        ) : <span className="text-muted-foreground/40 font-mono-kasa">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {perClient.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs font-mono-kasa">
                      Sem dados financeiros no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Visualização Mobile: Cartões Executivos Compactos */}
          <div className="block md:hidden divide-y divide-border/60">
            {perClient.map((c) => {
              const isUnlinked = c.id === "__none__";
              const tone =
                c.receita === 0 ? "muted" :
                c.margemPct >= 75 ? "emerald" : "rose";

              const clampedMargem = Math.max(0, Math.min(100, c.margemPct));

              return (
                <div key={c.id} className="p-3.5 space-y-2.5 hover:bg-muted/20 transition-colors">
                  {/* Linha 1: Nome do Cliente + Badge de Margem */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-xs text-foreground truncate">{c.name}</span>
                      {isUnlinked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUnlinkedModalOpen(true)}
                          className="h-5 px-1.5 text-[9px] font-mono-kasa rounded-md border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 gap-1 shrink-0"
                        >
                          <Link2 className="size-2.5" />
                          Auditar / Vincular
                        </Button>
                      )}
                    </div>
                    {c.receita > 0 ? (
                      <Badge variant="outline" className={`font-mono-kasa text-[10px] tabular-nums shrink-0 ${
                        tone === "emerald" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" :
                        "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                      }`}>
                        {c.margemPct.toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40 font-mono-kasa text-[10px]">—</span>
                    )}
                  </div>

                  {/* Linha 2: Grid 3 Colunas com Receita, Custo e Margem Líquida */}
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted/40 border border-border/40 font-mono-kasa text-[11px] tabular-nums">
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Receita</span>
                      <span className="font-medium text-foreground">{brl(c.receita)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Custos</span>
                      <span className="text-muted-foreground">{brl(c.despesa)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Margem R$</span>
                      <span className={`font-bold ${c.margemAbs >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {brl(c.margemAbs)}
                      </span>
                    </div>
                  </div>

                  {/* Linha 3: Barra Visual de Margem (se houver receita) */}
                  {c.receita > 0 && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            tone === "emerald" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${clampedMargem}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {perClient.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-xs font-mono-kasa">
                Sem dados financeiros no período.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Conciliação Rápida */}
      <UnlinkedTransactionsDialog
        open={unlinkedModalOpen}
        onOpenChange={setUnlinkedModalOpen}
        transactions={transactions}
        clients={clients}
      />
    </div>
  );
}

// ── helpers visuais ───────────────────────────────────────────────────
function ChartCard({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`rounded-xl border-border/80 shadow-xs ${className}`}>
      <CardHeader className="pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-3.5 text-primary shrink-0" />}
          <CardTitle className="text-xs font-semibold font-mono-kasa uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

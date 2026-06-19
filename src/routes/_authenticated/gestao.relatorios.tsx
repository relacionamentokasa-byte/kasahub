import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
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
} from "lucide-react";
import { fetchTransactions } from "@/lib/finance-api";
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

  const { data: transactions = [], isLoading: tLoading } = useQuery({
    queryKey: ["gestao-relatorios", "transactions", startDate, endDate],
    queryFn: () => fetchTransactions({ startDate, endDate }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  // ── Evolução mensal ────────────────────────────────────────────────
  const monthly = useMemo(() => {
    const map = new Map<string, { mes: string; receita: number; despesaOp: number; despesaProLabore: number; despesaNaoOp: number; lucro: number }>();
    months.forEach((k) => map.set(k, { mes: monthLabel(k), receita: 0, despesaOp: 0, despesaProLabore: 0, despesaNaoOp: 0, lucro: 0 }));

    transactions.forEach((t: any) => {
      const ref = t.payment_date || t.due_date;
      if (!ref) return;
      const key = ref.slice(0, 7);
      const bucket = map.get(key);
      if (!bucket) return;
      const amount = Number(t.paid_value ?? t.valor_real ?? t.amount) || 0;
      const isProLabore = t.category === PRO_LABORE_CATEGORY || t.category === DISTRIBUTION_CATEGORY;
      if (t.type === "income") {
        bucket.receita += amount;
      } else {
        if (t.nature === "nao_operacional") bucket.despesaNaoOp += amount;
        else if (isProLabore) bucket.despesaProLabore += amount;
        else bucket.despesaOp += amount;
      }
    });

    map.forEach((b) => {
      const desp = b.despesaOp + (includeProLabore ? b.despesaProLabore : 0) + (includeNonOp ? b.despesaNaoOp : 0);
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
    const margem = t.receita > 0 ? (t.lucro / t.receita) * 100 : 0;
    return { ...t, margem };
  }, [monthly]);

  // ── Por cliente: receita, custo, margem ────────────────────────────
  const perClient = useMemo(() => {
    const map = new Map<string, { id: string; name: string; receita: number; despesa: number }>();
    const ensure = (id: string | null, fallbackName = "Sem cliente vinculado") => {
      const key = id || "__none__";
      if (!map.has(key)) {
        const c = clients.find((c: any) => c.id === id);
        map.set(key, { id: key, name: c?.company || c?.name || fallbackName, receita: 0, despesa: 0 });
      }
      return map.get(key)!;
    };

    transactions.forEach((t: any) => {
      const amount = Number(t.paid_value ?? t.valor_real ?? t.amount) || 0;
      const bucket = ensure(t.client_id);
      if (t.type === "income") bucket.receita += amount;
      else {
        if (t.nature === "nao_operacional" && !includeNonOp) return;
        const isProLabore = t.category === PRO_LABORE_CATEGORY || t.category === DISTRIBUTION_CATEGORY;
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
    return <div className="p-8 text-foreground/50">Carregando relatórios…</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-reveal">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground mb-2">
            <ArrowLeft className="size-3" /> Dashboard
          </Link>
          <span className="text-primary text-[10px] font-mono-kasa uppercase font-medium">Gestão · Inteligência</span>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1">Relatórios</h1>
          <p className="text-foreground/50 text-xs lg:text-sm mt-1">Evolução financeira, rentabilidade e indicadores de clientes.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface">
            <Switch id="non-op" checked={includeNonOp} onCheckedChange={setIncludeNonOp} />
            <Label htmlFor="non-op" className="text-xs cursor-pointer">Incluir despesas não-operacionais</Label>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface">
            <Switch id="pro-labore" checked={includeProLabore} onCheckedChange={setIncludeProLabore} />
            <Label htmlFor="pro-labore" className="text-xs cursor-pointer">Incluir pró-labore / distribuição</Label>
          </div>
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-full sm:w-[180px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
              <SelectItem value="ytd">Ano corrente</SelectItem>
              <SelectItem value="year">Últimos 12 meses (móvel)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* KPIs gerais do período */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard icon={TrendingUp} label="Faturamento" value={brl(totals.receita)} color="emerald" />
        <KpiCard icon={TrendingDown} label="Despesa operacional" value={brl(totals.despesaOp)} color="rose"
                 sub={includeNonOp ? `Não-op: ${brl(totals.despesaNaoOp)}` : undefined} />
        <KpiCard icon={Wallet} label="Lucro do período" value={brl(totals.lucro)} color={totals.lucro >= 0 ? "blue" : "rose"} />
        <KpiCard icon={Percent} label="Margem média" value={`${totals.margem.toFixed(1)}%`}
                 color={totals.margem >= 30 ? "emerald" : totals.margem >= 15 ? "amber" : "rose"} />
      </div>

      {/* Gráficos de evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Evolução do faturamento">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <RTooltip formatter={(v: any) => brl(Number(v))} />
              <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--primary))" fill="url(#gradRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolução das despesas">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <RTooltip formatter={(v: any) => brl(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="despesaOp" stackId="d" name="Operacional" fill="hsl(0 72% 51%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="despesaNaoOp" stackId="d" name="Não-operacional" fill="hsl(25 80% 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolução do lucro" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <RTooltip formatter={(v: any) => brl(Number(v))} />
              <Line type="monotone" dataKey="receita" name="Receita" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="despesaOp" name="Despesa op." stroke="hsl(0 72% 51%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bloco de Clientes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard icon={Users} label="Clientes ativos" value={String(clientStats.activeClients)} color="blue" />
        <KpiCard icon={Wallet} label="MRR (recorrente)" value={brl(clientStats.mrr)} color="emerald" />
        <KpiCard icon={AlertTriangle} label="Concentração top 5" value={`${clientStats.concentracao.toFixed(1)}%`}
                color={clientStats.concentracao > 60 ? "rose" : clientStats.concentracao > 40 ? "amber" : "emerald"}
                sub={clientStats.concentracao > 60 ? "Alto risco" : clientStats.concentracao > 40 ? "Atenção" : "Saudável"} />
        <KpiCard icon={Users} label="Tempo médio relacionamento" value={`${clientStats.tempoMedio.toFixed(1)} m`} color="blue" />
      </div>

      <ChartCard title="Top 10 clientes por receita no período">
        <ResponsiveContainer width="100%" height={Math.max(220, top10ClientesChart.length * 32)}>
          <BarChart data={top10ClientesChart} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
            <RTooltip formatter={(v: any) => brl(Number(v))} />
            <Bar dataKey="Receita" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tabela P&L por cliente */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Rentabilidade por cliente</CardTitle>
          <p className="text-xs text-foreground/50">
            Receita menos despesas vinculadas ao cliente no período. Despesas sem cliente vinculado aparecem agrupadas em "Sem cliente vinculado" — para refinar a margem real, vincule despesas/DMEs/parceiros ao cliente.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead className="text-right">Margem (R$)</TableHead>
                  <TableHead className="text-right">Margem (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perClient.map((c) => {
                  const tone =
                    c.receita === 0 ? "muted" :
                    c.margemPct >= 40 ? "emerald" :
                    c.margemPct >= 20 ? "amber" : "rose";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(c.receita)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(c.despesa)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${c.margemAbs >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {brl(c.margemAbs)}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.receita > 0 ? (
                          <Badge variant="outline" className={
                            tone === "emerald" ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10" :
                            tone === "amber" ? "border-amber-500/40 text-amber-700 bg-amber-500/10" :
                            tone === "rose" ? "border-rose-500/40 text-rose-700 bg-rose-500/10" : ""
                          }>{c.margemPct.toFixed(1)}%</Badge>
                        ) : <span className="text-foreground/30">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {perClient.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-foreground/40 py-8">
                      Sem dados financeiros no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── helpers visuais ───────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, sub, color = "primary",
}: {
  icon: any; label: string; value: string; sub?: string;
  color?: "primary" | "emerald" | "rose" | "amber" | "blue";
}) {
  const palette: Record<string, { bg: string; border: string; icon: string; accent: string }> = {
    primary: { bg: "from-primary/10 to-transparent", border: "border-primary/30", icon: "text-primary", accent: "text-primary" },
    emerald: { bg: "from-emerald-500/15 to-transparent", border: "border-emerald-500/30", icon: "text-emerald-600", accent: "text-emerald-700" },
    rose:    { bg: "from-rose-500/15 to-transparent",    border: "border-rose-500/30",    icon: "text-rose-600",    accent: "text-rose-700" },
    amber:   { bg: "from-amber-500/15 to-transparent",   border: "border-amber-500/30",   icon: "text-amber-600",   accent: "text-amber-700" },
    blue:    { bg: "from-blue-500/15 to-transparent",    border: "border-blue-500/30",    icon: "text-blue-600",    accent: "text-blue-700" },
  };
  const c = palette[color];
  return (
    <div className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-4 lg:p-5 flex flex-col gap-3 min-h-[110px] transition-all hover:shadow-md`}>
      <div className={`size-9 rounded-lg bg-background/60 border ${c.border} flex items-center justify-center`}>
        <Icon className={`size-4 ${c.icon}`} />
      </div>
      <div>
        <p className={`text-[12px] font-semibold ${c.accent}`}>{label}</p>
        <p className="text-[22px] lg:text-[26px] font-bold tracking-tight text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-foreground/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`rounded-2xl ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground/80">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

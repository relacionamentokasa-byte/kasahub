import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Lock, TrendingUp, Users, Repeat, Wallet, Target } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { fetchCurrentUserRoles, hasAnyRole } from "@/lib/roles-api";
import {
  brl,
  cashflowByMonth,
  computeIndicators,
  fetchBankAccounts,
  fetchContracts,
  fetchTransactions,
  accountBalance,
} from "@/lib/finance-api";
import { fetchClients, fetchJobs } from "@/lib/ops-api";

export const Route = createFileRoute("/_authenticated/ceo")({
  head: () => ({ meta: [{ title: "Painel CEO — KASA OS" }] }),
  component: CeoPage,
});

function CeoPage() {
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles", "me"],
    queryFn: fetchCurrentUserRoles,
  });
  const allowed = hasAnyRole(roles, ["admin", "ceo"]);

  const { data: txs = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions(), enabled: allowed });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts(), enabled: allowed });
  const { data: accounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: fetchBankAccounts, enabled: allowed });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients, enabled: allowed });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => fetchJobs(), enabled: allowed });

  if (rolesLoading) {
    return <div className="p-10 text-sm text-foreground/50">Verificando permissões…</div>;
  }
  if (!allowed) {
    return (
      <div className="min-h-full grid place-items-center p-10">
        <div className="max-w-md text-center bg-surface border border-border rounded-2xl p-10">
          <div className="size-14 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
            <Lock className="size-6" />
          </div>
          <h2 className="font-display text-xl font-bold">Acesso restrito</h2>
          <p className="text-sm text-foreground/60 mt-2">
            O Painel CEO está disponível apenas para perfis <strong>admin</strong> e <strong>ceo</strong>.
          </p>
          <Link to="/" className="inline-block mt-6 text-primary text-sm font-medium hover:underline">
            Voltar ao painel principal
          </Link>
        </div>
      </div>
    );
  }

  const ind = computeIndicators(txs, contracts);
  const chart = cashflowByMonth(txs, 12).map((m) => ({ ...m, result: m.income - m.expense }));
  const consolidated = accounts.reduce((s, a) => s + accountBalance(a, txs), 0);

  const yearIncome = txs.filter((t) => t.kind === "income" && t.due_date.slice(0, 4) === String(new Date().getFullYear())).reduce((s, t) => s + Number(t.amount), 0);
  const yearExpense = txs.filter((t) => t.kind === "expense" && t.due_date.slice(0, 4) === String(new Date().getFullYear())).reduce((s, t) => s + Number(t.amount), 0);
  const margin = yearIncome > 0 ? ((yearIncome - yearExpense) / yearIncome) * 100 : 0;

  const topClients = clients.map((c) => {
    const total = txs.filter((t) => t.client_id === c.id && t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
    const mrr = contracts.filter((ct) => ct.client_id === c.id && ct.status === "active").reduce((s, ct) => s + Number(ct.monthly_value), 0);
    return { c, total, mrr, score: total + mrr * 12 };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);

  const activeClients = new Set(contracts.filter((c) => c.status === "active").map((c) => c.client_id)).size;
  const totalClients = clients.length;
  const churnRisk = totalClients - activeClients;

  const pieData = [
    { name: "Recorrente", value: ind.mrr },
    { name: "Extra mês", value: ind.extraThisMonth },
  ];
  const pieColors = ["#FFBC45", "#22C55E"];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
            <Crown className="size-6" />
          </div>
          <div>
            <span className="text-primary text-[10px] capitalize">Restrito · CEO</span>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">Painel CEO</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10 space-y-6">
        {/* Hero KPIs */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6 bg-primary text-primary-foreground rounded-2xl p-8 relative overflow-hidden">
            <div className="kasa-pattern absolute inset-0 opacity-25" />
            <div className="relative">
              <span className="text-primary-foreground/70 text-[10px] capitalize font-bold">MRR · Receita recorrente</span>
              <div className="font-display text-6xl lg:text-7xl font-bold tracking-tighter leading-none mt-3">{brl(ind.mrr)}</div>
              <p className="text-primary-foreground/70 text-sm mt-3">ARR projetado · {brl(ind.arr)}</p>
            </div>
          </div>
          <CeoKpi label="Saldo consolidado" value={brl(consolidated)} icon={<Wallet className="size-4" />} />
          <CeoKpi label="Resultado anual" value={brl(yearIncome - yearExpense)} icon={<TrendingUp className="size-4" />} tone={yearIncome - yearExpense >= 0 ? "success" : "danger"} />
          <CeoKpi label="Margem líquida" value={`${margin.toFixed(1)}%`} icon={<Target className="size-4" />} />
          <CeoKpi label="Clientes ativos" value={String(activeClients)} icon={<Users className="size-4" />} hint={`de ${totalClients} cadastrados`} />
          <CeoKpi label="Ticket recorrente" value={brl(ind.ticketRecurrente)} icon={<Repeat className="size-4" />} />
          <CeoKpi label="Em risco de churn" value={String(churnRisk)} icon={<Users className="size-4" />} tone={churnRisk > 0 ? "danger" : undefined} hint="sem contrato ativo" />
        </div>

        {/* Cashflow chart year */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 bg-surface border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold">Resultado dos últimos 12 meses</h2>
            <p className="text-xs text-foreground/50 mb-4">Receita, despesa e resultado líquido</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="incFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" stroke="rgba(244,247,245,0.5)" fontSize={11} />
                  <YAxis stroke="rgba(244,247,245,0.5)" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#142124", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
                    formatter={(v: number) => brl(v)}
                  />
                  <Area type="monotone" dataKey="income" stroke="#22C55E" fill="url(#incFill)" strokeWidth={2} name="Receita" />
                  <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="url(#expFill)" strokeWidth={2} name="Despesa" />
                  <Area type="monotone" dataKey="result" stroke="#FFBC45" fill="transparent" strokeWidth={2.5} name="Resultado" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-surface border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold">Mix de receita</h2>
            <p className="text-xs text-foreground/50 mb-4">Recorrente vs extra (mês)</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "#142124", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top clients */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Top clientes por LTV</h2>
              <p className="text-xs text-foreground/50">Receita acumulada + ARR projetado</p>
            </div>
          </div>
          {topClients.length === 0 ? (
            <div className="text-sm text-foreground/50 py-8 text-center">Sem receita registrada por cliente ainda.</div>
          ) : (
            <div className="space-y-3">
              {topClients.map(({ c, total, mrr, score }, idx) => {
                const max = topClients[0].score;
                const pct = (score / max) * 100;
                return (
                  <div key={c.id} className="flex items-center gap-4">
                    <div className="w-6 text-center text-xs text-foreground/40">{String(idx + 1).padStart(2, "0")}</div>
                    <div className="min-w-[180px] truncate font-medium">{c.company || c.name}</div>
                    <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-foreground/50 hidden md:block w-24 text-right">MRR {brl(mrr)}</div>
                    <div className="text-xs text-foreground/50 hidden md:block w-28 text-right">Hist. {brl(total)}</div>
                    <div className="font-display font-bold w-32 text-right">{brl(score)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-[10px] capitalize text-foreground/30 text-center">
          {jobs.length} jobs · {clients.length} clientes · dados em tempo real
        </div>
      </div>
    </div>
  );
}

function CeoKpi({ label, value, icon, tone, hint }: { label: string; value: string; icon?: React.ReactNode; tone?: "success" | "danger"; hint?: string }) {
  const cls = tone === "success" ? "text-emerald-400" : tone === "danger" ? "text-rose-400" : "text-foreground";
  return (
    <div className="col-span-6 lg:col-span-3 bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between text-[10px] capitalize text-foreground/50">
        <span>{label}</span>{icon}
      </div>
      <div className={`mt-3 font-display text-2xl font-bold ${cls}`}>{value}</div>
      {hint && <div className="text-[10px] text-foreground/40 mt-1">{hint}</div>}
    </div>
  );
}

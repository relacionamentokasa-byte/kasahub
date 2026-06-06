import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ArrowUpRight,
  Plus,
  Users,
  Target,
  Wallet,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  brl,
  cashflowByMonth,
  computeIndicators,
  fetchBankAccounts,
  fetchContracts,
  fetchTransactions,
  accountBalance,
} from "@/lib/finance-api";
import { fetchClients, fetchJobs, fetchJobStages } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Painel Principal — KASA OS" },
      { name: "description", content: "Painel executivo da Kasa Marketing Consultoria." },
    ],
  }),
  component: Dashboard,
});

async function fetchLeads() {
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
async function fetchLeadStages() {
  const { data, error } = await supabase.from("lead_stages").select("*").order("order_index");
  if (error) throw error;
  return data ?? [];
}

function Dashboard() {
  const { data: txs = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions() });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: accounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: fetchBankAccounts });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => fetchJobs() });
  const { data: jobStages = [] } = useQuery({ queryKey: ["job_stages"], queryFn: fetchJobStages });
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: leadStages = [] } = useQuery({ queryKey: ["lead_stages"], queryFn: fetchLeadStages });

  const ind = computeIndicators(txs, contracts);
  const consolidated = accounts.reduce((s, a) => s + accountBalance(a, txs), 0);
  const chart = cashflowByMonth(txs, 6).map((m) => ({ mes: m.label, atual: m.income, despesa: m.expense }));

  const activeClients = new Set(contracts.filter((c) => c.status === "active").map((c) => c.client_id)).size;
  const wonStageId = leadStages.find((s) => s.is_won)?.id;
  const funnel = leadStages.slice(0, 4).map((s) => ({
    label: s.name,
    value: leads.filter((l) => l.stage_id === s.id).length,
    accent: s.id === wonStageId,
  }));

  const clientName = (id: string | null | undefined) => clients.find((c) => c.id === id)?.company || clients.find((c) => c.id === id)?.name || "—";
  const stageName = (id: string | null | undefined) => jobStages.find((s) => s.id === id)?.name || "—";

  const todayIso = new Date().toISOString().slice(0, 10);
  const pendingJobs = jobs.filter((j) => !j.done_at).slice(0, 6);
  const urgentCount = jobs.filter((j) => j.priority === "urgent" && !j.done_at).length;

  // Goal: arbitrary monthly target = 1.2x previous month income
  const prevMonth = chart.length >= 2 ? chart[chart.length - 2].atual : 0;
  const goal = Math.max(prevMonth * 1.2, ind.monthIncome);
  const goalPct = goal > 0 ? Math.min(100, Math.round((ind.monthIncome / goal) * 100)) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-reveal">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa capitalize font-medium">
            Visão Executiva · {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-2">
            Painel da agência
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/relatorios">
            <Button variant="ghost" className="h-9 text-foreground/70 hover:text-foreground hover:bg-white/5">
              Relatórios
            </Button>
          </Link>
          <Link to="/propostas">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold gap-2 h-9 px-4">
              <Plus className="size-4" /> Nova proposta
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Hero faturamento */}
        <section className="col-span-12 lg:col-span-6 row-span-2 bg-primary rounded-2xl p-8 relative overflow-hidden min-h-[280px] flex flex-col justify-between">
          <div className="kasa-pattern absolute inset-0 opacity-25" />
          <div className="relative flex justify-between items-start">
            <span className="text-primary-foreground/70 font-mono-kasa text-[10px] capitalize font-bold">
              Faturamento do mês
            </span>
            <span className="bg-primary-foreground/15 text-primary-foreground px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-kasa">
              {ind.monthResult >= 0 ? "+" : ""}{brl(ind.monthResult)}
            </span>
          </div>
          <div className="relative">
            <h2 className="font-display text-6xl lg:text-7xl font-bold text-primary-foreground tracking-tighter leading-none">
              {brl(ind.monthIncome)}
            </h2>
            <p className="text-primary-foreground/70 text-sm mt-3 font-medium">
              {activeClients} cliente(s) ativos · MRR {brl(ind.mrr)} · Extra {brl(ind.extraThisMonth)}
            </p>

          </div>
        </section>

        <KpiCard icon={Wallet} label="Saldo consolidado" value={brl(consolidated)} sub={`${accounts.length} conta(s)`} />
        <KpiCard icon={Users} label="Clientes ativos" value={String(activeClients)} sub={`${clients.length} cadastrados`} />

        {/* Goal */}
        <section className="col-span-12 lg:col-span-6 bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono-kasa capitalize text-foreground/40">
              Meta x Realizado · mês
            </span>
            <span className="text-[10px] font-mono-kasa text-primary font-semibold">{goalPct}%</span>
          </div>
          <div className="h-2.5 bg-background rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-[width] duration-700" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-mono-kasa text-foreground/40">
            <span>R$ 0</span>
            <span>{brl(ind.monthIncome)} realizado</span>
            <span>{brl(goal)}</span>
          </div>
        </section>

        {/* Jobs */}
        <section className="col-span-12 lg:col-span-5 row-span-2 bg-surface border border-border rounded-2xl flex flex-col min-h-[420px]">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="font-display text-lg font-bold">Pauta operacional</h3>
              <p className="text-[10px] font-mono-kasa text-foreground/40 capitalize mt-0.5">
                {pendingJobs.length} tarefas pendentes · {urgentCount} urgentes
              </p>
            </div>
            <Link to="/jobs">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:bg-primary/10 hover:text-primary">
                Ver todos <ArrowUpRight className="size-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {pendingJobs.length === 0 && (
              <div className="text-center text-sm text-foreground/40 py-10">Sem tarefas pendentes.</div>
            )}
            {pendingJobs.map((job) => {
              const overdue = job.due_date && job.due_date < todayIso;
              return (
                <div key={job.id} className="p-3 rounded-lg hover:bg-white/[0.03] transition-colors flex items-start gap-3 border-l-2 border-transparent hover:border-primary">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{job.title}</p>
                    <p className="text-[10px] text-foreground/40 mt-1">{clientName(job.client_id)} · {stageName(job.stage_id)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-mono-kasa font-semibold px-2 py-0.5 rounded-full border ${
                      job.priority === "urgent" ? "bg-rose-400/15 text-rose-300 border-rose-400/30" :
                      job.priority === "high" ? "bg-orange-400/15 text-orange-300 border-orange-400/30" :
                      "bg-primary/15 text-primary border-primary/30"
                    }`}>
                      {job.priority}
                    </span>
                    {overdue && <span className="text-[10px] text-rose-400">Atrasado</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cashflow chart */}
        <section className="col-span-12 lg:col-span-7 bg-surface border border-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-lg font-bold">Evolução de receita</h3>
              <p className="text-[10px] font-mono-kasa text-foreground/40 capitalize mt-0.5">
                Últimos 6 meses
              </p>
            </div>
          </div>
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="atualFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFBC45" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FFBC45" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "rgba(244,247,245,0.4)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(244,247,245,0.4)", fontSize: 11 }} width={44} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ background: "#142124", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#FFBC45", fontWeight: 600 }}
                  formatter={(v: number) => brl(v)}
                />
                <Area type="monotone" dataKey="despesa" stroke="rgba(244,68,86,0.6)" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" name="Despesa" />
                <Area type="monotone" dataKey="atual" stroke="#FFBC45" strokeWidth={2.5} fill="url(#atualFill)" name="Receita" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* CRM funnel */}
        <section className="col-span-12 lg:col-span-7 grid grid-cols-4 gap-3">
          {funnel.map((s) => (
            <div
              key={s.label}
              className={`rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors border ${
                s.accent ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border hover:border-primary/40"
              }`}
            >
              <span className={`text-[10px] font-mono-kasa capitalize mb-1 font-semibold ${s.accent ? "opacity-70" : "text-foreground/40"}`}>
                {s.label}
              </span>
              <span className="text-2xl font-display font-bold tabular-nums">{String(s.value).padStart(2, "0")}</span>
            </div>
          ))}
        </section>

        {/* Alerts */}
        <section className="col-span-12 lg:col-span-5 bg-surface border border-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-display text-lg font-bold">Alertas</h3>
            <span className="text-[10px] font-mono-kasa text-foreground/40 capitalize">tempo real</span>
          </div>
          <div className="space-y-3">
            {ind.overdueCount > 0 && (
              <Alert color="rose" icon={<AlertTriangle className="size-4" />} title={`${ind.overdueCount} lançamentos em atraso`} hint={brl(ind.overdueAmount)} />
            )}
            {urgentCount > 0 && (
              <Alert color="orange" icon={<Target className="size-4" />} title={`${urgentCount} tarefas urgentes na pauta`} />
            )}
            {leads.length > 0 && (
              <Alert color="primary" icon={<TrendingUp className="size-4" />} title={`${leads.length} leads no funil`} hint={brl(leads.reduce((s, l) => s + Number(l.value), 0))} />
            )}
            {ind.overdueCount === 0 && urgentCount === 0 && leads.length === 0 && (
              <p className="text-sm text-foreground/40">Tudo em dia. Hora de gerar mais oportunidades.</p>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="col-span-12 bg-surface border border-border rounded-2xl p-6 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center">
              <Briefcase className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold">Acompanhe sua operação</h3>
              <p className="text-sm text-foreground/60 mt-0.5">
                Veja propostas, projetos e o financeiro consolidado em tempo real.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/financeiro">
              <Button variant="ghost" className="h-9 text-foreground/70 hover:text-foreground hover:bg-white/5">
                <Wallet className="size-4 mr-2" /> Financeiro
              </Button>
            </Link>
            <Link to="/projetos">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-full font-semibold">
                Ver projetos
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Alert({ color, icon, title, hint }: { color: "rose" | "orange" | "primary"; icon: React.ReactNode; title: string; hint?: string }) {
  const cls = color === "rose" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" :
              color === "orange" ? "border-orange-500/30 bg-orange-500/10 text-orange-300" :
              "border-primary/30 bg-primary/10 text-primary";
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${cls}`}>
      {icon}
      <div className="flex-1 text-sm">{title}</div>
      {hint && <div className="text-xs opacity-80">{hint}</div>}
    </div>
  );
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}

function KpiCard({ icon: Icon, label, value, sub }: KpiCardProps) {
  return (
    <section className="col-span-6 lg:col-span-3 bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[136px] hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="size-8 rounded-lg bg-background/60 border border-border flex items-center justify-center">
          <Icon className="size-4 text-foreground/60" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-mono-kasa text-foreground/40 capitalize mb-1">{label}</p>
        <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-foreground/40 mt-0.5">{sub}</p>}
      </div>
    </section>
  );
}

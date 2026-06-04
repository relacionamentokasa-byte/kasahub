import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  Users,
  Target,
  Wallet,
  Briefcase,
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

export const Route = createFileRoute("/_shell/")({
  head: () => ({
    meta: [
      { title: "Dashboard — KASA OS" },
      { name: "description", content: "Painel executivo da Kasa Marketing Consultoria." },
    ],
  }),
  component: Dashboard,
});

const revenueData = [
  { mes: "Mai", atual: 198, anterior: 162 },
  { mes: "Jun", atual: 214, anterior: 178 },
  { mes: "Jul", atual: 232, anterior: 184 },
  { mes: "Ago", atual: 248, anterior: 201 },
  { mes: "Set", atual: 261, anterior: 218 },
  { mes: "Out", atual: 284, anterior: 230 },
];

const jobs = [
  { title: "Identidade Visual — Stella Coffee", owner: "Bia Santos", label: "Design", priority: "Urgente" },
  { title: "Setup Meta Ads — Alpha Group", owner: "Marcos Júnior", label: "Tráfego", priority: "Hoje" },
  { title: "Copy landing — Fintech Nova", owner: "Renata Lima", label: "Copy", priority: "Hoje" },
  { title: "Cronograma editorial Novembro", owner: "Carla Mendes", label: "Planejamento", priority: "Esta semana" },
  { title: "Aprovação carrossel — EcoLife", owner: "João Pedro", label: "Aprovação", priority: "Esta semana" },
  { title: "Briefing Rebrand — TechStream", owner: "Lucas Andrade", label: "Planejamento", priority: "Esta semana" },
];

const labelColors: Record<string, string> = {
  Design: "bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/20",
  Tráfego: "bg-sky-400/15 text-sky-300 border-sky-400/20",
  Copy: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
  Planejamento: "bg-primary/15 text-primary border-primary/30",
  Aprovação: "bg-orange-400/15 text-orange-300 border-orange-400/20",
};

const activities = [
  { who: "Gustavo Lima", what: "mencionou você em", target: "#Rebrand-TechStream", time: "há 12 min", strong: true },
  { who: "Bruno J.", what: "criou um job em", target: "Stella Coffee", time: "há 1 h" },
  { who: "Financeiro", what: "identificou pagamento de", target: "R$ 12.000 · Invoice #882", time: "há 3 h" },
  { who: "Roberta", what: "moveu lead para", target: "Proposta enviada", time: "há 4 h" },
];

function StatPill({ trend, value }: { trend: "up" | "down"; value: string }) {
  const Icon = trend === "up" ? TrendingUp : TrendingDown;
  const cls = trend === "up" ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono-kasa ${cls}`}>
      <Icon className="size-3" />
      {value}
    </span>
  );
}

function Dashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-reveal">
      {/* Header */}
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-[0.25em] font-medium">
            Visão Executiva · Outubro 2024
          </span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-2">
            Bem-vindo de volta, Lucas.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-9 text-foreground/70 hover:text-foreground hover:bg-white/5">
            Exportar relatório
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold gap-2 h-9 px-4">
            <Plus className="size-4" /> Nova proposta
          </Button>
        </div>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Faturamento hero */}
        <section className="col-span-12 lg:col-span-6 row-span-2 bg-primary rounded-2xl p-8 relative overflow-hidden min-h-[280px] flex flex-col justify-between group">
          <div className="kasa-pattern absolute inset-0 opacity-25" />
          <div className="relative flex justify-between items-start">
            <span className="text-primary-foreground/70 font-mono-kasa text-[10px] uppercase tracking-[0.25em] font-bold">
              Faturamento Mensal
            </span>
            <span className="bg-primary-foreground/15 text-primary-foreground px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-kasa">
              +12.4% vs. set
            </span>
          </div>
          <div className="relative">
            <h2 className="font-display text-6xl lg:text-7xl font-bold text-primary-foreground tracking-tighter leading-none">
              R$ 284.400
            </h2>
            <p className="text-primary-foreground/70 text-sm mt-3 font-medium">
              Consolidado · 48 clientes faturados
            </p>
          </div>
        </section>

        {/* Small KPIs */}
        <KpiCard icon={Wallet} label="MRR" value="R$ 142,1k" trend="up" trendValue="+4.1%" />
        <KpiCard icon={Users} label="Clientes Ativos" value="84" trend="up" trendValue="+6" sub="esta semana" />

        {/* Meta */}
        <section className="col-span-12 lg:col-span-6 bg-surface border border-border rounded-2xl p-6 flex items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono-kasa uppercase tracking-[0.2em] text-foreground/40">
                Meta x Realizado · Q4
              </span>
              <span className="text-[10px] font-mono-kasa text-primary font-semibold">84%</span>
            </div>
            <div className="h-2.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-700"
                style={{ width: "84%" }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-mono-kasa text-foreground/40">
              <span>R$ 0</span>
              <span>R$ 294k realizado</span>
              <span>R$ 350k</span>
            </div>
          </div>
        </section>

        {/* Jobs do dia */}
        <section className="col-span-12 lg:col-span-5 row-span-2 bg-surface border border-border rounded-2xl flex flex-col min-h-[420px]">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="font-display text-lg font-bold">Pauta operacional</h3>
              <p className="text-[10px] font-mono-kasa text-foreground/40 uppercase tracking-wider mt-0.5">
                12 jobs pendentes · 3 urgentes
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-primary hover:bg-primary/10 hover:text-primary">
              Ver todos <ArrowUpRight className="size-3 ml-1" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {jobs.map((job) => (
              <div
                key={job.title}
                className="p-3 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group flex items-start gap-3 border-l-2 border-transparent hover:border-primary"
              >
                <div className="size-7 rounded-full bg-background border border-border flex items-center justify-center shrink-0 text-[10px] font-semibold text-foreground/60">
                  {job.owner.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{job.title}</p>
                  <p className="text-[10px] text-foreground/40 mt-1">{job.owner}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-[10px] font-mono-kasa font-semibold px-2 py-0.5 rounded-full border ${
                      labelColors[job.label] ?? "bg-white/5 text-foreground/60 border-white/10"
                    }`}
                  >
                    {job.label}
                  </span>
                  <span className="text-[10px] text-foreground/40">{job.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Revenue chart */}
        <section className="col-span-12 lg:col-span-7 bg-surface border border-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-lg font-bold">Evolução de receita</h3>
              <p className="text-[10px] font-mono-kasa text-foreground/40 uppercase tracking-wider mt-0.5">
                Últimos 6 meses · em R$ mil
              </p>
            </div>
            <div className="flex gap-4 text-[10px] font-mono-kasa uppercase tracking-tighter">
              <div className="flex items-center gap-2">
                <div className="size-2 bg-primary rounded-full" />
                <span className="text-foreground/70">2024</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-2 bg-foreground/20 rounded-full" />
                <span className="text-foreground/40">2023</span>
              </div>
            </div>
          </div>
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="atualFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFBC45" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FFBC45" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(244,247,245,0.4)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(244,247,245,0.4)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "#142124",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    fontFamily: "Onest",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#FFBC45", fontWeight: 600 }}
                  cursor={{ stroke: "rgba(255,188,69,0.3)", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="anterior"
                  stroke="rgba(244,247,245,0.2)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="atual"
                  stroke="#FFBC45"
                  strokeWidth={2.5}
                  fill="url(#atualFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* CRM funnel */}
        <section className="col-span-12 lg:col-span-7 grid grid-cols-4 gap-3">
          {[
            { label: "Leads", value: 156, accent: false },
            { label: "Qualificados", value: 42, accent: false },
            { label: "Propostas", value: 18, accent: false },
            { label: "Fechados", value: 9, accent: true },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors border ${
                s.accent
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface border-border hover:border-primary/40"
              }`}
            >
              <span className={`text-[10px] font-mono-kasa uppercase tracking-wider mb-1 font-semibold ${s.accent ? "opacity-70" : "text-foreground/40"}`}>
                {s.label}
              </span>
              <span className="text-2xl font-display font-bold tabular-nums">
                {String(s.value).padStart(2, "0")}
              </span>
            </div>
          ))}
        </section>

        {/* Atividades */}
        <section className="col-span-12 lg:col-span-5 bg-surface border border-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-display text-lg font-bold">Atividade recente</h3>
            <span className="text-[10px] font-mono-kasa text-foreground/40 uppercase tracking-wider">
              tempo real
            </span>
          </div>
          <div className="space-y-5">
            {activities.map((a, idx) => (
              <div key={idx} className="relative pl-5 border-l border-border last:pb-0">
                <div className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-2 ring-surface ${a.strong ? "bg-primary" : "bg-foreground/30"}`} />
                <p className="text-xs leading-relaxed text-foreground/80">
                  <span className="text-foreground font-semibold">{a.who}</span> {a.what}{" "}
                  <span className="text-primary font-medium">{a.target}</span>
                </p>
                <span className="text-[10px] text-foreground/40 mt-1 block font-mono-kasa">{a.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Próximas entregas */}
        <section className="col-span-12 bg-surface border border-border rounded-2xl p-6 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center">
              <Target className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold">Próxima entrega crítica</h3>
              <p className="text-sm text-foreground/60 mt-0.5">
                Rebrand TechStream · aprovação final em <span className="text-primary font-medium">2 dias</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-9 text-foreground/70 hover:text-foreground hover:bg-white/5">
              <Briefcase className="size-4 mr-2" /> Ver projeto
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-full font-semibold">
              Abrir aprovação
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: "up" | "down";
  trendValue: string;
  sub?: string;
}

function KpiCard({ icon: Icon, label, value, trend, trendValue, sub }: KpiCardProps) {
  return (
    <section className="col-span-6 lg:col-span-3 bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[136px] hover:border-primary/30 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="size-8 rounded-lg bg-background/60 border border-border flex items-center justify-center">
          <Icon className="size-4 text-foreground/60 group-hover:text-primary transition-colors" />
        </div>
        <StatPill trend={trend} value={trendValue} />
      </div>
      <div>
        <p className="text-[10px] font-mono-kasa text-foreground/40 uppercase tracking-wider mb-1">{label}</p>
        <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-foreground/40 mt-0.5">{sub}</p>}
      </div>
    </section>
  );
}

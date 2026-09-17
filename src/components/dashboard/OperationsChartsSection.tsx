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
import { Layers, PieChart as PieIcon, TrendingUp, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/utils-format";

interface OperationsChartsProps {
  jobs: any[];
  clients: any[];
  jobStages?: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  briefing: { label: "Briefing", color: "#94A3B8" },
  backlog: { label: "Novas Demandas", color: "#38BDF8" },
  todo: { label: "A Fazer", color: "#60A5FA" },
  in_progress: { label: "Em Andamento", color: "#F59E0B" },
  review: { label: "Em Aprovação", color: "#A855F7" },
  correction: { label: "Em Correção", color: "#EC4899" },
  done: { label: "Concluídos", color: "#10B981" },
  paused: { label: "Pausados", color: "#64748B" },
};

const PIE_COLORS = [
  "#FFBC45", // Amber/Gold Kasa
  "#38BDF8", // Sky Blue
  "#10B981", // Emerald
  "#A855F7", // Purple
  "#EC4899", // Pink
  "#64748B", // Slate
];

export function OperationsChartsSection({ jobs = [], clients = [] }: OperationsChartsProps) {
  // 1. Dados para o Gráfico de Colunas: Distribuição de Jobs por Status/Fase
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      backlog: 0,
      in_progress: 0,
      correction: 0,
      review: 0,
      done: 0,
    };

    jobs.forEach((j) => {
      const s = j.status || "backlog";
      if (j.done_at || s === "done" || s === "completed") {
        counts.done += 1;
      } else if (s === "correction" || s === "alteracao") {
        counts.correction += 1;
      } else if (s === "review" || s === "aprovacao") {
        counts.review += 1;
      } else if (s === "in_progress" || s === "doing" || s === "execucao") {
        counts.in_progress += 1;
      } else {
        counts.backlog += 1;
      }
    });

    return [
      { name: "Novas", count: counts.backlog, fill: "#38BDF8", label: "Novas" },
      { name: "Em Execução", count: counts.in_progress, fill: "#F59E0B", label: "Em Ação" },
      { name: "Correção", count: counts.correction, fill: "#EC4899", label: "Correção" },
      { name: "Aprovação", count: counts.review, fill: "#A855F7", label: "Aprovação" },
      { name: "Concluídos", count: counts.done, fill: "#10B981", label: "Entregues" },
    ];
  }, [jobs]);

  // 2. Dados para o Gráfico Donut/Pizza: Concentração de Jobs por Cliente Top 5 + Outros
  const clientDistributionData = useMemo(() => {
    const clientMap = new Map<string, { name: string; count: number }>();
    const clientsLookup = new Map(clients.map((c) => [c.id, c.company || c.name || "Cliente"]));

    jobs.forEach((j) => {
      if (!j.client_id) return;
      const clientName = clientsLookup.get(j.client_id) || "Outros";
      const existing = clientMap.get(j.client_id) || { name: clientName, count: 0 };
      existing.count += 1;
      clientMap.set(j.client_id, existing);
    });

    const sorted = Array.from(clientMap.values()).sort((a, b) => b.count - a.count);
    const top4 = sorted.slice(0, 4);
    const othersCount = sorted.slice(4).reduce((acc, c) => acc + c.count, 0);

    const result = top4.map((c, i) => ({
      name: c.name,
      value: c.count,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));

    if (othersCount > 0) {
      result.push({
        name: "Outros Clientes",
        value: othersCount,
        color: PIE_COLORS[top4.length % PIE_COLORS.length],
      });
    }

    return result.length > 0
      ? result
      : [{ name: "Sem dados", value: 1, color: "#64748B" }];
  }, [jobs, clients]);

  // 3. Métricas de Saúde de Prazos da Operação
  const slaMetrics = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const activeJobs = jobs.filter((j) => !j.done_at && j.status !== "done" && j.status !== "completed");
    const totalActive = activeJobs.length || 1;

    const overdue = activeJobs.filter((j) => j.due_date && j.due_date < todayIso).length;
    const dueToday = activeJobs.filter((j) => j.due_date === todayIso).length;
    const onTime = activeJobs.filter((j) => !j.due_date || j.due_date > todayIso).length;

    const onTimePercent = Math.round((onTime / totalActive) * 100);

    return {
      overdue,
      dueToday,
      onTime,
      totalActive: activeJobs.length,
      onTimePercent,
    };
  }, [jobs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <TrendingUp className="size-3.5 text-primary" /> Análise Operacional & Entregas
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Gráfico 1: Barras Verticais de Jobs por Status (7 Colunas) */}
        <Card className="lg:col-span-7 bg-card border-border/70 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                <Layers className="size-4 text-primary" /> Volume de Jobs por Fase
              </h4>
              <p className="text-xs text-muted-foreground font-mono-kasa mt-0.5">
                Distribuição da carga de trabalho em tempo real
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono-kasa">
              <span className="text-muted-foreground">Total:</span>
              <strong className="text-foreground">{jobs.length} jobs</strong>
            </div>
          </div>

          <div className="h-[210px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  allowDecimals={false}
                  tick={{ fill: "currentColor", fontSize: 10 }}
                  className="text-muted-foreground font-mono-kasa"
                />
                <Tooltip
                  cursor={{ fill: "currentColor", opacity: 0.05 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border/80 px-3 py-2 rounded-lg shadow-lg text-xs font-mono-kasa">
                          <p className="font-bold text-foreground">{data.name}</p>
                          <p className="text-muted-foreground mt-0.5">
                            Quantidade: <strong className="text-primary">{data.count}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-3 border-t border-border/40 text-center font-mono-kasa">
            {statusData.map((s) => (
              <div key={s.name} className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground truncate max-w-full">{s.name}</span>
                <span className="text-xs font-bold text-foreground">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Gráfico 2: Donut / Pizza de Concentração por Cliente + SLA (5 Colunas) */}
        <Card className="lg:col-span-5 bg-card border-border/70 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                <PieIcon className="size-4 text-amber-500" /> Mix de Clientes
              </h4>
              <p className="text-xs text-muted-foreground font-mono-kasa mt-0.5">
                Concentração de demandas ativas
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono-kasa text-muted-foreground">
              <span>No prazo:</span>
              <strong className="text-foreground">{slaMetrics.onTimePercent}%</strong>
            </div>
          </div>

          <div className="h-[170px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {clientDistributionData.map((entry, index) => (
                    <Cell key={`cell-pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border/80 px-3 py-1.5 rounded-lg shadow-md text-xs font-mono-kasa">
                          <span className="font-bold text-foreground">{data.name}</span>:{" "}
                          <span className="text-primary">{data.value} jobs</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold font-display text-foreground leading-none">
                {jobs.length}
              </span>
              <span className="text-[9px] font-mono-kasa text-muted-foreground uppercase mt-0.5">
                Demandas
              </span>
            </div>
          </div>

          {/* Legenda Customizada com barras de proporção */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            {clientDistributionData.slice(0, 3).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-mono-kasa">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-foreground/80 truncate max-w-[150px]">{item.name}</span>
                </div>
                <span className="text-muted-foreground font-bold shrink-0">{item.value} jobs</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

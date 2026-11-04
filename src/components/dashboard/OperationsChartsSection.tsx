import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Layers, PieChart as PieIcon, TrendingUp, CheckCircle2, Clock, AlertTriangle, UserX, AlertOctagon, Flame, Calendar, CheckSquare, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchUsers } from "@/lib/users-api";
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

  // 4. Ranking de Quem Mais Atrasa (Visão por Execução/Checklist vs. Dono do Job)
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [rankingMode, setRankingMode] = useState<"execution" | "job_owner">("execution");

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  // Busca itens de checklist (etapas de execução atribuídas para cada responsável)
  const { data: checklistItems = [] } = useQuery({
    queryKey: ["all-job-checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_checklist")
        .select("id, job_id, content, done, responsible_id, created_at");
      if (error) {
        console.warn("Erro ao carregar checklist para ranking:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 60_000,
  });

  // Lista de meses disponíveis a partir dos jobs
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    jobs.forEach((j) => {
      const date = j.due_date || j.done_at || j.created_at;
      if (date && typeof date === "string" && date.length >= 7) {
        monthsSet.add(date.slice(0, 7)); // Formato YYYY-MM
      }
    });

    const currentYearMonth = new Date().toISOString().slice(0, 7);
    monthsSet.add(currentYearMonth);

    return Array.from(monthsSet).sort().reverse();
  }, [jobs]);

  const overdueRanking = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const usersMap = new Map(users.map((u) => [u.id, u]));

    // Filtra jobs pelo mês selecionado se não for "all"
    const filteredJobs = selectedMonth === "all"
      ? jobs
      : jobs.filter((j) => {
          const date = j.due_date || j.done_at || j.created_at;
          return date && date.startsWith(selectedMonth);
        });

    const filteredJobsMap = new Map(filteredJobs.map((j) => [j.id, j]));

    const statsByUser = new Map<
      string,
      {
        userId: string;
        user: any;
        activeOverdue: number;
        deliveredLate: number;
        totalOverdue: number;
        totalAssigned: number;
        details?: string[];
      }
    >();

    if (rankingMode === "execution") {
      // MODO 1 & 3: Medir por executor real das etapas (Checklist / Produção)
      // Se um job está atrasado ou entregue fora do prazo, avalia os responsáveis pelas etapas
      const checklistByJob = new Map<string, any[]>();
      checklistItems.forEach((c) => {
        if (!c.job_id) return;
        const list = checklistByJob.get(c.job_id) || [];
        list.push(c);
        checklistByJob.set(c.job_id, list);
      });

      filteredJobs.forEach((j) => {
        const isDone = !!j.done_at || j.status === "done" || j.status === "completed";
        const isOverdueActive = !isDone && j.due_date && j.due_date < todayIso;
        const isDeliveredLate = isDone && j.done_at && j.due_date && j.done_at.slice(0, 10) > j.due_date.slice(0, 10);

        if (!isOverdueActive && !isDeliveredLate) return;

        const jobSteps = checklistByJob.get(j.id) || [];
        const pendingStepsWithResp = jobSteps.filter((s) => !s.done && s.responsible_id);

        // Se há etapas pendentes atribuídas no job em atraso, a responsabilidade é de quem travou a etapa
        if (isOverdueActive && pendingStepsWithResp.length > 0) {
          pendingStepsWithResp.forEach((step) => {
            const respId = step.responsible_id!;
            const userObj = usersMap.get(respId);
            const existing = statsByUser.get(respId) || {
              userId: respId,
              user: userObj,
              activeOverdue: 0,
              deliveredLate: 0,
              totalOverdue: 0,
              totalAssigned: 0,
            };
            existing.activeOverdue += 1;
            existing.totalOverdue += 1;
            statsByUser.set(respId, existing);
          });
        } else {
          // Se todas as etapas tinham responsáveis definidos ou não tem checklist específico
          // Atribui aos executores identificados nas etapas
          const assignedInSteps = Array.from(new Set(jobSteps.map((s) => s.responsible_id).filter(Boolean)));
          const targetIds = assignedInSteps.length > 0
            ? assignedInSteps
            : (j.main_responsible_id || j.assignee_id ? [j.main_responsible_id || j.assignee_id] : []);

          targetIds.forEach((respId: string) => {
            const userObj = usersMap.get(respId);
            const existing = statsByUser.get(respId) || {
              userId: respId,
              user: userObj,
              activeOverdue: 0,
              deliveredLate: 0,
              totalOverdue: 0,
              totalAssigned: 0,
            };
            if (isOverdueActive) {
              existing.activeOverdue += 1;
            } else if (isDeliveredLate) {
              existing.deliveredLate += 1;
            }
            existing.totalOverdue += 1;
            statsByUser.set(respId, existing);
          });
        }
      });
    } else {
      // MODO Tradicional: Dono do Job / Responsável Principal
      filteredJobs.forEach((j) => {
        const respId = j.main_responsible_id || j.assignee_id;
        if (!respId) return;

        const userObj = usersMap.get(respId);
        const existing = statsByUser.get(respId) || {
          userId: respId,
          user: userObj,
          activeOverdue: 0,
          deliveredLate: 0,
          totalOverdue: 0,
          totalAssigned: 0,
        };

        existing.totalAssigned += 1;

        const isDone = !!j.done_at || j.status === "done" || j.status === "completed";

        if (!isDone && j.due_date && j.due_date < todayIso) {
          existing.activeOverdue += 1;
          existing.totalOverdue += 1;
        } else if (isDone && j.done_at && j.due_date && j.done_at.slice(0, 10) > j.due_date.slice(0, 10)) {
          existing.deliveredLate += 1;
          existing.totalOverdue += 1;
        }

        statsByUser.set(respId, existing);
      });
    }

    const ranking = Array.from(statsByUser.values())
      .filter((s) => s.totalOverdue > 0)
      .sort((a, b) => b.totalOverdue - a.totalOverdue || b.activeOverdue - a.activeOverdue);

    return ranking;
  }, [jobs, users, checklistItems, selectedMonth, rankingMode]);

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

      {/* Bloco 3: Ranking de Quem Mais Atrasa Jobs */}
      <Card className="bg-card border-border/70 p-5 rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/40">
          <div>
            <h4 className="text-sm font-bold text-foreground font-display flex items-center gap-2">
              <Flame className="size-4 text-rose-500 animate-pulse" /> Gargalo de Prazos — Quem Mais Atrasa Demandas
            </h4>
            <p className="text-xs text-muted-foreground font-mono-kasa mt-0.5">
              {rankingMode === "execution"
                ? "Atribuição justa por executores das etapas / checklist (quem realmente travou a produção)"
                : "Atribuição por dono/responsável final do job no sistema"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Seletor de Modo: Execução Real vs Dono do Job */}
            <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/20">
              <button
                type="button"
                onClick={() => setRankingMode("execution")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-kasa rounded-md transition-all ${
                  rankingMode === "execution"
                    ? "bg-background text-foreground font-bold shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Mede quem travou as etapas de checklist da esteira"
              >
                <CheckSquare className="size-3 text-primary" /> Executores das Etapas
              </button>
              <button
                type="button"
                onClick={() => setRankingMode("job_owner")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-kasa rounded-md transition-all ${
                  rankingMode === "job_owner"
                    ? "bg-background text-foreground font-bold shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Mede pelo responsável principal cadastrado no job"
              >
                <Users className="size-3 text-muted-foreground" /> Dono do Job
              </button>
            </div>

            {/* Seletor de Mês */}
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 text-xs font-mono-kasa w-[140px] bg-background border-border/70">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o Histórico</SelectItem>
                  {availableMonths.map((m) => {
                    const [year, month] = m.split("-");
                    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
                    const label = dateObj.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
                    return (
                      <SelectItem key={m} value={m} className="capitalize">
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Badge variant="outline" className="border-rose-500/30 text-rose-500 bg-rose-500/10 text-xs font-mono-kasa w-fit h-8 flex items-center">
              {overdueRanking.length} {overdueRanking.length === 1 ? "com atraso" : "com atrasos"}
            </Badge>
          </div>
        </div>

        {overdueRanking.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="size-10 text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-foreground font-display">Operação 100% no Prazo!</p>
            <p className="text-xs text-muted-foreground font-mono-kasa mt-0.5">
              Nenhum responsável possui demandas atrasadas no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueRanking.map((item, index) => {
              const name = item.user?.display_name || item.user?.full_name || "Membro da Equipe";
              const avatar = item.user?.avatar_url;
              const isTop1 = index === 0;

              return (
                <div
                  key={item.userId}
                  className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    isTop1
                      ? "bg-rose-500/10 border-rose-500/40 shadow-xs"
                      : "bg-muted/30 border-border/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className={`size-10 border ${isTop1 ? "border-rose-500 ring-2 ring-rose-500/20" : "border-border"}`}>
                        {avatar && <AvatarImage src={avatar} alt={name} />}
                        <AvatarFallback className="font-bold text-xs uppercase bg-background">
                          {name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {isTop1 && (
                        <div className="absolute -top-1.5 -right-1 bg-rose-500 text-white rounded-full size-4 flex items-center justify-center text-[9px] font-black shadow-xs">
                          1º
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-foreground truncate">{name}</span>
                        {isTop1 && (
                          <span className="text-[10px] uppercase font-black tracking-wider text-rose-500 bg-rose-500/15 px-1.5 py-0.2 rounded font-mono-kasa">
                            Maior atraso
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono-kasa mt-0.5">
                        {item.activeOverdue > 0 && (
                          <span className="text-rose-500 font-bold">{item.activeOverdue} ativo{item.activeOverdue > 1 ? "s" : ""}</span>
                        )}
                        {item.activeOverdue > 0 && item.deliveredLate > 0 && " · "}
                        {item.deliveredLate > 0 && (
                          <span className="text-amber-500">{item.deliveredLate} entregue{item.deliveredLate > 1 ? "s" : ""} fora</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black font-display text-rose-500">
                      {item.totalOverdue}
                    </span>
                    <span className="block text-[9px] font-mono-kasa text-muted-foreground uppercase">
                      atraso{item.totalOverdue > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

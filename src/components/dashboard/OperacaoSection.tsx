import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { DashboardKPI } from "./DashboardKPI";

interface OperacaoSectionProps {
  stats: {
    jobsInProgress: number;
    overdueJobs: number;
    jobsCompletedMonth: number;
  };
}

export function OperacaoSection({ stats }: OperacaoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Operação & Entregas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DashboardKPI
          icon={Clock}
          label="Em Andamento"
          value={stats.jobsInProgress}
          subValue="Demandas em produção"
          color="blue-500"
        />
        <DashboardKPI
          icon={AlertCircle}
          label="Atrasados"
          value={stats.overdueJobs}
          subValue={stats.overdueJobs > 0 ? "Ação imediata necessária" : "Tudo em dia"}
          color="rose-500"
        />
        <DashboardKPI
          icon={CheckCircle2}
          label="Concluídos no Mês"
          value={stats.jobsCompletedMonth}
          subValue="Entregas finalizadas"
          color="emerald-500"
        />
      </div>
    </div>
  );
}


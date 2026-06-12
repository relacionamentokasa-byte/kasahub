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
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
        Operação
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <DashboardKPI
          icon={Clock}
          label="Em Andamento"
          value={stats.jobsInProgress}
          color="blue-500"
        />
        <DashboardKPI
          icon={AlertCircle}
          label="Atrasados"
          value={stats.overdueJobs}
          color="rose-500"
        />
        <DashboardKPI
          icon={CheckCircle2}
          label="Jobs Concluídos (Mês)"
          value={stats.jobsCompletedMonth}
          color="emerald-500"
        />
      </div>
    </div>
  );
}

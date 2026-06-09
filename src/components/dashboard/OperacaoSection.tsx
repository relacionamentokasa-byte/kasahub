import { CheckCircle2, Clock, AlertCircle, FileCheck, Layers } from "lucide-react";
import { DashboardKPI } from "./DashboardKPI";

interface OperacaoSectionProps {
  stats: {
    jobsInProgress: number;
    jobsOverdue: number;
    jobsCompleted: number;
    pendingApprovals: number;
    dmesInProduction: number;
  };
}

export function OperacaoSection({ stats }: OperacaoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
        <Layers className="size-4" /> Operação
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <DashboardKPI 
          icon={Clock} 
          label="Em Andamento" 
          value={stats.jobsInProgress} 
          color="blue-500"
        />
        <DashboardKPI 
          icon={AlertCircle} 
          label="Atrasados" 
          value={stats.jobsOverdue} 
          color="rose-500"
        />
        <DashboardKPI 
          icon={CheckCircle2} 
          label="Concluídos" 
          value={stats.jobsCompleted} 
          color="emerald-500"
        />
        <DashboardKPI 
          icon={FileCheck} 
          label="Apr. Pendentes" 
          value={stats.pendingApprovals} 
          color="amber-500"
        />
        <DashboardKPI 
          icon={Layers} 
          label="DMEs em Prod." 
          value={stats.dmesInProduction} 
          color="primary"
        />
      </div>
    </div>
  );
}

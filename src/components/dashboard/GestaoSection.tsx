import { Wallet, Briefcase, TrendingUp, HandCoins } from "lucide-react";
import { DashboardKPI } from "./DashboardKPI";

interface GestaoSectionProps {
  stats: {
    contractedRevenue: number;
    receivedRevenue: number;
    activeContracts: number;
    extraRevenue: number;
  };
}

export function GestaoSection({ stats }: GestaoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
        <TrendingUp className="size-4" /> Gestão
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPI 
          icon={Briefcase} 
          label="Receita Contratada" 
          value={stats.contractedRevenue} 
          isCurrency 
          color="primary"
        />
        <DashboardKPI 
          icon={HandCoins} 
          label="Receita Recebida" 
          value={stats.receivedRevenue} 
          isCurrency 
          color="emerald-500"
        />
        <DashboardKPI 
          icon={TrendingUp} 
          label="Contratos Ativos" 
          value={stats.activeContracts} 
          color="blue-500"
        />
        <DashboardKPI 
          icon={Wallet} 
          label="Receita Extra (DMEs)" 
          value={stats.extraRevenue} 
          isCurrency 
          color="amber-500"
        />
      </div>
    </div>
  );
}

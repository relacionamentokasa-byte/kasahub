import { LucideIcon } from "lucide-react";
import { brl } from "@/lib/finance-api";

interface DashboardKPIProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  isCurrency?: boolean;
  color?: string;
}

export function DashboardKPI({ icon: Icon, label, value, subValue, isCurrency, color = "primary" }: DashboardKPIProps) {
  const displayValue = isCurrency ? brl(Number(value)) : value;
  
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 lg:p-5 flex flex-col justify-between min-h-[100px] lg:min-h-[120px] hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`size-8 lg:size-10 rounded-lg bg-${color}/10 border border-${color}/20 flex items-center justify-center`}>
          <Icon className={`size-4 lg:size-5 text-${color}`} />
        </div>
      </div>
      <div className="mt-2 lg:mt-3">
        <p className="text-[12px] lg:text-[14px] font-semibold text-[#334155] capitalize mb-0.5 lg:mb-1">{label}</p>
        <p className="text-[22px] lg:text-[28px] font-bold tracking-tight text-foreground">{displayValue}</p>
        {subValue && <p className="text-[9px] lg:text-[10px] text-foreground/40 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}

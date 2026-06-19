import { LucideIcon } from "lucide-react";
import { brl } from "@/lib/utils-format";

interface DashboardKPIProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  isCurrency?: boolean;
  color?: string;
}

const COLOR_MAP: Record<string, { bg: string; border: string; iconBg: string; iconBorder: string; icon: string; accent: string }> = {
  "primary": {
    bg: "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
    border: "border-primary/30 hover:border-primary/50",
    iconBg: "bg-primary/15",
    iconBorder: "border-primary/30",
    icon: "text-primary",
    accent: "text-primary",
  },
  "emerald-500": {
    bg: "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    iconBg: "bg-emerald-500/15",
    iconBorder: "border-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  "rose-500": {
    bg: "bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent",
    border: "border-rose-500/30 hover:border-rose-500/60",
    iconBg: "bg-rose-500/15",
    iconBorder: "border-rose-500/30",
    icon: "text-rose-600 dark:text-rose-400",
    accent: "text-rose-700 dark:text-rose-300",
  },
  "amber-500": {
    bg: "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent",
    border: "border-amber-500/30 hover:border-amber-500/60",
    iconBg: "bg-amber-500/15",
    iconBorder: "border-amber-500/30",
    icon: "text-amber-600 dark:text-amber-400",
    accent: "text-amber-700 dark:text-amber-300",
  },
  "blue-500": {
    bg: "bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent",
    border: "border-blue-500/30 hover:border-blue-500/60",
    iconBg: "bg-blue-500/15",
    iconBorder: "border-blue-500/30",
    icon: "text-blue-600 dark:text-blue-400",
    accent: "text-blue-700 dark:text-blue-300",
  },
  "indigo-500": {
    bg: "bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent",
    border: "border-indigo-500/30 hover:border-indigo-500/60",
    iconBg: "bg-indigo-500/15",
    iconBorder: "border-indigo-500/30",
    icon: "text-indigo-600 dark:text-indigo-400",
    accent: "text-indigo-700 dark:text-indigo-300",
  },
};

export function DashboardKPI({ icon: Icon, label, value, subValue, isCurrency, color = "primary" }: DashboardKPIProps) {
  const displayValue = isCurrency ? brl(Number(value)) : value;
  const c = COLOR_MAP[color] ?? COLOR_MAP["primary"];

  return (
    <div className={`relative overflow-hidden ${c.bg} border ${c.border} rounded-2xl p-4 lg:p-5 flex flex-col justify-between min-h-[100px] lg:min-h-[120px] transition-all hover:shadow-lg hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between">
        <div className={`size-8 lg:size-10 rounded-lg ${c.iconBg} border ${c.iconBorder} flex items-center justify-center`}>
          <Icon className={`size-4 lg:size-5 ${c.icon}`} />
        </div>
      </div>
      <div className="mt-2 lg:mt-3">
        <p className={`text-[12px] lg:text-[14px] font-semibold ${c.accent} capitalize mb-0.5 lg:mb-1`}>{label}</p>
        <p className="text-[22px] lg:text-[28px] font-bold tracking-tight text-foreground">{displayValue}</p>
        {subValue && <p className="text-[9px] lg:text-[10px] text-foreground/50 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}

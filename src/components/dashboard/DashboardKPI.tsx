import { LucideIcon } from "lucide-react";
import { brl } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

interface DashboardKPIProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  isCurrency?: boolean;
  color?: string;
}

export function DashboardKPI({ icon: Icon, label, value, subValue, isCurrency }: DashboardKPIProps) {
  const displayValue = isCurrency ? brl(Number(value)) : value;

  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 lg:p-5 flex flex-col justify-between transition-all duration-200 hover:border-foreground/25 hover:shadow-xs">
      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors min-w-0">
        <Icon className="size-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
        <span className="text-xs font-semibold tracking-tight text-foreground/85 group-hover:text-foreground truncate">
          {label}
        </span>
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="font-display text-xl lg:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {displayValue}
        </div>
        {subValue && (
          <p className="text-[11px] text-muted-foreground truncate" title={subValue}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}




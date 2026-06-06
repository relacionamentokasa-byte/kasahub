import { Target } from "lucide-react";
import { brl } from "@/lib/finance-api";

interface GoalMetric {
  label: string;
  target: number;
  actual: number;
  isCurrency?: boolean;
}

interface PerformanceSectionProps {
  metrics: GoalMetric[];
}

export function PerformanceSection({ metrics }: PerformanceSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
        <Target className="size-4" /> Metas e Performance
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m, i) => {
          const pct = m.target > 0 ? (m.actual / m.target) * 100 : 0;
          let colorClass = "bg-rose-500";
          let textColor = "text-rose-500";
          
          if (pct >= 100) {
            colorClass = "bg-emerald-500";
            textColor = "text-emerald-500";
          } else if (pct >= 70) {
            colorClass = "bg-amber-500";
            textColor = "text-amber-500";
          }

          return (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-kasa capitalize text-foreground/40">{m.label}</span>
                <span className={`text-xs font-bold font-mono-kasa ${textColor}`}>{Math.round(pct)}%</span>
              </div>
              
              <div className="space-y-2">
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorClass} rounded-full transition-all duration-1000`} 
                    style={{ width: `${Math.min(100, pct)}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono-kasa text-foreground/40">
                  <span>{m.isCurrency ? brl(m.actual) : m.actual} realizado</span>
                  <span>Meta: {m.isCurrency ? brl(m.target) : m.target}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

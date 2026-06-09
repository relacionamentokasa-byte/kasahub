import { Target, ArrowRight, TrendingUp, ArrowUpRight, Plus } from "lucide-react";
import { brl } from "@/lib/finance-api";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PerformanceSectionProps {
  monthGoal: number;
  monthActual: number;
  yearGoal: number;
  yearActual: number;
  projection: number;
}

export function PerformanceSection({ 
  monthGoal, 
  monthActual, 
  yearGoal, 
  yearActual, 
  projection 
}: PerformanceSectionProps) {
  const monthPct = monthGoal > 0 ? (monthActual / monthGoal) * 100 : 0;
  const yearPct = yearGoal > 0 ? (yearActual / yearGoal) * 100 : 0;

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getTextColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-500";
    if (pct >= 50) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <Target className="size-4" /> Metas e Performance
        </h3>
        <Link to="/metas" className="text-[10px] font-bold uppercase text-primary hover:underline flex items-center gap-1">
          Gerenciar Metas <ArrowRight className="size-3" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta Mensal */}
        <Card className="bg-surface border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Target className="size-20 text-primary" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground/60 uppercase tracking-tight">Meta Mensal</h4>
                <p className="text-[10px] text-foreground/40 font-mono-kasa">Faturamento do mês atual</p>
              </div>
              {monthGoal > 0 && (
                <span className={cn("text-2xl font-display font-black", getTextColor(monthPct))}>
                  {Math.round(monthPct)}%
                </span>
              )}
            </div>

            {monthGoal > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-foreground/40">Realizado</p>
                    <p className="text-xl font-display font-bold text-foreground">{brl(monthActual)}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-foreground/40">Meta</p>
                    <p className="text-sm font-bold text-foreground/70">{brl(monthGoal)}</p>
                  </div>
                </div>

                <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out",
                      getProgressColor(monthPct)
                    )}
                    style={{ width: `${Math.min(100, monthPct)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                <p className="text-xs text-foreground/50">Nenhuma meta cadastrada para este mês</p>
                <Button asChild variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase border-primary/20 hover:bg-primary/5">
                  <Link to="/metas">
                    <Plus className="size-3 mr-1" /> Cadastrar Meta
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Meta Anual */}
        <Card className="bg-surface border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <TrendingUp className="size-20 text-primary" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground/60 uppercase tracking-tight">Meta Anual</h4>
                <p className="text-[10px] text-foreground/40 font-mono-kasa">Acumulado do ano</p>
              </div>
              {yearGoal > 0 && (
                <span className={cn("text-2xl font-display font-black", getTextColor(yearPct))}>
                  {Math.round(yearPct)}%
                </span>
              )}
            </div>

            {yearGoal > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-foreground/40">Faturamento Acumulado</p>
                    <p className="text-xl font-display font-bold text-foreground">{brl(yearActual)}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-foreground/40">Projeção Ano</p>
                    <div className="flex items-center justify-end gap-1 text-emerald-500 font-bold">
                      <ArrowUpRight className="size-3" />
                      <span className="text-sm">{brl(projection)}</span>
                    </div>
                  </div>
                </div>

                <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out",
                      getProgressColor(yearPct)
                    )}
                    style={{ width: `${Math.min(100, yearPct)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono-kasa text-foreground/40">
                  <span>Meta: {brl(yearGoal)}</span>
                  <span>Média mensal: {brl(yearActual / (new Date().getMonth() + 1))}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                <p className="text-xs text-foreground/50">Nenhuma meta anual cadastrada</p>
                <Button asChild variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase border-primary/20 hover:bg-primary/5">
                  <Link to="/metas">
                    <Plus className="size-3 mr-1" /> Cadastrar Meta
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

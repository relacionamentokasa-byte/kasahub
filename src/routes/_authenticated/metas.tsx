import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, fetchTransactions } from "@/lib/finance-api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Target, 
  TrendingUp, 
  Calendar,
  Save,
  Loader2,
  ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas — KASA HUB" }] }),
  component: MetasPage,
});

function MetasPage() {
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Queries
  const { data: txs = [] } = useQuery({ 
    queryKey: ["transactions"], 
    queryFn: () => fetchTransactions() 
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ["agency-goals", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_goals")
        .select("*")
        .eq("year", selectedYear);
      if (error) throw error;
      return data || [];
    }
  });

  // Calculate Monthly Realized
  const monthlyRealized = txs
    .filter(t => {
      const date = t.paid_at || t.due_date;
      if (!date || t.kind !== 'income' || t.status !== 'paid') return false;
      const d = new Date(date);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    })
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Calculate Yearly Realized
  const yearlyRealized = txs
    .filter(t => {
      const date = t.paid_at || t.due_date;
      if (!date || t.kind !== 'income' || t.status !== 'paid') return false;
      const d = new Date(date);
      return d.getFullYear() === selectedYear;
    })
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Current Goal Values
  const monthGoal = goals.find(g => g.month === selectedMonth && g.period === 'monthly')?.target_value || 0;
  const yearGoal = goals.find(g => g.period === 'yearly')?.target_value || 0;

  // Monthly Progress
  const monthPercent = monthGoal > 0 ? (monthlyRealized / monthGoal) * 100 : 0;
  
  // Yearly Progress
  const yearPercent = yearGoal > 0 ? (yearlyRealized / yearGoal) * 100 : 0;

  // Projection
  const currentMonthIdx = new Date().getMonth() + 1;
  const elapsedMonths = selectedYear < new Date().getFullYear() ? 12 : Math.max(1, currentMonthIdx);
  const avgMonthly = yearlyRealized / elapsedMonths;
  const projection = avgMonthly * 12;

  // Mutations
  const updateGoal = useMutation({
    mutationFn: async ({ value, period, month }: { value: number, period: 'monthly' | 'yearly', month?: number }) => {
      const existing = goals.find(g => g.period === period && (period === 'yearly' || g.month === month));
      
      if (existing) {
        const { error } = await supabase
          .from("agency_goals")
          .update({ target_value: value })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agency_goals")
          .insert({
            target_value: value,
            period,
            month: period === 'monthly' ? month : null,
            year: selectedYear,
            type: 'revenue'
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency-goals"] });
      toast.success("Meta atualizada com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar meta: " + err.message);
    }
  });

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="flex flex-col h-full bg-[#0c1618] text-white">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[#ffbc45] text-[10px] uppercase font-bold tracking-wider">Gestão · Faturamento</span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-1">Metas</h1>
          <p className="text-sm text-white/50 mt-2">Central de acompanhamento de resultados financeiros.</p>
        </div>

        <div className="flex items-center gap-3">
          <Select 
            value={String(selectedMonth)} 
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
              <Calendar className="size-4 mr-2 text-[#ffbc45]" />
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1618] border-white/10 text-white">
              {months.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={String(selectedYear)} 
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[100px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1618] border-white/10 text-white">
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Meta Mensal */}
          <Card className="p-8 bg-white/5 border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="size-24 text-[#ffbc45]" />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Meta Mensal</h2>
                  <p className="text-sm text-white/40">{months[selectedMonth - 1]} / {selectedYear}</p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-3xl font-display font-black",
                    monthPercent >= 100 ? "text-emerald-400" : "text-[#ffbc45]"
                  )}>
                    {Math.round(monthPercent)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Valor da Meta</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 font-bold">R$</span>
                    <Input 
                      type="number"
                      defaultValue={monthGoal}
                      onBlur={(e) => updateGoal.mutate({ value: Number(e.target.value), period: 'monthly', month: selectedMonth })}
                      className="pl-10 bg-white/5 border-white/10 h-12 text-lg font-bold focus:border-[#ffbc45] focus:ring-[#ffbc45]/20"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-white/40">Realizado</p>
                    <p className="text-2xl font-display font-bold text-white">{brl(monthlyRealized)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] uppercase font-bold text-white/40">Faltam</p>
                    <p className="text-lg font-bold text-white/60">
                      {monthlyRealized >= monthGoal ? "Meta Atingida!" : brl(monthGoal - monthlyRealized)}
                    </p>
                  </div>
                </div>

                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out",
                      monthPercent >= 100 ? "bg-emerald-500" : "bg-[#ffbc45]"
                    )}
                    style={{ width: `${Math.min(100, monthPercent)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Meta Anual */}
          <Card className="p-8 bg-white/5 border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="size-24 text-[#ffbc45]" />
            </div>

            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Meta Anual</h2>
                  <p className="text-sm text-white/40">Janeiro - Dezembro / {selectedYear}</p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-3xl font-display font-black",
                    yearPercent >= 100 ? "text-emerald-400" : "text-[#ffbc45]"
                  )}>
                    {Math.round(yearPercent)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Valor da Meta</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 font-bold">R$</span>
                    <Input 
                      type="number"
                      defaultValue={yearGoal}
                      onBlur={(e) => updateGoal.mutate({ value: Number(e.target.value), period: 'yearly' })}
                      className="pl-10 bg-white/5 border-white/10 h-12 text-lg font-bold focus:border-[#ffbc45] focus:ring-[#ffbc45]/20"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-white/40">Faturamento Acumulado</p>
                    <p className="text-2xl font-display font-bold text-white">{brl(yearlyRealized)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] uppercase font-bold text-white/40">Projeção {selectedYear}</p>
                    <div className="flex items-center justify-end gap-1 text-emerald-400 font-bold">
                      <ArrowUpRight className="size-4" />
                      <span>{brl(projection)}</span>
                    </div>
                  </div>
                </div>

                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out",
                      yearPercent >= 100 ? "bg-emerald-500" : "bg-[#ffbc45]"
                    )}
                    style={{ width: `${Math.min(100, yearPercent)}%` }}
                  />
                </div>
                
                <p className="text-[10px] text-center text-white/30 uppercase tracking-tighter">
                  Baseado na média mensal de {brl(avgMonthly)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

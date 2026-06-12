import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Zap, Users, FileText, Target, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardKPI } from "./DashboardKPI";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { brl } from "@/lib/utils-format";
import { startOfMonth, endOfMonth } from "date-fns";

async function fetchSaudeNegocio() {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();
  const monthStartDate = startOfMonth(now).toISOString().slice(0, 10);
  const monthEndDate = endOfMonth(now).toISOString().slice(0, 10);

  // MRR: all active recurring approved proposals (sum of monthly_investment)
  const { data: mrrData } = await supabase
    .from("proposals")
    .select("monthly_investment")
    .eq("status", "Aprovada")
    .eq("contract_type", "recurring")
    .is("deleted_at", null);

  const mrr = (mrrData || []).reduce(
    (acc: number, p: any) => acc + Number(p.monthly_investment || 0),
    0,
  );

  // Receita Avulsa (Mês): one_time proposals approved this month
  const { data: avulsaData } = await supabase
    .from("proposals")
    .select("one_time_investment, total, accepted_at, converted_at")
    .eq("status", "Aprovada")
    .eq("contract_type", "one_time")
    .is("deleted_at", null)
    .or(`accepted_at.gte.${monthStart},converted_at.gte.${monthStart}`);

  const avulsa = (avulsaData || [])
    .filter((p: any) => {
      const ref = p.accepted_at || p.converted_at;
      return ref && ref >= monthStart && ref <= monthEnd;
    })
    .reduce(
      (acc: number, p: any) =>
        acc + Number(p.one_time_investment || p.total || 0),
      0,
    );

  // Clientes Ativos: count of projects with status='active'
  const { count: clientesAtivos } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Propostas Pendentes
  const { count: propostasPendentes } = await supabase
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .in("status", ["Enviada", "Rascunho"])
    .is("deleted_at", null);

  // Jobs concluídos no mês
  const { count: jobsConcluidos } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .gte("done_at", monthStart)
    .lte("done_at", monthEnd);

  // Meta do mês
  const { data: goalData } = await supabase
    .from("agency_goals")
    .select("target_value")
    .eq("type", "revenue")
    .eq("period", "month")
    .eq("month", now.getMonth() + 1)
    .eq("year", now.getFullYear())
    .maybeSingle();

  const meta = Number(goalData?.target_value || 0);

  return {
    mrr,
    avulsa,
    clientesAtivos: clientesAtivos || 0,
    propostasPendentes: propostasPendentes || 0,
    jobsConcluidos: jobsConcluidos || 0,
    meta,
  };
}

export function SaudeNegocioSection() {
  const { data } = useQuery({
    queryKey: ["saude-negocio"],
    queryFn: fetchSaudeNegocio,
  });

  const mrr = data?.mrr || 0;
  const avulsa = data?.avulsa || 0;
  const clientesAtivos = data?.clientesAtivos || 0;
  const propostasPendentes = data?.propostasPendentes || 0;
  const meta = data?.meta || 0;
  const faturado = mrr + avulsa;
  const progresso = meta > 0 ? Math.min(100, (faturado / meta) * 100) : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
        Saúde do Negócio
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <DashboardKPI
          icon={TrendingUp}
          label="MRR"
          value={brl(mrr)}
          subValue="Receita recorrente"
          color="emerald-500"
        />
        <DashboardKPI
          icon={Zap}
          label="Receita Avulsa (Mês)"
          value={brl(avulsa)}
          subValue="Jobs pontuais"
          color="amber-500"
        />
        <DashboardKPI
          icon={Users}
          label="Clientes Ativos"
          value={clientesAtivos}
          subValue="Projetos em andamento"
          color="blue-500"
        />
        <DashboardKPI
          icon={FileText}
          label="Propostas Pendentes"
          value={propostasPendentes}
          subValue="Enviadas e rascunhos"
          color="primary"
        />
      </div>

      {/* Meta de Faturamento */}
      <div className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Target className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#334155]">
                Meta de Faturamento (Mês)
              </p>
              <p className="text-xs text-foreground/40">
                {brl(faturado)} de {meta > 0 ? brl(meta) : "meta não definida"}
              </p>
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {meta > 0 ? `${progresso.toFixed(0)}%` : "—"}
          </p>
        </div>
        <Progress value={progresso} className="h-2" />
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Zap, Users, FileText, Target, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardKPI } from "./DashboardKPI";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { brl } from "@/lib/utils-format";
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MRR_KEYWORDS = ["fee", "mensal", "mensalidade", "recorrente", "recorrência", "recorrencia"];
const AVULSO_KEYWORDS = ["avulso", "avulsa", "pontual", "extra"];

function matchesKeyword(name: string | null | undefined, keywords: string[]) {
  if (!name) return false;
  const n = name.toLowerCase();
  return keywords.some((k) => n.includes(k));
}

async function fetchSaudeNegocio(refDate: Date) {
  const monthStart = startOfMonth(refDate).toISOString();
  const monthEnd = endOfMonth(refDate).toISOString();
  const monthStartDate = startOfMonth(refDate).toISOString().slice(0, 10);
  const monthEndDate = endOfMonth(refDate).toISOString().slice(0, 10);

  // Transações do mês com categoria embutida
  const { data: txData, error: txErr } = await supabase
    .from("transactions")
    .select("amount, type, kind, due_date, status, categorias_financeiras(nome)")
    .gte("due_date", monthStartDate)
    .lte("due_date", monthEndDate);
  if (txErr) console.error("transactions fetch error", txErr);

  const txs = (txData || []) as any[];
  // Receitas do mês — INDEPENDENTE de status (Pendente, Atrasado, Recebido).
  // MRR precisa refletir a previsibilidade de faturamento, incluindo parcelas vincendas.
  const incomes = txs.filter((t) => (t.kind || t.type) === "income");

  const mrr = incomes
    .filter((t) => matchesKeyword(t.categorias_financeiras?.nome, MRR_KEYWORDS))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const avulsa = incomes
    .filter((t) => matchesKeyword(t.categorias_financeiras?.nome, AVULSO_KEYWORDS))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Clientes Ativos
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
    .eq("month", refDate.getMonth() + 1)
    .eq("year", refDate.getFullYear())
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
  const qc = useQueryClient();
  const [refDate, setRefDate] = useState<Date>(() => startOfMonth(new Date()));
  const monthKey = useMemo(() => format(refDate, "yyyy-MM"), [refDate]);

  const { data } = useQuery({
    queryKey: ["saude-negocio", monthKey],
    queryFn: () => fetchSaudeNegocio(refDate),
  });


  const mrr = data?.mrr || 0;
  const avulsa = data?.avulsa || 0;
  const clientesAtivos = data?.clientesAtivos || 0;
  const propostasPendentes = data?.propostasPendentes || 0;
  const meta = data?.meta || 0;
  const faturado = mrr + avulsa;
  const progresso = meta > 0 ? Math.min(100, (faturado / meta) * 100) : 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(meta ? String(meta) : "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, meta]);

  const saveMeta = useMutation({
    mutationFn: async (newValue: number) => {
      const month = refDate.getMonth() + 1;
      const year = refDate.getFullYear();

      const { data: existing } = await supabase
        .from("agency_goals")
        .select("id")
        .eq("type", "revenue")
        .eq("period", "month")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("agency_goals")
          .update({ target_value: newValue })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("agency_goals").insert({
          type: "revenue",
          period: "month",
          month,
          year,
          target_value: newValue,
          owner_id: userData.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saude-negocio"] });
      toast.success("Meta atualizada");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar meta"),
  });

  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    setEditing(false);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== meta) {
      saveMeta.mutate(parsed);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
          Saúde do Negócio
        </h3>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setRefDate((d) => startOfMonth(addMonths(d, -1)))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-medium px-2 capitalize min-w-[110px] text-center">
            {format(refDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setRefDate((d) => startOfMonth(addMonths(d, 1)))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>


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
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Target className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#334155]">
                Meta de Faturamento (Mês)
              </p>
              <div className="text-xs text-foreground/40 flex items-center gap-1.5 flex-wrap">
                <span>{brl(faturado)} de</span>
                {editing ? (
                  <Input
                    ref={inputRef}
                    type="number"
                    inputMode="decimal"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commit();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    className="h-6 w-32 text-xs px-2"
                    placeholder="0.00"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <span className="font-medium">
                      {meta > 0 ? brl(meta) : "definir meta"}
                    </span>
                    <Pencil className="size-3" />
                  </button>
                )}
              </div>
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

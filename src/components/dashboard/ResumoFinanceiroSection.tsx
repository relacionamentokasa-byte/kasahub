import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/utils-format";
import { Button } from "@/components/ui/button";
import { DashboardKPI } from "./DashboardKPI";
import { FinancialRulesPanel } from "./FinancialRulesPanel";

type Tx = {
  id: string;
  type: "income" | "expense" | null;
  kind?: "income" | "expense" | null;
  status: string | null;
  amount: number | string | null;
  due_date: string;
  categorias_financeiras?: { nome: string | null } | null;
};

const PAID_STATUSES = new Set(["paid", "recebido", "pago", "efetivado", "received"]);

const normalizeCat = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const isProLaboreCat = (name: string | null | undefined) =>
  normalizeCat(name) === "pro-labore";
const isInvestimentoCat = (name: string | null | undefined) =>
  normalizeCat(name).includes("investimento");

export function ResumoFinanceiroSection() {
  const [refDate, setRefDate] = useState<Date>(() => new Date());

  const monthStart = useMemo(
    () => format(startOfMonth(refDate), "yyyy-MM-dd"),
    [refDate],
  );
  const monthEnd = useMemo(
    () => format(endOfMonth(refDate), "yyyy-MM-dd"),
    [refDate],
  );

  const { data: transactions = [], isLoading } = useQuery<Tx[]>({
    queryKey: ["dashboard-financeiro", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, type, kind, status, amount, due_date, categorias_financeiras(nome)",
        )
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);
      if (error) throw error;
      return (data || []) as unknown as Tx[];
    },
  });

  const m = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    let receitasPrevistas = 0;
    let receitasRecebidas = 0;
    let parcelasFuturas = 0;
    let despesasPrevistas = 0;
    let despesasPagas = 0;
    let despesasOperacionaisPagas = 0;
    let investimentoRealizado = 0;

    for (const t of transactions) {
      const amount = Number(t.amount || 0);
      const isIncome = (t.type ?? t.kind) === "income";
      const isExpense = (t.type ?? t.kind) === "expense";
      const isPaid = PAID_STATUSES.has((t.status || "").toLowerCase());
      const proLab = isProLaboreCat(t.categorias_financeiras?.nome);
      const invest = isInvestimentoCat(t.categorias_financeiras?.nome);

      if (isIncome) {
        receitasPrevistas += amount;
        if (isPaid) receitasRecebidas += amount;
        if (!isPaid && t.due_date > todayStr) parcelasFuturas += amount;
      } else if (isExpense) {
        despesasPrevistas += amount;
        if (isPaid) {
          despesasPagas += amount;
          if (invest) investimentoRealizado += amount;
          else if (!proLab) despesasOperacionaisPagas += amount;
        }
      }
    }

    return {
      receitasPrevistas,
      receitasRecebidas,
      parcelasFuturas,
      despesasPrevistas,
      despesasPagas,
      despesasOperacionaisPagas,
      investimentoRealizado,
      saldo: receitasRecebidas - despesasPagas,
    };
  }, [transactions]);

  const periodoLabel = format(refDate, "LLLL 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
          Resumo Financeiro
        </h3>
        <div className="flex items-center gap-2 border border-border rounded-full px-1 py-1 bg-surface">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full"
            onClick={() => setRefDate((d) => subMonths(d, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-medium capitalize min-w-[120px] text-center">
            {periodoLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full"
            onClick={() => setRefDate((d) => addMonths(d, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[110px] rounded-2xl bg-surface border border-border animate-pulse flex items-center justify-center"
            >
              <Loader2 className="size-4 text-foreground/30 animate-spin" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <DashboardKPI
            icon={TrendingUp}
            label="Receitas Previstas"
            value={brl(m.receitasPrevistas)}
            subValue="Todas do mês"
            color="emerald-500"
          />
          <DashboardKPI
            icon={CheckCircle2}
            label="Receitas Recebidas"
            value={brl(m.receitasRecebidas)}
            subValue="Já pagas"
            color="emerald-500"
          />
          <DashboardKPI
            icon={CalendarClock}
            label="Parcelas Futuras"
            value={brl(m.parcelasFuturas)}
            subValue="Vencimento > hoje"
            color="blue-500"
          />
          <DashboardKPI
            icon={Clock}
            label="Despesas Previstas"
            value={brl(m.despesasPrevistas)}
            subValue="Todas do mês"
            color="amber-500"
          />
          <DashboardKPI
            icon={TrendingDown}
            label="Despesas Pagas"
            value={brl(m.despesasPagas)}
            subValue="Já efetivadas"
            color="rose-500"
          />
        </div>
      )}

      <FinancialRulesPanel
        totalFaturamento={m.receitasRecebidas}
        despesasReais={m.despesasOperacionaisPagas}
        periodoLabel={periodoLabel}
      />
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Zap, Users, FileText, Target, Pencil, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardKPI } from "./DashboardKPI";
import { FinancialChartsSection } from "./FinancialChartsSection";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { brl } from "@/lib/utils-format";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { effectiveAmount } from "@/lib/finance-values";


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

  // Transações do mês com categoria + contrato + proposta embutidos
  // (fallback caso a categoria não tenha sido injetada na automação)
  const { data: txData, error: txErr } = await supabase
    .from("transactions")
    .select(
      "amount, valor_previsto, type, kind, nature, is_recurring, due_date, status, contract_id, proposal_id, client_id, categorias_financeiras(nome), contracts(type), proposals(contract_type), clients(financial_collection_status)"
    )
    .gte("due_date", monthStartDate)
    .lte("due_date", monthEndDate);
  if (txErr) console.error("transactions fetch error", txErr);

  const txs = (txData || []) as any[];
  // Transações válidas (ignora canceladas, estornadas e cobranças suspensas)
  const CANCELLED_STATUSES = new Set(["cancelled", "cancelado", "estornado", "arquivado", "draft", "rascunho"]);
  const validTxs = txs.filter(
    (t) =>
      !CANCELLED_STATUSES.has(String(t.status || "").toLowerCase()) &&
      t.nature !== "nao_operacional" &&
      t.clients?.financial_collection_status !== "suspended"
  );

  // Receitas operacionais ativas do mês
  const incomes = validTxs.filter((t) => (t.kind || t.type) === "income");

  const isRecurringTx = (t: any) => {
    if (matchesKeyword(t.categorias_financeiras?.nome, MRR_KEYWORDS)) return true;
    if (t.is_recurring === true) return true;
    const contractType = t.contracts?.type || t.proposals?.contract_type;
    if (contractType && String(contractType).toLowerCase().includes("recurring")) return true;
    return false;
  };

  const isAvulsoTx = (t: any) => {
    if (matchesKeyword(t.categorias_financeiras?.nome, AVULSO_KEYWORDS)) return true;
    if (t.is_recurring === false && (t.contract_id || t.proposal_id)) {
      const contractType = t.contracts?.type || t.proposals?.contract_type;
      if (contractType && !String(contractType).toLowerCase().includes("recurring")) return true;
      if (!contractType) return true;
    }
    return false;
  };

  const getAmount = (t: any) => effectiveAmount(t);
  const mrr = incomes.filter(isRecurringTx).reduce((acc, t) => acc + getAmount(t), 0);
  const avulsa = incomes
    .filter((t) => !isRecurringTx(t) && isAvulsoTx(t))
    .reduce((acc, t) => acc + getAmount(t), 0);

  // Receita efetivamente recebida no mês (alimenta a Meta de Faturamento).
  // Apenas transações com status de sucesso são contabilizadas — Pendente/Atrasado/Agendado são ignorados.
  const PAID_STATUSES = new Set(["paid", "recebido", "pago", "efetivado", "liquidado"]);
  const receitaEfetivada = incomes
    .filter((t) => PAID_STATUSES.has(String(t.status || "").toLowerCase()))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Clientes distintos que tiveram qualquer receita no mês (recorrente ou avulsa)
  const clientesFaturadosMes = new Set(
    incomes.map((t) => t.client_id).filter(Boolean)
  ).size;


  // Clientes Ativos = união distinta de:
  //  - clientes com projeto ativo (recorrentes)
  //  - clientes com qualquer receita no mês (cobre avulsos)
  const { data: activeProjects } = await supabase
    .from("projects")
    .select("client_id")
    .eq("status", "active");

  const clientesAtivosSet = new Set<string>();
  (activeProjects || []).forEach((p: any) => {
    if (p.client_id) clientesAtivosSet.add(p.client_id);
  });
  incomes.forEach((t) => {
    if (t.client_id) clientesAtivosSet.add(t.client_id);
  });
  const clientesAtivos = clientesAtivosSet.size;


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

  // Meta anual (Jan–Dez do ano corrente)
  const year = refDate.getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const { data: annualGoalData } = await supabase
    .from("agency_goals")
    .select("target_value")
    .eq("type", "revenue")
    .eq("period", "yearly")
    .eq("year", year)
    .is("owner_id", null)
    .maybeSingle();

  const metaAnual = Number(annualGoalData?.target_value || 0);

  // Faturado YTD = receitas operacionais efetivamente recebidas (payment_date)
  // do início do ano até HOJE — mesma regra dos Relatórios de Gestão.
  const todayISO = new Date().toISOString().slice(0, 10);
  const { data: yearIncomes } = await supabase
    .from("transactions")
    .select("amount, valor_previsto, paid_value, valor_real, status, kind, type, nature, payment_date, clients(financial_collection_status)")
    .eq("type", "income")
    .gte("payment_date", yearStart)
    .lte("payment_date", todayISO);

  const faturadoAnual = (yearIncomes || [])
    .filter((t: any) =>
      (t.kind || t.type) === "income"
      && t.nature !== "nao_operacional"
      && t.clients?.financial_collection_status !== 'suspended'
      && (PAID_STATUSES.has(String(t.status || "").toLowerCase()) || !!t.payment_date)
    )
    .reduce(
      (acc: number, t: any) =>
        acc + effectiveAmount(t),
      0
    );

  const normalize = (s: string | null | undefined) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const isProLabore = (name: string | null | undefined) =>
    normalize(name).includes("pro-labore");

  // Despesas Operacionais do mês (Exclui não-operacional, canceladas e Pró-Labore, conforme regra do sistema)
  const expenses = validTxs.filter(
    (t) =>
      (t.kind || t.type) === "expense" &&
      !isProLabore(t.categorias_financeiras?.nome)
  );
  const despesasPagas = expenses
    .filter((t) => PAID_STATUSES.has(String(t.status || "").toLowerCase()))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const despesasPrevistas = expenses.reduce((acc, t) => acc + getAmount(t), 0);
  const receitasPrevistas = incomes.reduce((acc, t) => acc + getAmount(t), 0);

  // Top clientes por faturamento
  const clientRevenueMap = new Map<string, number>();
  incomes.forEach((t) => {
    if (t.client_id) {
      clientRevenueMap.set(t.client_id, (clientRevenueMap.get(t.client_id) || 0) + getAmount(t));
    }
  });

  const { data: clientsData } = await supabase.from("clients").select("id, name, company, logo_url");
  const clientsLookup = new Map((clientsData || []).map((c: any) => [c.id, {
    name: c.company || c.name || "Cliente",
    logo_url: c.logo_url || null,
  }]));

  const topClients = Array.from(clientRevenueMap.entries())
    .map(([id, total]) => {
      const clientInfo = clientsLookup.get(id);
      return {
        id,
        name: clientInfo?.name || "Cliente",
        logo_url: clientInfo?.logo_url || null,
        total,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    mrr,
    avulsa,
    receitaEfetivada,
    despesasPagas,
    despesasPrevistas,
    receitasPrevistas,
    topClients,
    clientesAtivos,
    clientesFaturadosMes,
    propostasPendentes: propostasPendentes || 0,
    jobsConcluidos: jobsConcluidos || 0,
    meta,
    metaAnual,
    faturadoAnual,
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
  const clientesFaturadosMes = data?.clientesFaturadosMes || 0;
  const propostasPendentes = data?.propostasPendentes || 0;
  const meta = data?.meta || 0;
  // Apenas receita efetivamente recebida no mês alimenta a Meta de Faturamento.
  const faturado = data?.receitaEfetivada || 0;
  const progressoRaw = meta > 0 ? (faturado / meta) * 100 : 0;
  const progresso = Math.min(progressoRaw, 100);

  // Meta anual
  const metaAnual = data?.metaAnual || 0;
  const faturadoAnual = data?.faturadoAnual || 0;
  const progressoAnualRaw = metaAnual > 0 ? (faturadoAnual / metaAnual) * 100 : 0;
  const progressoAnual = Math.min(progressoAnualRaw, 100);
  const faltaAnual = Math.max(0, metaAnual - faturadoAnual);
  const anoRef = new Date().getFullYear();



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

  const totalFaturamento = mrr + avulsa;
  const mrrShare = totalFaturamento > 0 ? Math.round((mrr / totalFaturamento) * 100) : 0;
  const avulsoShare = totalFaturamento > 0 ? Math.round((avulsa / totalFaturamento) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Saúde do Negócio
        </h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardKPI
          icon={TrendingUp}
          label="MRR"
          value={brl(mrr)}
          subValue={totalFaturamento > 0 ? `${mrrShare}% do faturamento` : "Receita recorrente"}
          color="emerald-500"
        />
        <DashboardKPI
          icon={Zap}
          label="Receita Avulsa"
          value={brl(avulsa)}
          subValue={totalFaturamento > 0 ? `${avulsoShare}% do faturamento` : "Jobs pontuais"}
          color="amber-500"
        />
        <DashboardKPI
          icon={Receipt}
          label="Ticket Médio"
          value={brl(clientesFaturadosMes > 0 ? totalFaturamento / clientesFaturadosMes : 0)}
          subValue="Média por cliente ativo"
          color="indigo-500"
        />
        <DashboardKPI
          icon={Users}
          label="Clientes Ativos"
          value={clientesAtivos}
          subValue="Contratos em carteira"
          color="blue-500"
        />
      </div>

      {/* Gráficos Financeiros Visuais com Dados Reais e Medidores Circulares de Meta */}
      <FinancialChartsSection
        mrr={mrr}
        avulsa={avulsa}
        receitaEfetivada={faturado}
        despesasPagas={data?.despesasPagas || 0}
        receitasPrevistas={data?.receitasPrevistas || 0}
        despesasPrevistas={data?.despesasPrevistas || 0}
        topClients={data?.topClients || []}
        metaMensal={meta}
        metaAnual={metaAnual}
        faturadoAnual={faturadoAnual}
        editingMeta={editing}
        draftMeta={draft}
        onStartEditMeta={() => setEditing(true)}
        onDraftChange={(val) => setDraft(val)}
        onCommitMeta={commit}
        onCancelEditMeta={() => setEditing(false)}
        inputRef={inputRef}
      />
    </div>
  );
}

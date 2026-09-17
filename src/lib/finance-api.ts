import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { effectiveAmount } from "@/lib/finance-values";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
export type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];
export type Category = Database["public"]["Tables"]["transaction_categories"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];

const PRO_LABORE = "pro-labore";
const normalize = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isProLabore = (name: string | null | undefined) => {
  const n = normalize(name);
  return (
    n.includes(PRO_LABORE) ||
    n.includes("pro-labore") ||
    n.includes("prolabore") ||
    n.includes("retirada") ||
    n.includes("socio") ||
    n.includes("distribuicao")
  );
};


const isInvestimento = (name: string | null | undefined) =>
  normalize(name).includes("investimento");

export async function fetchTransactions(filters: {
  clientId?: string;
  status?: string;
  type?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  nfStatus?: string;
  boletoStatus?: string;
  quickFilter?: string;
  quickChip?: string;
  showCancelled?: boolean;
  viewTab?: "extrato" | "receber" | "pagar" | "prolabore" | "suspensos";
  expenseSubFilter?: "all" | "suppliers" | "freelancers" | "fixed";
} = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Obtemos os IDs dos clientes suspensos para filtrar na query principal (evita PGRST100)
  const { data: suspendedClients } = await supabase
    .from("clients")
    .select("id")
    .eq("financial_collection_status", "suspended");

  const suspendedIds = (suspendedClients || []).map(c => c.id);

  const todayStr = new Date().toISOString().split("T")[0];
  let q = supabase
    .from("transactions")
    .select("*, extra_demands!transactions_extra_demand_id_fkey(id, number_display, title), dme_batches(id, friendly_number, items_count:dme_batch_items(count)), clients(id, name, company, logo_url, financial_collection_status, financial_collection_date, financial_collection_reason), categorias_financeiras(id, nome, tipo), suppliers(id, name), freelancer:partners!transactions_freelancer_id_fkey(id, name, photo_url)", { count: "exact" });

  const viewTab = filters.viewTab || "extrato";

  // 1. Período ou Atrasados
  if (viewTab === "suspensos") {
    // Na aba de suspensos, listamos os débitos pendentes/histórico de clientes com cobrança suspensa
    if (filters.startDate && filters.endDate) {
      q = q.or(
        `and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(payment_date.gte.${filters.startDate},payment_date.lte.${filters.endDate})`
      );
    }
  } else if (filters.quickChip === "overdue") {
    q = q.lt("due_date", todayStr).eq("status", "pending");
  } else if (filters.startDate && filters.endDate) {
    q = q.or(
      `and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(payment_date.gte.${filters.startDate},payment_date.lte.${filters.endDate},status.eq.paid),and(due_date.lt.${todayStr},status.eq.pending)`
    );
  } else {
    if (filters.startDate) q = q.or(`due_date.gte.${filters.startDate},payment_date.gte.${filters.startDate}`);
    if (filters.endDate) q = q.or(`due_date.lte.${filters.endDate},payment_date.lte.${filters.endDate}`);
  }

  // Busca as categorias para separação de pró-labore vs despesas operacionais
  const { data: proLaboreCats } = await supabase
    .from("categorias_financeiras" as any)
    .select("id, nome");
  const matchedCategoryIds = (proLaboreCats || [])
    .filter((c: any) => isProLabore(c.nome))
    .map((c: any) => c.id);

  const proLaboreCategoryNames = [
    "Pró-labore",
    "Pró-labore Sócio",
    "Pro-labore",
    "Distribuição Sócios",
    "Distribuição",
    "Retirada de Sócios",
    "Retirada Sócios"
  ];

  // 2. Filtros de Abas Funcionais (viewTab)
  if (viewTab === "receber") {
    q = q.eq("type", "income");
  } else if (viewTab === "pagar") {
    q = q.eq("type", "expense");

    // Exclui lançamentos de pró-labore/retirada de sócios da aba "A Pagar"
    if (matchedCategoryIds.length > 0) {
      const idsJoined = matchedCategoryIds.map(id => `"${id}"`).join(",");
      q = q.or(`category_id.is.null,category_id.not.in.(${idsJoined})`);
    }
    for (const name of proLaboreCategoryNames) {
      q = q.not("category", "eq", name);
    }
    q = q.not("description", "ilike", "%pro-labore%")
         .not("description", "ilike", "%pró-labore%");

    if (filters.expenseSubFilter === "suppliers") {
      q = q.not("supplier_id", "is", null);
    } else if (filters.expenseSubFilter === "freelancers") {
      q = q.not("freelancer_id", "is", null);
    } else if (filters.expenseSubFilter === "fixed") {
      q = q.eq("is_internal", true);
    }
  } else if (viewTab === "prolabore") {
    if (matchedCategoryIds.length > 0) {
      const idsJoined = matchedCategoryIds.join(",");
      const categoryNamesJoined = proLaboreCategoryNames.join(",");
      q = q.eq("type", "expense").or(
        `category_id.in.(${idsJoined}),category.in.(${categoryNamesJoined}),description.ilike.%pro-labore%,description.ilike.%pró-labore%`
      );
    } else {
      q = q.eq("type", "expense").or(
        `category.ilike.%pro-labore%,category.ilike.%pró-labore%,description.ilike.%pro-labore%,description.ilike.%pró-labore%`
      );
    }
  }

  // 3. Filtros Básicos
  if (filters.clientId && filters.clientId !== "all") q = q.eq("client_id", filters.clientId);
  if (filters.status && filters.status !== "all" && filters.status !== "overdue") q = q.eq("status", filters.status);
  if (filters.status === "overdue") q = q.lt("due_date", todayStr).eq("status", "pending");
  if (filters.type && filters.type !== "all" && viewTab === "extrato") q = q.eq("type", filters.type);
  if (filters.categoryId && filters.categoryId !== "all") q = q.eq("category_id", filters.categoryId);

  // 4. Busca Textual
  if (filters.search) {
    q = q.or(`description.ilike.%${filters.search}%,client_name_search.ilike.%${filters.search}%`);
  }

  // 5. Status Internos (NF e Boleto)
  if (filters.nfStatus && filters.nfStatus !== "all") q = q.eq("nf_status", filters.nfStatus);
  if (filters.boletoStatus && filters.boletoStatus !== "all") q = q.eq("boleto_internal_status", filters.boletoStatus);

  // 6. Quick Filters (Natureza/Tipo legados)
  if (filters.quickFilter === "income") {
    q = q.eq("type", "income");
  } else if (filters.quickFilter === "expense_op") {
    q = q.eq("type", "expense").eq("nature", "operacional");
  } else if (filters.quickFilter === "pro_labore") {
    q = q.eq("type", "expense").or(
      `category.ilike.%pro-labore%,category.ilike.%pró-labore%,description.ilike.%pro-labore%,description.ilike.%pró-labore%`
    );
  }

  // 7. Quick Chips (Datas/Vínculos)
  if (filters.quickChip === "today") {
    q = q.eq("due_date", todayStr);
  } else if (filters.quickChip === "week") {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split("T")[0];
    q = q.gte("due_date", todayStr).lte("due_date", nextWeekStr);
  } else if (filters.quickChip === "paid_month") {
    q = q.eq("status", "paid");
  } else if (filters.quickChip === "missing_links") {
    q = q.or('client_id.is.null,supplier_id.is.null,freelancer_id.is.null');
  }

  // 8. Cancelados
  if (!filters.showCancelled) {
    q = q.neq("status", "cancelled");
  }

  // 9. Regra de Suspensão Financeira
  if (viewTab === "suspensos") {
    if (suspendedIds.length > 0) {
      const idsString = suspendedIds.map(id => `"${id}"`).join(',');
      q = q.in("client_id", suspendedIds);
    } else {
      q = q.eq("id", "00000000-0000-0000-0000-000000000000"); // Nenhum cliente suspenso
    }
  } else if (suspendedIds.length > 0) {
    const idsString = suspendedIds.map(id => `"${id}"`).join(',');
    q = q.or(`client_id.is.null,client_id.not.in.(${idsString}),status.eq.paid`);
  }

  // 10. Ordenação Cronológica
  q = q.order("due_date", { ascending: true });

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;

  return { data: data || [], count: count || 0 };
}


export async function createTransaction(input: TransactionInsert) {
  const { data, error } = await supabase
    .from("transactions")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, patch: TransactionUpdate) {
  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("transaction_categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function fetchContracts(filters: { clientId?: string } = {}) {
  let q = supabase.from("contracts").select("*").order("created_at", { ascending: false });
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchFinanceStats(filters: { startDate?: string; endDate?: string } = {}) {
  const today = new Date().toISOString().split("T")[0];
  let q = supabase
    .from("transactions")
    .select("amount, valor_previsto, valor_real, paid_value, type, status, due_date, payment_date, nature, category, categorias_financeiras(nome), clients(financial_collection_status)");

  if (filters.startDate && filters.endDate) {
    q = q.or(
      `and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(payment_date.gte.${filters.startDate},payment_date.lte.${filters.endDate},status.eq.paid),and(due_date.lt.${today},status.eq.pending)`
    );
  } else {
    if (filters.startDate) q = q.or(`due_date.gte.${filters.startDate},payment_date.gte.${filters.startDate}`);
    if (filters.endDate) q = q.or(`due_date.lte.${filters.endDate},payment_date.lte.${filters.endDate}`);
  }

  const { data: trans, error } = await q;
  if (error) throw error;

  const stats = {
    previstasReceitas: 0,
    recebidasReceitas: 0,
    previstasDespesas: 0,
    pagasDespesas: 0,
    parcelasFuturas: 0,
    naoOperacionalReceitas: 0,
    naoOperacionalDespesas: 0,
    proLaboreMes: 0,
    proLaborePago: 0,
    proLaborePrevisto: 0,

    despesasReaisOperacionais: 0,
    investimentoRealizado: 0,
    cancelledCount: 0,
  };

  // variable 'today' already declared above

  const CANCELLED = new Set(["cancelled", "canceled", "cancelado", "cancelada", "estornado"]);

  trans?.forEach((t: any) => {
    const getCatName = (item: any) => (item.categorias_financeiras as any)?.nome || item.category || "";
    const proLab = isProLabore(getCatName(t));
    const inv = isInvestimento(getCatName(t));
    
    // Se o cliente associado estiver com cobrança suspensa, desconsidera para indicadores OPERACIONAIS
    const isSuspended = t.clients?.financial_collection_status === 'suspended';
    
    // Regra única de valor efetivo (paid → valor_real || amount; pending → valor_previsto || amount)
    const amount = effectiveAmount(t);
    const isNaoOp = t.nature === "nao_operacional";
    const status = (t.status || "").toLowerCase();

    // Lançamentos cancelados
    if (CANCELLED.has(status)) {
      stats.cancelledCount++;
      return;
    }
    
    // Se estiver suspenso, não entra no operacional de A Receber/Previsto, mas entra no histórico total se for Pago.
    const isOperationalView = status !== "paid";
    if (isSuspended && isOperationalView) return;

    if (t.type === "income") {
      if (isNaoOp) {
        stats.naoOperacionalReceitas += amount;
        return;
      }
      if (status === "paid") stats.recebidasReceitas += amount;
      else stats.previstasReceitas += amount;

      if (t.due_date > today) stats.parcelasFuturas += amount;
    } else {
      if (isNaoOp) {
        stats.naoOperacionalDespesas += amount;
        return;
      }
      
      // Pró-labore NÃO é despesa operacional: fica isolado em seu próprio indicador
      // e não entra em Despesas Previstas / Despesas Pagas / Despesas Operacionais.
      // (O saldo das contas bancárias continua sendo reduzido normalmente quando pago,
      //  pois o cálculo de saldo não filtra por categoria.)
      if (proLab) {
        stats.proLaboreMes += amount;
        if (status === "paid") stats.proLaborePago += amount;
        else stats.proLaborePrevisto += amount;
        return;
      }

      if (inv) stats.investimentoRealizado += amount;
      else stats.despesasReaisOperacionais += amount;

      if (status === "paid") stats.pagasDespesas += amount;
      else stats.previstasDespesas += amount;

    }
  });


  return stats;
}


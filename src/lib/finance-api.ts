import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

const isProLabore = (name: string | null | undefined) =>
  normalize(name) === PRO_LABORE;

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

} = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const today = new Date().toISOString().split("T")[0];
  let q = supabase
    .from("transactions")
    .select("*, extra_demands!transactions_extra_demand_id_fkey(id, number_display, title), dme_batches(id, friendly_number, items_count:dme_batch_items(count)), clients(id, name, company, logo_url, financial_collection_status, financial_collection_date, financial_collection_reason), categorias_financeiras(id, nome, tipo), suppliers(id, name), freelancer:partners!transactions_freelancer_id_fkey(id, name, photo_url)", { count: "exact" })
    .order("due_date", { ascending: false });
  
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Período ou Atrasados
  if (filters.quickChip === "overdue") {
    q = q.lt("due_date", todayStr).eq("status", "pending");
  } else if (filters.startDate && filters.endDate) {
    q = q.or(`and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(due_date.lt.${todayStr},status.eq.pending)`);
  } else {
    if (filters.startDate) q = q.gte("due_date", filters.startDate);
    if (filters.endDate) q = q.lte("due_date", filters.endDate);
  }

  // 2. Filtros Básicos
  if (filters.clientId && filters.clientId !== "all") q = q.eq("client_id", filters.clientId);
  if (filters.status && filters.status !== "all" && filters.status !== "overdue") q = q.eq("status", filters.status);
  if (filters.status === "overdue") q = q.lt("due_date", todayStr).eq("status", "pending");
  if (filters.type && filters.type !== "all") q = q.eq("type", filters.type);
  if (filters.categoryId && filters.categoryId !== "all") q = q.eq("category_id", filters.categoryId);

  // 3. Busca Textual
  if (filters.search) {
    q = q.or(`description.ilike.%${filters.search}%,client_name_search.ilike.%${filters.search}%`);
  }

  // 4. Status Internos
  if (filters.nfStatus && filters.nfStatus !== "all") q = q.eq("nf_status", filters.nfStatus);
  if (filters.boletoStatus && filters.boletoStatus !== "all") q = q.eq("boleto_internal_status", filters.boletoStatus);

  // 5. Quick Filters (Natureza/Tipo)
  if (filters.quickFilter === "income") {
    q = q.eq("type", "income");
  } else if (filters.quickFilter === "expense_op") {
    q = q.eq("type", "expense").eq("nature", "operacional");
  } else if (filters.quickFilter === "pro_labore") {
    // Pro-labore é uma categoria específica.
    // Buscamos transações do tipo despesa onde a categoria associada tem nome "pro-labore"
    q = q.eq("type", "expense").ilike("categorias_financeiras.nome", "%pro-labore%");
  }

  // 6. Quick Chips (Datas/Vínculos)
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
    // Filtro complexo de vínculos or(client_id.is.null, ...)
    q = q.or('client_id.is.null,supplier_id.is.null,freelancer_id.is.null');
  }

  // 7. Cancelados
  if (!filters.showCancelled) {
    q = q.neq("status", "cancelled");
  }

  // 8. Regra de Suspensão Financeira (Visão Operacional)
  // Lançamentos pendentes de clientes suspensos são ocultados da visão principal
  q = q.or(`status.eq.paid,and(clients.financial_collection_status.neq.suspended)`);

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
    .select("amount, valor_previsto, type, status, due_date, nature");

  if (filters.startDate && filters.endDate) {
    q = q.or(`and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(due_date.lt.${today},status.eq.pending)`);
  } else {
    if (filters.startDate) q = q.gte("due_date", filters.startDate);
    if (filters.endDate) q = q.lte("due_date", filters.endDate);
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
    
    const amount = Number(t.status === "paid" ? t.amount : (Number(t.valor_previsto) > 0 ? t.valor_previsto : t.amount));
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
      
      if (proLab) stats.proLaboreMes += amount;
      else if (inv) stats.investimentoRealizado += amount;
      else stats.despesasReaisOperacionais += amount;

      if (status === "paid") stats.pagasDespesas += amount;
      else stats.previstasDespesas += amount;
    }
  });


  return stats;
}


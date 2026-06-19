import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
export type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];
export type Category = Database["public"]["Tables"]["transaction_categories"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];

export async function fetchTransactions(filters: {
  clientId?: string;
  status?: string;
  type?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  let q = supabase
    .from("transactions")
    .select("*, clients(id, name, company), categorias_financeiras(id, nome, tipo), suppliers(id, name), freelancer:partners!transactions_freelancer_id_fkey(id, name)")
    .order("due_date", { ascending: false });

  if (filters.clientId && filters.clientId !== "all") q = q.eq("client_id", filters.clientId);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.type && filters.type !== "all") q = q.eq("type", filters.type);
  if (filters.categoryId && filters.categoryId !== "all") q = q.eq("category_id", filters.categoryId);
  if (filters.startDate) q = q.gte("due_date", filters.startDate);
  if (filters.endDate) q = q.lte("due_date", filters.endDate);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
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
  let q = supabase
    .from("transactions")
    .select("amount, type, status, due_date, nature");

  if (filters.startDate) q = q.gte("due_date", filters.startDate);
  if (filters.endDate) q = q.lte("due_date", filters.endDate);

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
  };

  const today = new Date().toISOString().split("T")[0];

  trans?.forEach((t: any) => {
    const amount = Number(t.amount);
    const isNaoOp = t.nature === "nao_operacional";

    if (t.type === "income") {
      if (isNaoOp) {
        stats.naoOperacionalReceitas += amount;
        return; // não entra em faturamento/previsto
      }
      if (t.status === "paid") stats.recebidasReceitas += amount;
      else stats.previstasReceitas += amount;

      if (t.due_date > today) stats.parcelasFuturas += amount;
    } else {
      if (isNaoOp) {
        stats.naoOperacionalDespesas += amount;
        return;
      }
      if (t.status === "paid") stats.pagasDespesas += amount;
      else stats.previstasDespesas += amount;
    }
  });

  return stats;
}


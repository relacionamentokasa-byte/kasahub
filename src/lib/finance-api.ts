import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BankAccount = Database["public"]["Tables"]["bank_accounts"]["Row"];
export type FinancialCategory = Database["public"]["Tables"]["financial_categories"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

// ---------- Bank accounts ----------
export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createBankAccount(input: Database["public"]["Tables"]["bank_accounts"]["Insert"]) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({ ...input, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBankAccount(id: string, patch: Database["public"]["Tables"]["bank_accounts"]["Update"]) {
  const { data, error } = await supabase.from("bank_accounts").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBankAccount(id: string) {
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Categories ----------
export async function fetchCategories(): Promise<FinancialCategory[]> {
  const { data, error } = await supabase
    .from("financial_categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: Database["public"]["Tables"]["financial_categories"]["Insert"]) {
  const { data, error } = await supabase.from("financial_categories").insert(input).select().single();
  if (error) throw error;
  return data;
}

// ---------- Contracts ----------
export async function fetchContracts(filters: { clientId?: string } = {}): Promise<Contract[]> {
  let q = supabase.from("contracts").select("*").order("created_at", { ascending: false });
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createContract(input: Database["public"]["Tables"]["contracts"]["Insert"]) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("contracts")
    .insert({ ...input, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContract(id: string, patch: Database["public"]["Tables"]["contracts"]["Update"]) {
  const { data, error } = await supabase.from("contracts").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteContract(id: string) {
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Transactions ----------
export async function fetchTransactions(filters: {
  kind?: "income" | "expense";
  clientId?: string;
  from?: string;
  to?: string;
} = {}): Promise<Transaction[]> {
  let q = supabase
    .from("transactions")
    .select("*")
    .order("due_date", { ascending: false });
  if (filters.kind) q = q.eq("kind", filters.kind);
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  if (filters.from) q = q.gte("due_date", filters.from);
  if (filters.to) q = q.lte("due_date", filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(
  input: Database["public"]["Tables"]["transactions"]["Insert"],
  installments?: number,
) {
  const { data: u } = await supabase.auth.getUser();
  const owner_id = u.user?.id ?? null;
  const total = Math.max(1, installments ?? 1);
  if (total === 1) {
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...input, owner_id })
      .select()
      .single();
    if (error) throw error;
    return [data];
  }
  // Split into installments
  const base = new Date(input.due_date ?? new Date().toISOString().slice(0, 10));
  const amount = Math.round(((input.amount ?? 0) / total) * 100) / 100;
  const rows = Array.from({ length: total }).map((_, i) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    return {
      ...input,
      owner_id,
      amount,
      due_date: d.toISOString().slice(0, 10),
      installment_total: total,
      installment_number: i + 1,
      description: `${input.description} (${i + 1}/${total})`,
    };
  });
  const { data, error } = await supabase.from("transactions").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateTransaction(id: string, patch: Database["public"]["Tables"]["transactions"]["Update"]) {
  const { data, error } = await supabase.from("transactions").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function markPaid(id: string, paid: boolean) {
  return updateTransaction(id, {
    status: paid ? "paid" : "pending",
    paid_at: paid ? new Date().toISOString().slice(0, 10) : null,
  });
}

// ---------- Computed indicators ----------
export function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function accountBalance(account: BankAccount, txs: Transaction[]) {
  const paid = txs.filter((t) => t.account_id === account.id && t.status === "paid");
  const delta = paid.reduce((s, t) => s + (t.kind === "income" ? Number(t.amount) : -Number(t.amount)), 0);
  return Number(account.initial_balance) + delta;
}

export function computeIndicators(txs: Transaction[], contracts: Contract[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const monthTx = txs.filter((t) => t.due_date >= monthStart && t.due_date <= monthEnd);
  const monthIncome = monthTx.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = monthTx.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const activeContracts = contracts.filter((c) => c.status === "active");
  const mrr = activeContracts.reduce((s, c) => s + Number(c.monthly_value), 0);
  const arr = mrr * 12;

  const recurringClients = new Set(activeContracts.map((c) => c.client_id).filter(Boolean));
  const ticketRecurrente = recurringClients.size > 0 ? mrr / recurringClients.size : 0;

  const extraThisMonth = monthTx
    .filter((t) => t.kind === "income" && !t.contract_id && !t.is_recurring)
    .reduce((s, t) => s + Number(t.amount), 0);

  const allClientsBilled = new Set(
    txs.filter((t) => t.kind === "income" && t.client_id).map((t) => t.client_id as string),
  );
  const totalIncome = txs.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const ticketGeral = allClientsBilled.size > 0 ? totalIncome / allClientsBilled.size : 0;

  const overdue = txs.filter(
    (t) => t.status === "pending" && t.due_date < new Date().toISOString().slice(0, 10),
  );

  return {
    monthIncome,
    monthExpense,
    monthResult: monthIncome - monthExpense,
    mrr,
    arr,
    ticketRecurrente,
    ticketGeral,
    extraThisMonth,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, t) => s + Number(t.amount), 0),
  };
}

export function cashflowByMonth(txs: Transaction[], months = 6) {
  const buckets: Record<string, { label: string; income: number; expense: number }> = {};
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = {
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      income: 0,
      expense: 0,
    };
  }
  for (const t of txs) {
    const k = (t.due_date ?? "").slice(0, 7);
    if (buckets[k]) {
      if (t.kind === "income") buckets[k].income += Number(t.amount);
      else buckets[k].expense += Number(t.amount);
    }
  }
  return Object.values(buckets);
}

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

export async function bulkInsertTransactions(rows: Database["public"]["Tables"]["transactions"]["Insert"][]) {
  const { data: u } = await supabase.auth.getUser();
  const owner_id = u.user?.id ?? null;
  const withOwner = rows.map((r) => ({ ...r, owner_id }));
  const { data, error } = await supabase.from("transactions").insert(withOwner).select();
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

export function accountStats(account: BankAccount, txs: Transaction[]) {
  const own = txs.filter((t) => t.account_id === account.id && t.status === "paid");
  const income = own.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = own.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  return { income, expense, balance: Number(account.initial_balance) + income - expense };
}

export function computeIndicators(txs: Transaction[], contracts: Contract[], opts: { from?: string; to?: string } = {}) {
  const now = new Date();
  const from = opts.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = opts.to ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const periodTx = txs.filter((t) => t.due_date >= from && t.due_date <= to);
  const incomePaid = periodTx.filter((t) => t.kind === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const expensePaid = periodTx.filter((t) => t.kind === "expense" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const receivable = periodTx.filter((t) => t.kind === "income" && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const payable = periodTx.filter((t) => t.kind === "expense" && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);

  const activeContracts = contracts.filter((c) => c.status === "active");
  const mrr = activeContracts.reduce((s, c) => s + Number(c.monthly_value), 0);
  const arr = mrr * 12;

  const extraIncome = periodTx
    .filter((t) => t.kind === "income" && !t.contract_id && !t.is_recurring)
    .reduce((s, t) => s + Number(t.amount), 0);

  const recurringIncome = periodTx
    .filter((t) => t.kind === "income" && (t.contract_id || t.is_recurring))
    .reduce((s, t) => s + Number(t.amount), 0);

  const overdue = txs.filter(
    (t) => t.status === "pending" && t.due_date < new Date().toISOString().slice(0, 10),
  );

  return {
    incomePaid,
    expensePaid,
    receivable,
    payable,
    profit: incomePaid - expensePaid,
    mrr,
    arr,
    recurringIncome,
    extraIncome,
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

// 12 months forecast combining all transactions + recurring contracts
export function annualForecast(txs: Transaction[], contracts: Contract[]) {
  const now = new Date();
  const buckets: { key: string; label: string; income: number; expense: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
      income: 0,
      expense: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const t of txs) {
    const k = (t.due_date ?? "").slice(0, 7);
    const i = idx.get(k);
    if (i === undefined) continue;
    if (t.kind === "income") buckets[i].income += Number(t.amount);
    else buckets[i].expense += Number(t.amount);
  }
  return buckets;
}

export function clientProfitability(clientId: string, txs: Transaction[]) {
  const own = txs.filter((t) => t.client_id === clientId);
  const income = own.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = own.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const profit = income - expense;
  const margin = income > 0 ? (profit / income) * 100 : 0;
  return { income, expense, profit, margin };
}

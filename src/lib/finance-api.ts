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

export async function createContract(input: Database["public"]["Tables"]["contracts"]["Insert"] & { installments_count?: number, auto_renew?: boolean }) {
  if (!input.client_id) throw new Error("O contrato deve estar vinculado a um cliente.");
  if (!input.monthly_value || Number(input.monthly_value) <= 0) throw new Error("O contrato deve possuir um valor mensal.");
  
  const { data: client } = await supabase.from('clients').select('status').eq('id', input.client_id).single();
  if (client?.status === 'inactive') throw new Error("Não é possível criar contratos para clientes inativos.");

  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("contracts")
    .insert({ 
      ...input, 
      owner_id: u.user?.id ?? null,
      status: 'active'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContract(id: string) {
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw error;
}

export async function terminateContract(id: string, cleanupMode: "keep" | "cancel" | "delete", extras: { cancelProjects?: boolean, cancelJobs?: boolean } = {}) {
  // 1. Update contract status
  const { error: ctErr } = await supabase.from("contracts").update({ status: "finished" }).eq("id", id);
  if (ctErr) throw ctErr;

  // 2. Find associated transactions that are pending and future
  const now = new Date().toISOString().slice(0, 10);
  const { data: txs } = await supabase
    .from("transactions")
    .select("id")
    .eq("contract_id", id)
    .eq("status", "pending")
    .gt("due_date", now);

  let result = { count: 0, total: 0 };
  if (txs && txs.length > 0) {
    if (cleanupMode === "delete") {
      const { error: delErr } = await supabase.from("transactions").delete().in("id", txs.map(t => t.id));
      if (delErr) throw delErr;
      result.count = txs.length;
    } else if (cleanupMode === "cancel") {
      const { error: upErr } = await supabase.from("transactions").update({ status: "cancelled" }).in("id", txs.map(t => t.id));
      if (upErr) throw upErr;
      result.count = txs.length;
    }
  }

  // 3. Optional cascade to projects and jobs
  if (extras.cancelProjects || extras.cancelJobs) {
    const { data: projects } = await supabase.from("projects").select("id").eq("contract_id", id);
    if (projects && projects.length > 0) {
      const projIds = projects.map(p => p.id);
      if (extras.cancelProjects) {
        await supabase.from("projects").update({ status: "finished" }).in("id", projIds);
      }
      if (extras.cancelJobs) {
        await supabase.from("jobs").update({ status: "cancelled" }).in("project_id", projIds).neq("status", "done");
      }
    }
  }

  await logAudit("terminate", "contract", id, null, { cleanupMode, ...extras });
  return result;
}

async function logAudit(action: string, entity_type: string, entity_id: string, old_data: any, new_data: any) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    
    await supabase.from("audit_logs").insert({
      user_id: u.user.id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data
    });
  } catch (e) {
    console.error("Audit log failed", e);
  }
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
  if (!input.contract_id && !input.dme_id && !input.description) {
    throw new Error("Lançamentos manuais devem possuir uma descrição/origem.");
  }
  
  if (!input.origin_type) {
    if (input.contract_id) input.origin_type = 'contract';
    else if (input.dme_id) input.origin_type = 'dme';
    else input.origin_type = 'manual';
  }

  const { data: u } = await supabase.auth.getUser();
  const user_id = u.user?.id ?? null;
  const owner_id = user_id;
  const total = Math.max(1, installments ?? 1);

  if (total === 1) {
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...input, owner_id, created_by: user_id })
      .select()
      .single();
    if (error) throw error;

    // Criar evento na agenda se for receita e tiver vencimento
    if (data.kind === 'income' && data.due_date) {
      await supabase.from("calendar_events").insert({
        title: `Financeiro: ${data.description || 'Receita'}`,
        client_id: data.client_id,
        starts_at: data.due_date,
        kind: "deadline",
        origin_type: "finance",
        origin_id: data.id,
        source: "system",
        created_by: owner_id
      } as never);
    }

    return [data];
  }

  // For backward compatibility or internal grouping, we still use recurrence_id if needed,
  // but architecturally everything is contract-driven now.
  const base = new Date(input.due_date ?? new Date().toISOString().slice(0, 10));
  const amount = Math.round(((Number(input.amount) ?? 0) / total) * 100) / 100;
  const rows = Array.from({ length: total }).map((_, i) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    return {
      ...input,
      owner_id,
      created_by: user_id,
      amount,
      due_date: d.toISOString().slice(0, 10),
      installment_total: total,
      installment_number: i + 1,
      description: total > 1 ? `${input.description} (${i + 1}/${total})` : input.description,
      is_recurring: total > 1,
    };
  });
  const { data, error } = await supabase.from("transactions").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function bulkInsertTransactions(rows: Database["public"]["Tables"]["transactions"]["Insert"][]) {
  const { data: u } = await supabase.auth.getUser();
  const user_id = u.user?.id ?? null;
  const withOwner = rows.map((r) => ({ ...r, owner_id: user_id, created_by: user_id }));
  const { data, error } = await supabase.from("transactions").insert(withOwner).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateTransaction(id: string, patch: Database["public"]["Tables"]["transactions"]["Update"], cascadeFuture: boolean = false) {
  const { data: existing } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (!existing) throw new Error("Lançamento não encontrado.");
  
  if (existing.status === 'paid' && patch.amount !== undefined && patch.amount !== existing.amount) {
    throw new Error("Não é possível alterar o valor de um lançamento já pago.");
  }

  const { data, error } = await supabase.from("transactions").update(patch).eq("id", id).select().single();
  if (error) throw error;

  if (cascadeFuture && data.contract_id && patch.due_date) {
    const oldDate = new Date(existing.due_date);
    const newDate = new Date(patch.due_date);
    const diffMonths = (newDate.getFullYear() - oldDate.getFullYear()) * 12 + (newDate.getMonth() - oldDate.getMonth());
    const diffDays = newDate.getDate() - oldDate.getDate();

    if (diffMonths !== 0 || diffDays !== 0) {
      const { data: futures } = await supabase
        .from('transactions')
        .select('id, due_date')
        .eq('contract_id', data.contract_id)
        .eq('status', 'pending')
        .gt('due_date', existing.due_date)
        .neq('id', id);

      if (futures && futures.length > 0) {
        for (const f of futures) {
          const fDate = new Date(f.due_date);
          fDate.setMonth(fDate.getMonth() + diffMonths);
          fDate.setDate(fDate.getDate() + diffDays);
          await supabase.from('transactions').update({ due_date: fDate.toISOString().slice(0, 10) }).eq('id', f.id);
        }
      }
    }
  }

  return data;
}

export async function deleteTransaction(id: string, cascadeContractFuture: boolean = false) {
  const { data: tx } = await supabase.from("transactions").select("*").eq("id", id).single();
  if (!tx) return;

  if (tx.status === 'paid') {
    throw new Error("Lançamentos pagos não podem ser excluídos. Realize um estorno ou cancelamento.");
  }

  if (cascadeContractFuture && tx.contract_id) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("contract_id", tx.contract_id)
      .eq("status", "pending")
      .gte("due_date", tx.due_date);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;
  }
}


export async function bulkDeleteTransactions(ids: string[]) {
  const { error } = await supabase.from("transactions").delete().in("id", ids);
  if (error) throw error;
}

export async function bulkUpdateTransactions(ids: string[], patch: Database["public"]["Tables"]["transactions"]["Update"]) {
  const { error } = await supabase.from("transactions").update(patch).in("id", ids);
  if (error) throw error;
}

export async function markPaid(id: string, paid: boolean) {

  return updateTransaction(id, {
    status: paid ? "paid" : "pending",
    paid_at: paid ? new Date().toISOString().slice(0, 10) : null,
  });
}

export async function settleTransaction(
  id: string,
  payload: { paid_at: string; account_id?: string | null },
) {
  return updateTransaction(id, {
    status: "paid",
    paid_at: payload.paid_at,
    ...(payload.account_id ? { account_id: payload.account_id } : {}),
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

export interface FinancialIndicators {
  incomePaid: number;
  expensePaid: number;
  receivable: number;
  payable: number;
  profit: number;
  receitasPrevistas: number;
  receitasRecebidas: number;
  despesasPagas: number;
  parcelasFuturas: number;
  mrr: number;
  arr: number;
  recurringIncome: number;
  extraIncome: number;
  ticketRecurrente: number;
  ticketGeral: number;
  monthIncome: number;
  monthExpense: number;
  monthResult: number;
  extraThisMonth: number;
  overdueCount: number;
  overdueAmount: number;
}

export function computeIndicators(txs: Transaction[], contracts: Contract[], opts: { from?: string; to?: string } = {}): FinancialIndicators {
  const now = new Date();
  const from = opts.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = opts.to ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const periodTx = txs.filter((t) => t.due_date >= from && t.due_date <= to);
  const incomePaid = periodTx.filter((t) => t.kind === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const expensePaid = periodTx.filter((t) => t.kind === "expense" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const receivable = periodTx.filter((t) => t.kind === "income" && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const payable = periodTx.filter((t) => t.kind === "expense" && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);

  const parcelasFuturas = txs
    .filter((t) => t.kind === "income" && t.status === "pending" && t.due_date > to)
    .reduce((s, t) => s + Number(t.amount), 0);

  const activeContracts = contracts.filter((c) => c.status === "active");
  const mrr = activeContracts.reduce((s, c) => s + Number(c.monthly_value), 0);
  const arr = mrr * 12;

  const monthIncome = periodTx.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = periodTx.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const extraIncomeTotal = periodTx
    .filter((t: any) => t.kind === "income" && !t.contract_id && !t.is_recurring)
    .reduce((s, t) => s + Number(t.amount), 0);

  const dmeIncomeTotal = periodTx
    .filter((t: any) => t.kind === "income" && t.dme_id)
    .reduce((s, t) => s + Number(t.amount), 0);

  const extraIncome = extraIncomeTotal + dmeIncomeTotal;

  const recurringIncome = periodTx
    .filter((t: any) => t.kind === "income" && (t.contract_id || t.is_recurring) && !t.dme_id)
    .reduce((s, t) => s + Number(t.amount), 0);

  const overdue = txs.filter(
    (t) => t.status === "pending" && t.due_date < new Date().toISOString().slice(0, 10),
  );

  const recurringClients = new Set(activeContracts.map((c) => c.client_id).filter(Boolean));
  const ticketRecurrente = recurringClients.size > 0 ? mrr / recurringClients.size : 0;
  const allClientsBilled = new Set(
    txs.filter((t) => t.kind === "income" && t.client_id).map((t) => t.client_id as string),
  );
  const totalIncome = txs.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const ticketGeral = allClientsBilled.size > 0 ? totalIncome / allClientsBilled.size : 0;

  return {
    incomePaid,
    expensePaid,
    receivable,
    payable,
    profit: incomePaid - expensePaid,
    receitasPrevistas: receivable,
    receitasRecebidas: incomePaid,
    despesasPagas: expensePaid,
    parcelasFuturas,
    mrr,
    arr,
    recurringIncome,
    extraIncome,
    ticketRecurrente,
    ticketGeral,
    monthIncome,
    monthExpense,
    monthResult: monthIncome - monthExpense,
    extraThisMonth: extraIncome,
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

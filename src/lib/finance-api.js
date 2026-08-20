import { supabase } from "@/integrations/supabase/client";
export async function fetchTransactions(filters = {}) {
    const today = new Date().toISOString().split("T")[0];
    let q = supabase
        .from("transactions")
        .select("*, extra_demands!transactions_extra_demand_id_fkey(id, number_display, title), dme_batches(id, friendly_number, items_count:dme_batch_items(count)), clients(id, name, company, logo_url, financial_collection_status), categorias_financeiras(id, nome, tipo), suppliers(id, name), freelancer:partners!transactions_freelancer_id_fkey(id, name, photo_url)")
        .order("due_date", { ascending: false });
    if (filters.clientId && filters.clientId !== "all")
        q = q.eq("client_id", filters.clientId);
    if (filters.status && filters.status !== "all")
        q = q.eq("status", filters.status);
    if (filters.type && filters.type !== "all")
        q = q.eq("type", filters.type);
    if (filters.categoryId && filters.categoryId !== "all")
        q = q.eq("category_id", filters.categoryId);
    if (filters.startDate && filters.endDate) {
        // Incluir atrasados (não pagos/cancelados) mesmo fora do período
        q = q.or(`and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(due_date.lt.${today},status.eq.pending)`);
    }
    else {
        if (filters.startDate)
            q = q.gte("due_date", filters.startDate);
        if (filters.endDate)
            q = q.lte("due_date", filters.endDate);
    }
    const { data, error } = await q;
    if (error)
        throw error;
    return data || [];
}
export async function createTransaction(input) {
    const { data, error } = await supabase
        .from("transactions")
        .insert(input)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
export async function updateTransaction(id, patch) {
    const { data, error } = await supabase
        .from("transactions")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
export async function deleteTransaction(id) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error)
        throw error;
}
export async function fetchCategories() {
    const { data, error } = await supabase
        .from("transaction_categories")
        .select("*")
        .order("name");
    if (error)
        throw error;
    return data || [];
}
export async function fetchContracts(filters = {}) {
    let q = supabase.from("contracts").select("*").order("created_at", { ascending: false });
    if (filters.clientId)
        q = q.eq("client_id", filters.clientId);
    const { data, error } = await q;
    if (error)
        throw error;
    return data || [];
}
export async function fetchFinanceStats(filters = {}) {
    const today = new Date().toISOString().split("T")[0];
    let q = supabase
        .from("transactions")
        .select("amount, valor_previsto, type, status, due_date, nature");
    if (filters.startDate && filters.endDate) {
        q = q.or(`and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(due_date.lt.${today},status.eq.pending)`);
    }
    else {
        if (filters.startDate)
            q = q.gte("due_date", filters.startDate);
        if (filters.endDate)
            q = q.lte("due_date", filters.endDate);
    }
    const { data: trans, error } = await q;
    if (error)
        throw error;
    const stats = {
        previstasReceitas: 0,
        recebidasReceitas: 0,
        previstasDespesas: 0,
        pagasDespesas: 0,
        parcelasFuturas: 0,
        naoOperacionalReceitas: 0,
        naoOperacionalDespesas: 0,
    };
    // variable 'today' already declared above
    const CANCELLED = new Set(["cancelled", "canceled", "cancelado", "cancelada", "estornado"]);
    trans?.forEach((t) => {
        // Se o cliente associado estiver com cobrança suspensa, desconsidera para indicadores OPERACIONAIS
        // Mas note: o MRR (na SaudeNegocioSection) e o histórico geral (relatorios.tsx) podem ter lógicas próprias.
        // Aqui estamos em fetchFinanceStats que alimenta os cards de topo do Financeiro.
        const isSuspended = t.clients?.financial_collection_status === 'suspended';
        const amount = Number(t.status === "paid" ? t.amount : (Number(t.valor_previsto) > 0 ? t.valor_previsto : t.amount));
        const isNaoOp = t.nature === "nao_operacional";
        const status = (t.status || "").toLowerCase();
        // Lançamentos cancelados não entram em nenhum indicador
        if (CANCELLED.has(status))
            return;
        // Se estiver suspenso, não entra no operacional de A Receber/Previsto, mas entra no histórico total se for Pago.
        // Se for Pendente e Suspenso, removemos da visão operacional aqui.
        if (isSuspended && status !== "paid")
            return;
        if (t.type === "income") {
            if (isNaoOp) {
                stats.naoOperacionalReceitas += amount;
                return; // não entra em faturamento/previsto
            }
            if (status === "paid")
                stats.recebidasReceitas += amount;
            else
                stats.previstasReceitas += amount;
            if (t.due_date > today)
                stats.parcelasFuturas += amount;
        }
        else {
            if (isNaoOp) {
                stats.naoOperacionalDespesas += amount;
                return;
            }
            if (status === "paid")
                stats.pagasDespesas += amount;
            else
                stats.previstasDespesas += amount;
        }
    });
    return stats;
}

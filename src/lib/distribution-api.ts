import { supabase } from "@/integrations/supabase/client";
import type { CompanyPartner, PartnerAdvance } from "./partners-finance-api";

export const DISTRIBUTION_CATEGORY = "Distribuição Sócios";
export const PRO_LABORE_CATEGORY = "Pró-labore Sócio";

export type PartnerLine = {
  partner: CompanyPartner;
  share_percentage: number;
  gross: number;
  open_advances: PartnerAdvance[];
  advances_total: number;
  net: number;
};

export type DistributionSummary = {
  month: string;                 // "YYYY-MM"
  monthStart: string;            // "YYYY-MM-01"
  monthEnd: string;              // exclusive next month start
  income_operational: number;
  expense_operational: number;
  net_result: number;
  pro_labore_total: number;      // soma do pró-labore dos sócios pro_labore_only
  base_for_distribution: number; // net_result - pro_labore_total
  partners: CompanyPartner[];
  pro_labore_partners: CompanyPartner[];
  alreadyDistributed: boolean;
};

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export async function fetchDistributionSummary(month: string): Promise<DistributionSummary> {
  const { start, end } = monthBounds(month);

  // Partners
  const { data: partnersData, error: pErr } = await supabase
    .from("company_partners" as any)
    .select("*")
    .eq("is_active", true)
    .order("full_name");
  if (pErr) throw pErr;
  const partners = (partnersData || []) as unknown as CompanyPartner[];

  // Operational paid transactions in month
  const { data: txs, error: txErr } = await supabase
    .from("transactions")
    .select("id, kind, type, amount, nature, status, payment_date, due_date, category")
    .eq("status", "paid")
    .eq("nature", "operacional")
    .gte("payment_date", start)
    .lt("payment_date", end);
  if (txErr) throw txErr;

  let income = 0;
  let expense = 0;
  for (const t of (txs || []) as any[]) {
    const amount = Number(t.amount || 0);
    if (t.kind === "income" || t.type === "income") income += amount;
    else if (t.kind === "expense" || t.type === "expense") {
      // Exclui categorias internas para não dupla-contar
      if (t.category === DISTRIBUTION_CATEGORY || t.category === PRO_LABORE_CATEGORY) continue;
      expense += amount;
    }
  }

  const net_result = income - expense;
  const pro_labore_partners = partners.filter((p) => p.distribution_type === "pro_labore_only");
  const pro_labore_total = pro_labore_partners.reduce((s, p) => s + Number(p.pro_labore_amount || 0), 0);
  const base_for_distribution = Math.max(0, net_result - pro_labore_total);

  // já distribuído este mês?
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category", DISTRIBUTION_CATEGORY)
    .gte("due_date", start)
    .lt("due_date", end);

  return {
    month,
    monthStart: start,
    monthEnd: end,
    income_operational: income,
    expense_operational: expense,
    net_result,
    pro_labore_total,
    base_for_distribution,
    partners,
    pro_labore_partners,
    alreadyDistributed: (count ?? 0) > 0,
  };
}

export async function fetchOpenAdvancesByPartner(): Promise<Record<string, PartnerAdvance[]>> {
  const { data, error } = await supabase
    .from("partner_advances" as any)
    .select("*, company_partners(id, full_name)")
    .in("status", ["open", "partially_settled"])
    .order("advance_date");
  if (error) throw error;
  const map: Record<string, PartnerAdvance[]> = {};
  for (const a of (data || []) as unknown as PartnerAdvance[]) {
    (map[a.partner_id] ||= []).push(a);
  }
  return map;
}

export type ConfirmDistributionInput = {
  month: string;
  conta_id: string;
  due_date: string;            // data de pagamento agendada
  partner_lines: Array<{
    partner_id: string;
    partner_name: string;
    distribution_type: CompanyPartner["distribution_type"];
    gross: number;             // valor bruto (participação ou pró-labore)
    advance_ids: string[];     // vales a abater
    advances_total: number;
  }>;
};

export async function confirmDistribution(input: ConfirmDistributionInput) {
  const { data: { user } } = await supabase.auth.getUser();
  const monthLabel = input.month;

  const createdTxIds: string[] = [];
  const settledAdvanceIds: string[] = [];

  for (const line of input.partner_lines) {
    if (line.gross <= 0 && line.distribution_type === "profit_share") continue;
    const net = Math.max(0, line.gross - line.advances_total);
    const isProLabore = line.distribution_type === "pro_labore_only";
    const category = isProLabore ? PRO_LABORE_CATEGORY : DISTRIBUTION_CATEGORY;
    const label = isProLabore ? "Pró-labore" : "Distribuição";

    const description =
      `${label} ${monthLabel} - ${line.partner_name}` +
      (line.advances_total > 0
        ? ` (Bruto R$ ${line.gross.toFixed(2)} - Vales R$ ${line.advances_total.toFixed(2)})`
        : "");

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        type: "expense",
        kind: "expense",
        status: "pending",
        description,
        amount: net,
        due_date: input.due_date,
        category,
        conta_id: input.conta_id,
        nature: "operacional",
        notes: `Sócio: ${line.partner_name} | Mês: ${monthLabel} | Bruto: ${line.gross.toFixed(2)} | Vales abatidos: ${line.advances_total.toFixed(2)} | Líquido: ${net.toFixed(2)}`,
        created_by: user?.id ?? null,
      } as any)
      .select("id")
      .single();
    if (txErr) throw txErr;
    createdTxIds.push(tx.id);

    // Abater vales (quitar 100%)
    if (line.advance_ids.length > 0) {
      for (const advId of line.advance_ids) {
        const adv = (await supabase
          .from("partner_advances" as any)
          .select("amount")
          .eq("id", advId)
          .single()).data as any;
        const amount = Number(adv?.amount || 0);
        const { error: updErr } = await supabase
          .from("partner_advances" as any)
          .update({ settled_amount: amount, status: "settled" })
          .eq("id", advId);
        if (updErr) throw updErr;
        settledAdvanceIds.push(advId);
      }
    }
  }

  return { createdTxIds, settledAdvanceIds };
}

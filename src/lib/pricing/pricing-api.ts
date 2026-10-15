import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_PRICING_PARAMETERS,
  type PricingParameters,
  type PricingSize,
} from "./pricing-engine";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

type PricingSettingsRow = {
  id: string;
  base_revenue: number;
  total_pro_labore: number;
  structure_cost: number;
  profit_percent: number;
  billable_time_percent: number;
  billable_days: number;
  day_rate: number;
  third_party_multiplier: number | null;
  mixed_third_party_multiplier: number;
  urgency_percent: number;
  max_freelance_days: number;
  sizes: PricingParameters["sizes"];
};

function fromRow(row: PricingSettingsRow | null): PricingParameters {
  if (!row) return DEFAULT_PRICING_PARAMETERS;
  return {
    baseRevenue: Number(row.base_revenue),
    totalProLabore: Number(row.total_pro_labore),
    structureCost: Number(row.structure_cost),
    profitPercent: Number(row.profit_percent),
    billableTimePercent: Number(row.billable_time_percent),
    billableDays: Number(row.billable_days),
    dayRate: Number(row.day_rate),
    thirdPartyMultiplier: row.third_party_multiplier == null ? null : Number(row.third_party_multiplier),
    mixedThirdPartyMultiplier: Number(row.mixed_third_party_multiplier),
    urgencyPercent: Number(row.urgency_percent),
    maxFreelanceDays: Number(row.max_freelance_days),
    sizes: row.sizes,
  };
}

function toRow(parameters: PricingParameters) {
  return {
    base_revenue: parameters.baseRevenue,
    total_pro_labore: parameters.totalProLabore,
    structure_cost: parameters.structureCost,
    profit_percent: parameters.profitPercent,
    billable_time_percent: parameters.billableTimePercent,
    billable_days: parameters.billableDays,
    day_rate: parameters.dayRate,
    third_party_multiplier: parameters.thirdPartyMultiplier,
    mixed_third_party_multiplier: parameters.mixedThirdPartyMultiplier,
    urgency_percent: parameters.urgencyPercent,
    max_freelance_days: parameters.maxFreelanceDays,
    sizes: parameters.sizes,
  };
}

export async function fetchPricingParameters(): Promise<PricingParameters> {
  const { data, error } = await (supabase as any)
    .from("pricing_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return fromRow(data as PricingSettingsRow | null);
}

export async function savePricingParameters(parameters: PricingParameters): Promise<PricingParameters> {
  const { data: userData } = await supabase.auth.getUser();
  const payload = { id: SETTINGS_ID, ...toRow(parameters), updated_by: userData.user?.id ?? null };
  const { data, error } = await (supabase as any)
    .from("pricing_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as PricingSettingsRow);
}

export function validatePricingParameters(parameters: PricingParameters): string[] {
  const errors: string[] = [];
  const numericFields: Array<[string, number]> = [
    ["Faturamento base", parameters.baseRevenue],
    ["Pró-labore total", parameters.totalProLabore],
    ["Estrutura", parameters.structureCost],
    ["Dias vendáveis", parameters.billableDays],
    ["Valor do dia", parameters.dayRate],
    ["Urgência", parameters.urgencyPercent],
    ["Limite avulso", parameters.maxFreelanceDays],
  ];
  for (const [label, value] of numericFields) {
    if (!Number.isFinite(value) || value < 0) errors.push(`${label} deve ser um número maior ou igual a zero.`);
  }
  for (const [label, value] of [["Lucro", parameters.profitPercent], ["Tempo cobrável", parameters.billableTimePercent]] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.push(`${label} deve estar entre 0% e 100%.`);
  }
  for (const size of Object.keys(parameters.sizes) as PricingSize[]) {
    const config = parameters.sizes[size];
    if (!Number.isFinite(config.days) || config.days < 0 || !Number.isFinite(config.defaultPrice) || config.defaultPrice < 0) {
      errors.push(`Os valores do tamanho ${size} são inválidos.`);
    }
  }
  return errors;
}

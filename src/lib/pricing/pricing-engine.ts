export type PricingServiceType = "team" | "third_party" | "mixed" | "monthly";
export type PricingSize = "P" | "M" | "G" | "GG";

export interface PricingSizeConfig {
  days: number;
  defaultPrice: number;
}

export interface PricingParameters {
  baseRevenue: number;
  totalProLabore: number;
  structureCost: number;
  profitPercent: number;
  billableTimePercent: number;
  billableDays: number;
  dayRate: number;
  thirdPartyMultiplier: number | null;
  mixedThirdPartyMultiplier: number | null;
  urgencyPercent: number;
  maxFreelanceDays: number;
  sizes: Record<PricingSize, PricingSizeConfig>;
}

export interface PricingParameterOverrides {
  thirdPartyMultiplier?: number | null;
  mixedThirdPartyMultiplier?: number | null;
  urgencyPercent?: number | null;
  dayRate?: number | null;
}

export interface PricingInput {
  serviceType: PricingServiceType;
  size?: PricingSize;
  days?: number;
  thirdPartyCost?: number;
  clientCount?: number;
  urgent?: boolean;
  salePrice?: number;
  overrides?: PricingParameterOverrides;
}

export interface PricingDerivedValues {
  operatingAndProfitTarget: number;
  projectCostPercent: number;
  calculatedThirdPartyMultiplier: number;
  calculatedMixedThirdPartyMultiplier: number;
  calculatedDayRate: number;
}

export interface PricingResult {
  floorPrice: number;
  salePrice: number;
  surplus: number;
  surplusPercent: number;
  isBelowFloor: boolean;
  requiresProjectQuote: boolean;
  urgencySurcharge: number;
  derived: PricingDerivedValues;
}

export interface PricingSnapshot {
  version: 1;
  input: PricingInput;
  parameters: PricingParameters;
  derived: PricingDerivedValues;
  result: Omit<PricingResult, "derived">;
  capturedAt: string;
}

export const DEFAULT_PRICING_PARAMETERS: PricingParameters = {
  baseRevenue: 13_000,
  totalProLabore: 6_484,
  structureCost: 2_500,
  profitPercent: 10,
  billableTimePercent: 60,
  billableDays: 48,
  dayRate: 215,
  thirdPartyMultiplier: null,
  mixedThirdPartyMultiplier: 1.3,
  urgencyPercent: 30,
  maxFreelanceDays: 5,
  sizes: {
    P: { days: 0.5, defaultPrice: 110 },
    M: { days: 1, defaultPrice: 220 },
    G: { days: 2.5, defaultPrice: 650 },
    GG: { days: 4.5, defaultPrice: 1_100 },
  },
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function positive(value: number | null | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;
}

export function derivePricingValues(parameters: PricingParameters): PricingDerivedValues {
  const operatingAndProfitTarget =
    positive(parameters.totalProLabore) +
    positive(parameters.structureCost) +
    (positive(parameters.baseRevenue) * Math.max(parameters.profitPercent, 0)) / 100;
  const projectCostPercent = Math.max(100 - parameters.profitPercent - (positive(parameters.totalProLabore) / positive(parameters.baseRevenue)) * 100 - (positive(parameters.structureCost) / positive(parameters.baseRevenue)) * 100, 0);
  const calculatedThirdPartyMultiplier = projectCostPercent > 0 ? 100 / projectCostPercent : 0;
  const calculatedMixedThirdPartyMultiplier = 1 + Math.max(parameters.profitPercent, 0) / 100;
  const calculatedDayRate = positive(parameters.billableDays) > 0
    ? operatingAndProfitTarget / parameters.billableDays
    : 0;

  return {
    operatingAndProfitTarget,
    projectCostPercent,
    calculatedThirdPartyMultiplier,
    calculatedMixedThirdPartyMultiplier,
    calculatedDayRate,
  };
}

function effectiveParameters(parameters: PricingParameters, overrides?: PricingParameterOverrides) {
  const derived = derivePricingValues(parameters);
  return {
    derived,
    dayRate: positive(overrides?.dayRate) || positive(parameters.dayRate) || derived.calculatedDayRate,
    thirdPartyMultiplier: positive(overrides?.thirdPartyMultiplier) || positive(parameters.thirdPartyMultiplier) || derived.calculatedThirdPartyMultiplier,
    mixedThirdPartyMultiplier: positive(overrides?.mixedThirdPartyMultiplier) || positive(parameters.mixedThirdPartyMultiplier) || derived.calculatedMixedThirdPartyMultiplier,
    urgencyPercent: overrides?.urgencyPercent != null && overrides.urgencyPercent >= 0 ? overrides.urgencyPercent : parameters.urgencyPercent,
  };
}

export function calculatePricing(input: PricingInput, parameters: PricingParameters = DEFAULT_PRICING_PARAMETERS): PricingResult {
  const effective = effectiveParameters(parameters, input.overrides);
  const days = input.days ?? (input.size ? parameters.sizes[input.size].days : 0);
  const thirdPartyCost = positive(input.thirdPartyCost);
  const clientCount = positive(input.clientCount);
  let floorPrice = 0;

  if (input.serviceType === "team") {
    floorPrice = input.size ? parameters.sizes[input.size].defaultPrice : days * effective.dayRate;
  } else if (input.serviceType === "third_party") {
    floorPrice = thirdPartyCost * effective.thirdPartyMultiplier;
  } else if (input.serviceType === "mixed") {
    floorPrice = days * effective.dayRate + thirdPartyCost * effective.mixedThirdPartyMultiplier;
  } else if (input.serviceType === "monthly") {
    floorPrice = clientCount > 0 ? effective.derived.operatingAndProfitTarget / clientCount : 0;
  }

  const requiresProjectQuote = input.serviceType === "team" && days > parameters.maxFreelanceDays;
  const urgencySurcharge = input.urgent ? floorPrice * Math.max(effective.urgencyPercent, 0) / 100 : 0;
  floorPrice += urgencySurcharge;
  const salePrice = input.salePrice == null ? floorPrice : positive(input.salePrice);
  const surplus = salePrice - floorPrice;

  return {
    floorPrice: roundCurrency(floorPrice),
    salePrice: roundCurrency(salePrice),
    surplus: roundCurrency(surplus),
    surplusPercent: floorPrice > 0 ? roundCurrency((surplus / floorPrice) * 100) : 0,
    isBelowFloor: salePrice < floorPrice,
    requiresProjectQuote,
    urgencySurcharge: roundCurrency(urgencySurcharge),
    derived: effective.derived,
  };
}

export function createPricingSnapshot(input: PricingInput, parameters: PricingParameters): PricingSnapshot {
  const result = calculatePricing(input, parameters);
  const { derived, ...resultWithoutDerived } = result;
  return {
    version: 1,
    input,
    parameters,
    derived,
    result: resultWithoutDerived,
    capturedAt: new Date().toISOString(),
  };
}

export function formatPricingPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

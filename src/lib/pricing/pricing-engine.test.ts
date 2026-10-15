import { describe, expect, it } from "vitest";
import {
  calculatePricing,
  DEFAULT_PRICING_PARAMETERS,
  derivePricingValues,
} from "./pricing-engine";

describe("pricing engine", () => {
  it("calculates team service floors by size", () => {
    expect(calculatePricing({ serviceType: "team", size: "P" }).floorPrice).toBe(110);
    expect(calculatePricing({ serviceType: "team", size: "M" }).floorPrice).toBe(220);
    expect(calculatePricing({ serviceType: "team", size: "G" }).floorPrice).toBe(650);
    expect(calculatePricing({ serviceType: "team", size: "GG" }).floorPrice).toBe(1100);
  });

  it("calculates third party and mixed floors", () => {
    expect(calculatePricing({ serviceType: "third_party", thirdPartyCost: 100 }).floorPrice).toBe(480);
    expect(calculatePricing({ serviceType: "mixed", days: 2, thirdPartyCost: 100 }).floorPrice).toBe(565);
  });

  it("calculates monthly floor by client count", () => {
    expect(calculatePricing({ serviceType: "monthly", clientCount: 2 }).floorPrice).toBe(5150);
  });

  it("adds urgency and detects below-floor sale prices", () => {
    const result = calculatePricing({ serviceType: "team", size: "M", urgent: true, salePrice: 200 });
    expect(result.floorPrice).toBe(286);
    expect(result.isBelowFloor).toBe(true);
    expect(result.surplus).toBe(-86);
  });

  it("marks team work above the configured freelance limit as a project quote", () => {
    const result = calculatePricing({ serviceType: "team", days: 6 });
    expect(result.requiresProjectQuote).toBe(true);
  });

  it("derives the operational target from editable parameters", () => {
    const derived = derivePricingValues(DEFAULT_PRICING_PARAMETERS);
    expect(derived.operatingAndProfitTarget).toBe(10284);
    expect(derived.projectCostPercent).toBeCloseTo(20.8923, 3);
  });
});

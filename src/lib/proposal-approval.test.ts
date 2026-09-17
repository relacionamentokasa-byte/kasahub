import { describe, it, expect, vi } from "vitest";
import { ymd, safeBillingDay, addMonths, approveProposal } from "./proposal-approval";
import { distributeEqually, calculateInstallmentValues } from "./proposal-negotiation";

describe("Proposal Approval Workflow Unit Tests", () => {
  describe("ymd date formatting (local timezone resilience)", () => {
    it("should format date correctly as YYYY-MM-DD without UTC day-shift", () => {
      const d = new Date(2026, 4, 10); // 10 de Maio de 2026
      expect(ymd(d)).toBe("2026-05-10");

      const d2 = new Date(2026, 11, 31); // 31 de Dezembro de 2026
      expect(ymd(d2)).toBe("2026-12-31");

      const d3 = new Date(2026, 0, 1); // 1 de Janeiro de 2026
      expect(ymd(d3)).toBe("2026-01-01");
    });
  });

  describe("safeBillingDay edge cases (month end clamp)", () => {
    it("should clamp February billing day to 28 on non-leap years", () => {
      const clamped = safeBillingDay(2025, 1, 31); // Fev 2025 (month index 1)
      expect(ymd(clamped)).toBe("2025-02-28");
    });

    it("should clamp 31st to 30th for 30-day months (e.g. April, June, Sept, Nov)", () => {
      const clampedApr = safeBillingDay(2026, 3, 31); // Abril (month index 3)
      expect(ymd(clampedApr)).toBe("2026-04-30");

      const clampedJun = safeBillingDay(2026, 5, 31); // Junho (month index 5)
      expect(ymd(clampedJun)).toBe("2026-06-30");
    });

    it("should maintain the exact day when within month boundaries", () => {
      const normal = safeBillingDay(2026, 2, 10); // Março 10
      expect(ymd(normal)).toBe("2026-03-10");
    });
  });

  describe("Special Negotiation Installment Calculations", () => {
    it("should calculate exact monetary values from percentages totaling 100%", () => {
      const totalSetup = 1500;
      const installments = [
        { id: "1", percent: 50, due_kind: "entrada" },
        { id: "2", percent: 50, due_kind: "15_dias" }
      ];

      const values = calculateInstallmentValues(totalSetup, installments);
      expect(values).toHaveLength(2);
      expect(values[0].value).toBe(750);
      expect(values[1].value).toBe(750);
    });

    it("should distribute equally across 3 installments with rounding correction in the last one", () => {
      const totalSetup = 1000;
      const installments = distributeEqually(100, 3);
      expect(installments).toHaveLength(3);

      const sumPercent = installments.reduce((a, b) => a + b.percent, 0);
      expect(sumPercent).toBe(100);

      const values = calculateInstallmentValues(totalSetup, installments);
      const sumValues = values.reduce((a, b) => a + (b.value ?? 0), 0);
      expect(sumValues).toBe(1000);
      expect(values[0].value).toBe(333.3);
      expect(values[1].value).toBe(333.3);
      expect(values[2].value).toBe(333.4);
    });
  });
});

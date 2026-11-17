import { describe, it, expect } from "vitest";
import { isLeadActive, leadTaskDedupeKey, morningSummaryDedupeKey } from "./lead-activity";

const base = { won_at: null, lost_reason: null, lead_stages: { is_won: false, is_lost: false } };
describe("isLeadActive", () => {
  it("missing lead is inactive", () => expect(isLeadActive(null)).toBe(false));
  it("open lead is active", () => expect(isLeadActive(base)).toBe(true));
  it("won stage is inactive", () => expect(isLeadActive({ ...base, lead_stages: { is_won: true, is_lost: false } })).toBe(false));
  it("lost stage is inactive", () => expect(isLeadActive({ ...base, lead_stages: { is_won: false, is_lost: true } })).toBe(false));
  it("won_at filled is inactive", () => expect(isLeadActive({ ...base, won_at: "2026-01-01" })).toBe(false));
  it("lost_reason filled is inactive", () => expect(isLeadActive({ ...base, lost_reason: "preço" })).toBe(false));
});
describe("dedupe keys", () => {
  it("lead task key uses task id and day", () => expect(leadTaskDedupeKey("t1", "2026-11-17")).toBe("lead_task:t1:2026-11-17"));
  it("morning key uses user and day", () => expect(morningSummaryDedupeKey("u1", "2026-11-17")).toBe("morning_summary:u1:2026-11-17"));
});

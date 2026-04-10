import { describe, it, expect } from "vitest";
import { calculateLegalInterest } from "./interest-calculator";

describe("calculateLegalInterest", () => {
  it("should return 0 interest for non-overdue invoices", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = calculateLegalInterest(1000, tomorrow.toISOString().split("T")[0]);
    expect(result.daysOverdue).toBe(0);
    expect(result.interestAmount).toBe(0);
    expect(result.totalOwed).toBe(1000);
  });

  it("should calculate interest correctly for 30 days overdue", () => {
    const result = calculateLegalInterest(1000, "2026-03-01", "2026-03-31");
    expect(result.daysOverdue).toBe(30);
    expect(result.dailyRate).toBeCloseTo(0.105 / 365, 6);
    // 1000 * (0.105/365) * 30 ≈ 8.63
    expect(result.interestAmount).toBeCloseTo(8.63, 1);
    expect(result.totalOwed).toBeCloseTo(1008.63, 1);
  });

  it("should handle zero principal amount", () => {
    const result = calculateLegalInterest(0, "2026-01-01", "2026-04-01");
    expect(result.interestAmount).toBe(0);
    expect(result.totalOwed).toBe(0);
  });

  it("should handle large amounts correctly", () => {
    const result = calculateLegalInterest(50000, "2026-01-01", "2026-07-01");
    expect(result.daysOverdue).toBe(181);
    // 50000 * (0.105/365) * 181 ≈ 2604.11
    expect(result.interestAmount).toBeGreaterThan(2500);
    expect(result.interestAmount).toBeLessThan(2700);
  });
});

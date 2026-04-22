import { describe, it, expect } from "vitest";
import { calculateFinancialHealth } from "./financial-health";
import type { SafeToSpendData } from "@/lib/types";

const sts = (overrides: Partial<SafeToSpendData> = {}): SafeToSpendData => ({
  currentBalance: 5000,
  estimatedVat: 800,
  estimatedIncomeTax: 1200,
  reservedTotal: 2000,
  safeToSpend: 3000,
  taxShieldPotential: 0,
  ...overrides,
});

const baseInput = {
  averageDSO: 21,
  openInvoiceAmount: 1500,
  yearRevenue: 30_000,
  safeToSpend: sts(),
  receiptsThisMonth: 5,
  daysSinceLastBankSync: 1,
  overdueCount: 0,
};

describe("calculateFinancialHealth — output shape", () => {
  it("always returns four factors", () => {
    const r = calculateFinancialHealth(baseInput);
    expect(r.factors).toHaveLength(4);
    expect(r.factors.map((f) => f.name)).toEqual([
      "Betaalsnelheid",
      "Openstaand",
      "Reserve",
      "Administratie",
    ]);
  });

  it("score is between 0 and 100", () => {
    const r = calculateFinancialHealth(baseInput);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("grade matches the score band (A ≥ 80)", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      averageDSO: 7,
      openInvoiceAmount: 500,
      safeToSpend: sts({ safeToSpend: 5000, reservedTotal: 1000 }),
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.grade).toBe("A");
  });

  it("each factor's score is clamped to 0-100", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      overdueCount: 50, // forces openScore reduction past 0
    });
    for (const f of r.factors) {
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("Factor 1 — DSO (betaalsnelheid)", () => {
  it("DSO ≤14 → 100", () => {
    const r = calculateFinancialHealth({ ...baseInput, averageDSO: 10 });
    expect(r.factors[0].score).toBe(100);
  });

  it("DSO 15-30 → 80", () => {
    const r = calculateFinancialHealth({ ...baseInput, averageDSO: 21 });
    expect(r.factors[0].score).toBe(80);
  });

  it("DSO 31-60 → 50", () => {
    const r = calculateFinancialHealth({ ...baseInput, averageDSO: 45 });
    expect(r.factors[0].score).toBe(50);
  });

  it("DSO > 60 → 30", () => {
    const r = calculateFinancialHealth({ ...baseInput, averageDSO: 90 });
    expect(r.factors[0].score).toBe(30);
  });

  it("zero revenue overrides DSO score with onboarding nudge", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      averageDSO: 5,
      yearRevenue: 0,
    });
    expect(r.factors[0].score).toBe(60);
    expect(r.factors[0].message).toMatch(/eerste factuur/i);
  });
});

describe("Factor 2 — open ratio", () => {
  it("open <10% of revenue → high score", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      openInvoiceAmount: 500,
      yearRevenue: 30_000,
    });
    expect(r.factors[1].score).toBe(100);
  });

  it("open ≥100% of revenue → low score", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      openInvoiceAmount: 40_000,
      yearRevenue: 30_000,
    });
    expect(r.factors[1].score).toBe(25);
  });

  it("each overdue invoice reduces open score by 8 (floor at 15)", () => {
    const r0 = calculateFinancialHealth({
      ...baseInput,
      openInvoiceAmount: 500,
      yearRevenue: 30_000,
      overdueCount: 0,
    });
    const r2 = calculateFinancialHealth({
      ...baseInput,
      openInvoiceAmount: 500,
      yearRevenue: 30_000,
      overdueCount: 2,
    });
    expect(r0.factors[1].score - r2.factors[1].score).toBe(16);
  });

  it("no revenue + no open → onboarding score 60", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      openInvoiceAmount: 0,
      yearRevenue: 0,
      receiptsThisMonth: 1,
    });
    expect(r.factors[1].score).toBe(60);
  });
});

describe("Factor 3 — tax reserve", () => {
  it("safe-to-spend > 50% of reserved → 100", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      safeToSpend: sts({ safeToSpend: 3000, reservedTotal: 2000 }),
    });
    expect(r.factors[2].score).toBe(100);
  });

  it("zero balance and zero reserved → 60 (onboarding)", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      safeToSpend: sts({ currentBalance: 0, reservedTotal: 0, safeToSpend: 0 }),
    });
    expect(r.factors[2].score).toBe(60);
  });

  it("negative safe-to-spend → 25 (onderdekking)", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      safeToSpend: sts({ safeToSpend: -500, reservedTotal: 2000 }),
    });
    expect(r.factors[2].score).toBe(25);
  });
});

describe("Factor 4 — admin", () => {
  it("recent bank + receipts → 100", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      receiptsThisMonth: 5,
      daysSinceLastBankSync: 1,
    });
    expect(r.factors[3].score).toBe(100);
  });

  it("no receipts → -25", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      receiptsThisMonth: 0,
    });
    expect(r.factors[3].score).toBe(75);
  });

  it("stale bank sync (>7 days) → -25 extra", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      receiptsThisMonth: 0,
      daysSinceLastBankSync: 30,
    });
    expect(r.factors[3].score).toBe(50);
  });

  it("no bank connection at all is only a small penalty (-5)", () => {
    const r = calculateFinancialHealth({
      ...baseInput,
      daysSinceLastBankSync: null,
    });
    expect(r.factors[3].score).toBe(95);
  });
});

describe("Sparse-data floor", () => {
  it("a brand-new user (no revenue, open, or receipts) gets at least 55", () => {
    const r = calculateFinancialHealth({
      averageDSO: 0,
      openInvoiceAmount: 0,
      yearRevenue: 0,
      safeToSpend: sts({ currentBalance: 0, reservedTotal: 0, safeToSpend: 0 }),
      receiptsThisMonth: 0,
      daysSinceLastBankSync: null,
      overdueCount: 0,
    });
    expect(r.score).toBeGreaterThanOrEqual(55);
    expect(r.summary).toMatch(/net begonnen/i);
  });
});

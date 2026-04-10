import { describe, it, expect } from "vitest";
import { isQuarterStart, getPreviousQuarter } from "./prepare-vat-returns";

describe("isQuarterStart", () => {
  it("should return true for Jan 1", () => {
    expect(isQuarterStart(new Date(2026, 0, 1))).toBe(true);
  });

  it("should return true for Apr 1", () => {
    expect(isQuarterStart(new Date(2026, 3, 1))).toBe(true);
  });

  it("should return true for Jul 1", () => {
    expect(isQuarterStart(new Date(2026, 6, 1))).toBe(true);
  });

  it("should return true for Oct 1", () => {
    expect(isQuarterStart(new Date(2026, 9, 1))).toBe(true);
  });

  it("should return false for Feb 1", () => {
    expect(isQuarterStart(new Date(2026, 1, 1))).toBe(false);
  });

  it("should return false for Jan 15", () => {
    expect(isQuarterStart(new Date(2026, 0, 15))).toBe(false);
  });
});

describe("getPreviousQuarter", () => {
  it("should return Q4 2025 when date is Jan 2026", () => {
    const result = getPreviousQuarter(new Date(2026, 0, 1));
    expect(result.year).toBe(2025);
    expect(result.quarter).toBe(4);
    expect(result.startDate).toBe("2025-10-01");
    expect(result.endDate).toBe("2025-12-31");
  });

  it("should return Q1 2026 when date is Apr 2026", () => {
    const result = getPreviousQuarter(new Date(2026, 3, 1));
    expect(result.year).toBe(2026);
    expect(result.quarter).toBe(1);
    expect(result.startDate).toBe("2026-01-01");
    expect(result.endDate).toBe("2026-03-31");
  });

  it("should return Q2 2026 when date is Jul 2026", () => {
    const result = getPreviousQuarter(new Date(2026, 6, 1));
    expect(result.year).toBe(2026);
    expect(result.quarter).toBe(2);
    expect(result.startDate).toBe("2026-04-01");
    expect(result.endDate).toBe("2026-06-30");
  });

  it("should return Q3 2026 when date is Oct 2026", () => {
    const result = getPreviousQuarter(new Date(2026, 9, 1));
    expect(result.year).toBe(2026);
    expect(result.quarter).toBe(3);
    expect(result.startDate).toBe("2026-07-01");
    expect(result.endDate).toBe("2026-09-30");
  });
});

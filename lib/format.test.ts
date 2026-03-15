import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatDateLong } from "./format";

describe("formatCurrency", () => {
  it("formats positive amounts in EUR", () => {
    expect(formatCurrency(1234.56)).toContain("1.234,56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0,00");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-100);
    expect(result).toContain("100,00");
  });

  it("rounds to 2 decimals", () => {
    expect(formatCurrency(10.999)).toContain("11,00");
  });
});

describe("formatDate", () => {
  it("formats a date string as dd-mm-yyyy", () => {
    const result = formatDate("2026-03-15");
    expect(result).toBe("15-03-2026");
  });

  it("returns dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatDateLong", () => {
  it("formats a date with full month name", () => {
    const result = formatDateLong("2026-03-15");
    expect(result).toContain("maart");
    expect(result).toContain("2026");
    expect(result).toContain("15");
  });

  it("returns dash for null", () => {
    expect(formatDateLong(null)).toBe("—");
  });
});

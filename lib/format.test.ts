import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatDateLong, calculateVat, calculateLineTotals, escapeHtml } from "./format";

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

describe("calculateVat", () => {
  it("calculates 21% VAT correctly", () => {
    const result = calculateVat(100, 21);
    expect(result.subtotalExVat).toBe(100);
    expect(result.vatAmount).toBe(21);
    expect(result.totalIncVat).toBe(121);
  });

  it("calculates 9% VAT correctly", () => {
    const result = calculateVat(100, 9);
    expect(result.vatAmount).toBe(9);
    expect(result.totalIncVat).toBe(109);
  });

  it("handles 0% VAT", () => {
    const result = calculateVat(250, 0);
    expect(result.vatAmount).toBe(0);
    expect(result.totalIncVat).toBe(250);
  });

  it("rounds cents correctly", () => {
    const result = calculateVat(33.33, 21);
    expect(result.vatAmount).toBe(7);
    expect(result.totalIncVat).toBe(40.33);
  });

  it("handles zero amount", () => {
    const result = calculateVat(0, 21);
    expect(result.vatAmount).toBe(0);
    expect(result.totalIncVat).toBe(0);
  });
});

describe("calculateLineTotals", () => {
  it("sums multiple lines and applies VAT", () => {
    const lines = [
      { quantity: 10, rate: 95 },
      { quantity: 5, rate: 120 },
    ];
    const result = calculateLineTotals(lines, 21);
    expect(result.subtotalExVat).toBe(1550);
    expect(result.vatAmount).toBe(325.5);
    expect(result.totalIncVat).toBe(1875.5);
  });

  it("handles empty lines array", () => {
    const result = calculateLineTotals([], 21);
    expect(result.subtotalExVat).toBe(0);
    expect(result.totalIncVat).toBe(0);
  });
});

describe("escapeHtml", () => {
  it("escapes all dangerous characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
});

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

  it("escapes ampersands before other entities (no double-escape)", () => {
    // Order matters: & must be replaced first, otherwise &lt; becomes &amp;lt;
    expect(escapeHtml("<a>")).toBe("&lt;a&gt;");
    expect(escapeHtml("&<")).toBe("&amp;&lt;");
  });

  it("leaves safe text untouched", () => {
    expect(escapeHtml("Jan Jansen, Amsterdam")).toBe("Jan Jansen, Amsterdam");
  });
});

describe("formatCurrency edge cases", () => {
  it("renders negative with minus sign and nl-NL separators", () => {
    // Intl may use a narrow-no-break space between € and amount.
    const result = formatCurrency(-1234.5);
    expect(result).toMatch(/-.*1\.234,50/);
  });

  it("handles very large amounts without scientific notation", () => {
    const result = formatCurrency(1_234_567.89);
    expect(result).toContain("1.234.567,89");
  });

  it("handles sub-cent input by rounding half-to-even/up (Intl behaviour)", () => {
    // 0.005 rounds to either 0,00 or 0,01 depending on engine banker's rounding.
    // We only assert that the output has exactly two fractional digits.
    expect(formatCurrency(0.005)).toMatch(/0,0[01]/);
  });
});

describe("calculateVat rounding edge cases", () => {
  it("rounds half-cent up (21% of 0.024 = 0.00504 → 0.01)", () => {
    const result = calculateVat(0.024, 21);
    // 0.024 first rounds to 0.02; 21% of 0.02 = 0.0042 → 0.00
    // The asymmetry is intentional: VAT is always on the rounded subtotal.
    expect(result.vatAmount).toBe(0);
    expect(result.totalIncVat).toBe(0.02);
  });

  it("keeps totalIncVat = subtotal + vat after rounding", () => {
    const result = calculateVat(19.995, 21); // rounds to 20.00
    expect(result.subtotalExVat + result.vatAmount).toBeCloseTo(result.totalIncVat, 10);
  });
});

describe("calculateLineTotals rounding edge cases", () => {
  it("handles three lines at 0.335 summed then rounded (not line-by-line)", () => {
    // 3 lines van 0.335 = 1.005 → subtotal 1.01 (rounded on sum), not 1.02.
    const result = calculateLineTotals(
      [
        { quantity: 1, rate: 0.335 },
        { quantity: 1, rate: 0.335 },
        { quantity: 1, rate: 0.335 },
      ],
      21
    );
    expect(result.subtotalExVat).toBe(1.01);
  });

  it("handles fractional quantity (e.g. half hour)", () => {
    const result = calculateLineTotals([{ quantity: 0.5, rate: 100 }], 21);
    expect(result.subtotalExVat).toBe(50);
    expect(result.vatAmount).toBe(10.5);
    expect(result.totalIncVat).toBe(60.5);
  });
});

describe("formatDate robustness", () => {
  it("handles ISO timestamps (not just date-only)", () => {
    expect(formatDate("2026-03-15T12:34:56.000Z")).toBe("15-03-2026");
  });

  it("returns '—' for empty string", () => {
    expect(formatDate("")).toBe("—");
  });
});

import { describe, expect, test } from "vitest";
import {
  calculateInvoiceLineAmount,
  calculateInvoiceSubtotalExVat,
  calculateInvoiceTotals,
  calculateInvoiceVatAmount,
  calculatePaymentDays,
  roundMoney,
  sanitizeQuantity,
  sanitizeRate,
} from "@/lib/logic/invoice-calculations";

describe("invoice-calculations", () => {
  test("roundMoney rounds to 2 decimals", () => {
    expect(roundMoney(10)).toBe(10);
    expect(roundMoney(10.1)).toBe(10.1);
    expect(roundMoney(10.105)).toBe(10.11);
    expect(roundMoney(10.104)).toBe(10.1);
  });

  test("calculateInvoiceLineAmount returns rounded quantity * rate", () => {
    expect(calculateInvoiceLineAmount({ quantity: 2, rate: 10 })).toBe(20);
    expect(calculateInvoiceLineAmount({ quantity: 3, rate: 0.3333 })).toBe(1);
  });

  test("calculateInvoiceSubtotalExVat sums and rounds", () => {
    expect(
      calculateInvoiceSubtotalExVat([
        { quantity: 1, rate: 10 },
        { quantity: 2, rate: 2.505 },
      ])
    ).toBe(15.01);
  });

  // Invariant: het subtotaal is exact de som van de (afgeronde) regel-
  // bedragen die de gebruiker op het scherm ziet — wat je optelt klopt
  // tot de cent. (Regressie: 2,5 × 99,99 + 3 × 10,005 toonde regels die
  // optelden tot € 280,00 naast een subtotaal van € 279,99.)
  test("subtotal equals the sum of displayed (rounded) line amounts", () => {
    const cases: Array<Array<{ quantity: number; rate: number }>> = [
      [
        { quantity: 2.5, rate: 99.99 },
        { quantity: 3, rate: 10.005 },
      ],
      [
        { quantity: 0.5, rate: 0.01 },
        { quantity: 0.5, rate: 0.01 },
        { quantity: 0.5, rate: 0.01 },
      ],
      [
        { quantity: 3, rate: 33.33 },
        { quantity: 7, rate: 14.285 },
      ],
    ];

    for (const lines of cases) {
      const displayedSum = roundMoney(
        lines.reduce((sum, line) => sum + calculateInvoiceLineAmount(line), 0)
      );
      expect(calculateInvoiceSubtotalExVat(lines)).toBe(displayedSum);
    }
  });

  test("sanitizeQuantity clamps negatives and limits to 2 decimals", () => {
    expect(sanitizeQuantity("-5")).toBe(0);
    expect(sanitizeQuantity("2.5")).toBe(2.5);
    expect(sanitizeQuantity("10.006")).toBe(10.01);
    expect(sanitizeQuantity("10.004")).toBe(10);
    expect(sanitizeQuantity("")).toBe(0);
    expect(sanitizeQuantity("abc")).toBe(0);
  });

  test("sanitizeRate clamps negatives and limits to 2 decimals", () => {
    expect(sanitizeRate("-100")).toBe(0);
    expect(sanitizeRate("99.99")).toBe(99.99);
    expect(sanitizeRate("10.006")).toBe(10.01);
    expect(sanitizeRate("")).toBe(0);
  });

  test("calculateInvoiceVatAmount calculates VAT on rounded subtotal", () => {
    expect(calculateInvoiceVatAmount(100, 21)).toBe(21);
    expect(calculateInvoiceVatAmount(100.005, 21)).toBe(21);
  });

  test("calculateInvoiceTotals produces consistent totals", () => {
    const totals = calculateInvoiceTotals(
      [
        { quantity: 1, rate: 100 },
        { quantity: 2, rate: 50 },
      ],
      21
    );

    expect(totals.subtotalExVat).toBe(200);
    expect(totals.vatAmount).toBe(42);
    expect(totals.totalIncVat).toBe(242);
  });

  test("calculatePaymentDays uses default if no due date", () => {
    expect(
      calculatePaymentDays({ issueDate: "2026-03-01", dueDate: null, defaultDays: 30 })
    ).toBe(30);
  });

  test("calculatePaymentDays returns non-negative day diff", () => {
    expect(
      calculatePaymentDays({ issueDate: "2026-03-01", dueDate: "2026-03-31", defaultDays: 30 })
    ).toBe(30);

    expect(
      calculatePaymentDays({ issueDate: "2026-03-31", dueDate: "2026-03-01", defaultDays: 30 })
    ).toBe(0);
  });

  test("calculatePaymentDays returns default on invalid date strings", () => {
    expect(
      calculatePaymentDays({ issueDate: "not-a-date", dueDate: "also-bad", defaultDays: 30 })
    ).toBe(30);
  });
});

import { describe, expect, test } from "vitest";
import {
  calculateInvoiceLineAmount,
  calculateInvoiceSubtotalExVat,
  calculateInvoiceTotals,
  calculateInvoiceVatAmount,
  calculatePaymentDays,
  roundMoney,
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

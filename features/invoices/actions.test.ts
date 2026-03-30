import { describe, it, expect } from "vitest";
import { validate } from "@/lib/validation";
import { invoiceSchema } from "@/lib/validation";
import { calculateLineTotals } from "@/lib/format";
import type { InvoiceInput } from "@/lib/types";

/**
 * Tests voor de factuur-logica die in createInvoice/updateInvoice wordt gebruikt.
 * De server actions zelf vereisen Supabase auth, daarom testen we hier
 * de validatie + berekening pipeline die de actions intern gebruiken.
 */

const validInput: InvoiceInput = {
  client_id: "abc-123",
  invoice_number: "FAC-001",
  status: "draft",
  issue_date: "2026-03-15",
  due_date: null,
  vat_rate: 21,
  notes: null,
  lines: [
    { id: "line-1", description: "Ontwikkeling", quantity: 10, unit: "uren", rate: 95 },
    { id: "line-2", description: "Design", quantity: 5, unit: "uren", rate: 120 },
  ],
};

describe("createInvoice validatie pipeline", () => {
  it("valideert correcte input", () => {
    const result = validate(invoiceSchema, validInput);
    expect(result.error).toBeNull();
  });

  it("berekent BTW totalen correct", () => {
    const totals = calculateLineTotals(validInput.lines, validInput.vat_rate);
    // 10*95 + 5*120 = 950 + 600 = 1550
    expect(totals.subtotalExVat).toBe(1550);
    expect(totals.vatAmount).toBe(325.5);
    expect(totals.totalIncVat).toBe(1875.5);
  });

  it("weigert lege factuurnummer", () => {
    const result = validate(invoiceSchema, { ...validInput, invoice_number: "" });
    expect(result.error).toBe("Factuurnummer is verplicht");
  });

  it("weigert ontbrekende klant", () => {
    const result = validate(invoiceSchema, { ...validInput, client_id: "" });
    expect(result.error).toBe("Klant is verplicht");
  });

  it("weigert lege regels", () => {
    const result = validate(invoiceSchema, { ...validInput, lines: [] });
    expect(result.error).toBe("Minimaal één factuurregel is verplicht");
  });

  it("weigert ongeldige eenheid", () => {
    const result = validate(invoiceSchema, {
      ...validInput,
      lines: [{ ...validInput.lines[0], unit: "weken" }],
    });
    expect(result.error).not.toBeNull();
  });

  it("berekent 0% BTW correct", () => {
    const totals = calculateLineTotals(validInput.lines, 0);
    expect(totals.vatAmount).toBe(0);
    expect(totals.totalIncVat).toBe(1550);
  });

  it("berekent 9% BTW correct", () => {
    const totals = calculateLineTotals(validInput.lines, 9);
    expect(totals.vatAmount).toBe(139.5);
    expect(totals.totalIncVat).toBe(1689.5);
  });

  it("rondt bedragen af op centen", () => {
    const lines = [{ id: "1", description: "Test", quantity: 3, unit: "uren" as const, rate: 33.33 }];
    const totals = calculateLineTotals(lines, 21);
    // 3 * 33.33 = 99.99 -> vat = 99.99 * 0.21 = 20.9979 -> 21.00
    expect(totals.subtotalExVat).toBe(99.99);
    expect(totals.vatAmount).toBe(21);
    expect(totals.totalIncVat).toBe(120.99);
  });
});

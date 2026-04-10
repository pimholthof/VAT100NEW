import { describe, it, expect } from "vitest";
import { validate } from "@/lib/validation";
import { receiptSchema } from "@/lib/validation";
import { calculateVat } from "@/lib/format";

/**
 * Tests voor de bon-validatie en BTW-berekeningen.
 * Server actions vereisen Supabase auth, dus hier testen we
 * de validatie- en berekeningslogica apart.
 */

describe("receiptSchema validatie", () => {
  it("accepteert minimale geldige bon", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Albert Heijn",
      amount_ex_vat: 10,
      vat_rate: 21,
      receipt_date: "2026-03-15",
      business_percentage: 100,
    });
    expect(result.error).toBeNull();
  });

  it("accepteert bon met 0% BTW", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Freelancer",
      amount_ex_vat: 500,
      vat_rate: 0,
      receipt_date: "2026-01-01",
    });
    expect(result.error).toBeNull();
  });

  it("weigert negatief zakelijk percentage", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Test",
      amount_ex_vat: 10,
      business_percentage: -10,
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert zakelijk percentage > 100", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Test",
      amount_ex_vat: 10,
      business_percentage: 150,
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert negatief bedrag", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Test",
      amount_ex_vat: -50,
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert BTW-tarief > 100", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Test",
      amount_ex_vat: 10,
      vat_rate: 150,
    });
    expect(result.error).not.toBeNull();
  });

  it("accepteert lege optionele velden", () => {
    const result = validate(receiptSchema, {});
    expect(result.error).toBeNull();
  });

  it("default zakelijk percentage is 100", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Test",
      amount_ex_vat: 10,
    });
    expect(result.error).toBeNull();
    expect(result.data?.business_percentage).toBe(100);
  });
});

describe("receipt BTW-berekeningen", () => {
  it("berekent 21% BTW correct", () => {
    const totals = calculateVat(100, 21);
    expect(totals.subtotalExVat).toBe(100);
    expect(totals.vatAmount).toBe(21);
    expect(totals.totalIncVat).toBe(121);
  });

  it("berekent 9% BTW correct", () => {
    const totals = calculateVat(100, 9);
    expect(totals.vatAmount).toBe(9);
    expect(totals.totalIncVat).toBe(109);
  });

  it("berekent 0% BTW correct", () => {
    const totals = calculateVat(250, 0);
    expect(totals.vatAmount).toBe(0);
    expect(totals.totalIncVat).toBe(250);
  });

  it("rondt correct af op 2 decimalen", () => {
    const totals = calculateVat(33.33, 21);
    expect(totals.vatAmount).toBe(7);
    expect(totals.totalIncVat).toBe(40.33);
  });
});

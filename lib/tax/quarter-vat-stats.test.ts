import { describe, it, expect } from "vitest";
import { quarterVatStats } from "./quarter-vat-stats";

describe("quarterVatStats", () => {
  it("vat omzet, output-BTW, voorbelasting en netto samen", () => {
    const s = quarterVatStats(
      [
        { subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, vat_scheme: "standard", is_credit_note: false },
        { subtotal_ex_vat: 500, vat_amount: 45, vat_rate: 9, vat_scheme: "standard", is_credit_note: false },
      ],
      [{ vat_amount: 100, business_percentage: 100 }],
    );
    expect(s.revenueExVat).toBe(1500);
    expect(s.outputVat).toBe(255);
    expect(s.inputVat).toBe(100);
    expect(s.netVat).toBe(155);
  });

  it("trekt creditnota's af (schema-bewust)", () => {
    const s = quarterVatStats(
      [
        { subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, vat_scheme: "standard", is_credit_note: false },
        { subtotal_ex_vat: 200, vat_amount: 42, vat_rate: 21, vat_scheme: "standard", is_credit_note: true },
      ],
      [],
    );
    expect(s.revenueExVat).toBe(800);
    expect(s.outputVat).toBe(168);
    expect(s.netVat).toBe(168);
  });

  it("verlegde EU-omzet telt mee in omzet, niet in output-BTW", () => {
    const s = quarterVatStats(
      [{ subtotal_ex_vat: 1200, vat_amount: 0, vat_rate: 0, vat_scheme: "eu_reverse_charge", is_credit_note: false }],
      [],
    );
    expect(s.revenueExVat).toBe(1200);
    expect(s.outputVat).toBe(0);
  });
});

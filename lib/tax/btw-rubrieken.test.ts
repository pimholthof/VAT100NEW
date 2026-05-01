import { describe, it, expect } from "vitest";
import { calculateBtwRubrieken } from "./btw-rubrieken";

describe("calculateBtwRubrieken", () => {
  it("returns zero for no invoices or receipts", () => {
    const r = calculateBtwRubrieken([], []);
    expect(r["1a"]).toEqual({ omzet: 0, btw: 0 });
    expect(r["1b"]).toEqual({ omzet: 0, btw: 0 });
    expect(r["1c"]).toEqual({ omzet: 0, btw: 0 });
    expect(r.voorbelasting).toBe(0);
    expect(r.totaalBtw).toBe(0);
    expect(r.rubriek5g).toBe(0);
  });

  it("routes 21% standard invoice to rubriek 1a", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 1000,
          vat_amount: 210,
          vat_rate: 21,
          vat_scheme: "standard",
          is_credit_note: false,
          invoice_lines: null,
        },
      ],
      [],
    );
    expect(r["1a"]).toEqual({ omzet: 1000, btw: 210 });
    expect(r["1b"]).toEqual({ omzet: 0, btw: 0 });
    expect(r.totaalBtw).toBe(210);
  });

  it("routes 9% standard invoice to rubriek 1b", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 100,
          vat_amount: 9,
          vat_rate: 9,
          vat_scheme: "standard",
          is_credit_note: false,
          invoice_lines: null,
        },
      ],
      [],
    );
    expect(r["1b"]).toEqual({ omzet: 100, btw: 9 });
    expect(r["1a"].omzet).toBe(0);
  });

  it("routes 0% standard invoice to rubriek 1c", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 500,
          vat_amount: 0,
          vat_rate: 0,
          vat_scheme: "standard",
          is_credit_note: false,
          invoice_lines: null,
        },
      ],
      [],
    );
    expect(r["1c"]).toEqual({ omzet: 500, btw: 0 });
  });

  it("routes EU reverse-charge invoice to 3b and 2a", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 800,
          vat_amount: 0,
          vat_rate: 0,
          vat_scheme: "eu_reverse_charge",
          is_credit_note: false,
          invoice_lines: null,
        },
      ],
      [],
    );
    expect(r["3b"].omzet).toBe(800);
    expect(r["2a"].omzet).toBe(800);
    expect(r["1a"].omzet).toBe(0);
    expect(r.totaalBtw).toBe(0);
  });

  it("routes export-outside-EU invoice to 4b", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 1500,
          vat_amount: 0,
          vat_rate: 0,
          vat_scheme: "export_outside_eu",
          is_credit_note: false,
          invoice_lines: null,
        },
      ],
      [],
    );
    expect(r["4b"].omzet).toBe(1500);
  });

  it("subtracts credit notes (is_credit_note: true)", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 1000,
          vat_amount: 210,
          vat_rate: 21,
          vat_scheme: "standard",
          is_credit_note: false,
          invoice_lines: null,
        },
        {
          subtotal_ex_vat: 200,
          vat_amount: 42,
          vat_rate: 21,
          vat_scheme: "standard",
          is_credit_note: true,
          invoice_lines: null,
        },
      ],
      [],
    );
    expect(r["1a"]).toEqual({ omzet: 800, btw: 168 });
  });

  it("uses invoice_lines per-rate when present", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 0,
          vat_amount: 0,
          vat_rate: null,
          vat_scheme: "standard",
          is_credit_note: false,
          invoice_lines: [
            { amount: 100, vat_rate: 21 },
            { amount: 50, vat_rate: 9 },
          ],
        },
      ],
      [],
    );
    expect(r["1a"]).toEqual({ omzet: 100, btw: 21 });
    expect(r["1b"]).toEqual({ omzet: 50, btw: 4.5 });
  });

  it("computes voorbelasting weighted by business_percentage", () => {
    const r = calculateBtwRubrieken(
      [],
      [
        { vat_amount: 100, business_percentage: 100 },
        { vat_amount: 50, business_percentage: 50 },
        { vat_amount: 20, business_percentage: null },
      ],
    );
    // 100 + 25 + 20 = 145
    expect(r.voorbelasting).toBe(145);
  });

  it("computes rubriek5g as totaalBtw - voorbelasting", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 1000,
          vat_amount: 210,
          vat_rate: 21,
          vat_scheme: "standard",
          is_credit_note: false,
          invoice_lines: null,
        },
      ],
      [{ vat_amount: 60, business_percentage: 100 }],
    );
    expect(r.totaalBtw).toBe(210);
    expect(r.voorbelasting).toBe(60);
    expect(r.rubriek5g).toBe(150);
  });

  it("treats null vat_scheme as standard", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: 1000,
          vat_amount: 210,
          vat_rate: 21,
          vat_scheme: null,
          is_credit_note: false,
          invoice_lines: null,
        },
      ],
      [],
    );
    expect(r["1a"].omzet).toBe(1000);
  });

  it("handles string-typed numeric inputs from supabase", () => {
    const r = calculateBtwRubrieken(
      [
        {
          subtotal_ex_vat: "1000.50" as unknown as number,
          vat_amount: "210.10" as unknown as number,
          vat_rate: 21,
          vat_scheme: "standard",
          is_credit_note: false,
          invoice_lines: null,
        },
      ],
      [],
    );
    expect(r["1a"].omzet).toBe(1000.5);
    expect(r["1a"].btw).toBe(210.1);
  });
});

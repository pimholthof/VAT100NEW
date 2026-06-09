import { describe, it, expect } from "vitest";
import {
  computeVatReturnRow,
  rubriekenToVatReturnRow,
  type VatReturnRubriekRow,
} from "./vat-return-row";
import { calculateBtwRubrieken, type BtwRubrieken } from "./btw-rubrieken";

describe("computeVatReturnRow", () => {
  it("routeert een standaard 21%-factuur naar 1a", () => {
    const { row, totaalBtw, teBetalen } = computeVatReturnRow(
      [{ subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, vat_scheme: "standard", is_credit_note: false }],
      [],
    );
    expect(row.rubriek_1a_omzet).toBe(1000);
    expect(row.rubriek_1a_btw).toBe(210);
    expect(totaalBtw).toBe(210);
    expect(teBetalen).toBe(210);
  });

  it("bewaart 0%-omzet in de 1c-kolom (1e gevouwen, behoud opgeslagen gedrag)", () => {
    const { row, rubrieken } = computeVatReturnRow(
      [{ subtotal_ex_vat: 500, vat_amount: 0, vat_rate: 0, vat_scheme: "standard", is_credit_note: false,
         invoice_lines: [{ amount: 500, vat_rate: 0 }] }],
      [],
    );
    // Canoniek hoort 0% in 1e; de DB-kolom 1c bevat het (gevouwen).
    expect(rubrieken["1e"].omzet).toBe(500);
    expect(row.rubriek_1c_omzet).toBe(500);
    expect(row.rubriek_1c_btw).toBe(0);
  });

  it("bewaart uitvoer buiten EU in de 4b-kolom (3a gevouwen, behoud opgeslagen gedrag)", () => {
    const { row, rubrieken } = computeVatReturnRow(
      [{ subtotal_ex_vat: 800, vat_amount: 0, vat_rate: 0, vat_scheme: "export_outside_eu", is_credit_note: false }],
      [],
    );
    expect(rubrieken["3a"].omzet).toBe(800);
    expect(row.rubriek_4b_omzet).toBe(800);
    expect(row.rubriek_4b_btw).toBe(0);
  });

  it("routeert EU-verlegging naar 3b zonder verschuldigde btw", () => {
    const { row, totaalBtw } = computeVatReturnRow(
      [{ subtotal_ex_vat: 1200, vat_amount: 0, vat_rate: 0, vat_scheme: "eu_reverse_charge", is_credit_note: false }],
      [],
    );
    expect(row.rubriek_3b_omzet).toBe(1200);
    expect(row.rubriek_3b_btw).toBe(0);
    expect(totaalBtw).toBe(0);
  });

  it("weegt voorbelasting met het zakelijk percentage", () => {
    const { row, voorbelasting, teBetalen, totaalBtw } = computeVatReturnRow(
      [{ subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, vat_scheme: "standard", is_credit_note: false }],
      [{ vat_amount: 100, business_percentage: 80 }],
    );
    expect(voorbelasting).toBe(80);
    expect(row.rubriek_5b).toBe(80);
    expect(teBetalen).toBe(Math.round((totaalBtw - 80) * 100) / 100);
  });

  it("trekt creditnota's af", () => {
    const { row } = computeVatReturnRow(
      [
        { subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, vat_scheme: "standard", is_credit_note: false },
        { subtotal_ex_vat: 200, vat_amount: 42, vat_rate: 21, vat_scheme: "standard", is_credit_note: true },
      ],
      [],
    );
    expect(row.rubriek_1a_omzet).toBe(800);
    expect(row.rubriek_1a_btw).toBe(168);
  });

  it("REGRESSIE: totaalBtw telt álle rubrieken, niet alleen 1a+1b+1c", () => {
    // Gemengde set; totaalBtw moet exact de canonieke som zijn.
    const invoices = [
      { subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, vat_scheme: "standard", is_credit_note: false },
      { subtotal_ex_vat: 100, vat_amount: 9, vat_rate: 9, vat_scheme: "standard", is_credit_note: false,
        invoice_lines: [{ amount: 100, vat_rate: 9 }] },
      { subtotal_ex_vat: 800, vat_amount: 0, vat_rate: 0, vat_scheme: "export_outside_eu", is_credit_note: false },
    ];
    const { totaalBtw, rubrieken } = computeVatReturnRow(invoices, []);
    const canonical = calculateBtwRubrieken(invoices, []);
    expect(totaalBtw).toBe(canonical.totaalBtw);
    // Som over alle negen btw-buckets.
    const sumAll =
      rubrieken["1a"].btw + rubrieken["1b"].btw + rubrieken["1c"].btw + rubrieken["1e"].btw +
      rubrieken["2a"].btw + rubrieken["3a"].btw + rubrieken["3b"].btw +
      rubrieken["4a"].btw + rubrieken["4b"].btw;
    expect(totaalBtw).toBe(Math.round(sumAll * 100) / 100);
  });

  it("is deterministisch: generate en preview produceren dezelfde rij", () => {
    const invoices = [
      { subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, vat_scheme: "standard", is_credit_note: false },
    ];
    const receipts = [{ vat_amount: 50, business_percentage: 100 }];
    const a = computeVatReturnRow(invoices, receipts);
    const b = computeVatReturnRow(invoices, receipts);
    expect(a.row).toEqual(b.row);
  });
});

describe("rubriekenToVatReturnRow", () => {
  function rubrieken(over: Partial<BtwRubrieken> = {}): BtwRubrieken {
    const z = { omzet: 0, btw: 0 };
    return {
      "1a": { ...z }, "1b": { ...z }, "1c": { ...z }, "1e": { ...z },
      "2a": { ...z }, "3a": { ...z }, "3b": { ...z }, "4a": { ...z }, "4b": { ...z },
      voorbelasting: 0, totaalBtw: 0, rubriek5g: 0, rubriek5gAfgerond: 0,
      ...over,
    };
  }

  it("vouwt 1e in de 1c-kolom en 3a in de 4b-kolom", () => {
    const row: VatReturnRubriekRow = rubriekenToVatReturnRow(
      rubrieken({
        "1c": { omzet: 100, btw: 6 },
        "1e": { omzet: 250, btw: 0 },
        "4b": { omzet: 0, btw: 0 },
        "3a": { omzet: 300, btw: 0 },
      }),
    );
    expect(row.rubriek_1c_omzet).toBe(350);
    expect(row.rubriek_1c_btw).toBe(6);
    expect(row.rubriek_4b_omzet).toBe(300);
  });
});

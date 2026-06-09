import { describe, it, expect } from "vitest";
import { receiptCostExVat } from "./receipt-cost";

describe("receiptCostExVat", () => {
  it("gebruikt amount_ex_vat als die er is", () => {
    expect(
      receiptCostExVat({ amount_ex_vat: 100, amount_inc_vat: 121, vat_rate: 21 }),
    ).toBe(100);
  });

  it("leidt ex af uit incl − BTW-bedrag", () => {
    expect(
      receiptCostExVat({ amount_ex_vat: null, amount_inc_vat: 121, vat_amount: 21, vat_rate: 21 }),
    ).toBe(100);
  });

  it("leidt ex af uit incl en tarief als het BTW-bedrag ontbreekt", () => {
    expect(
      receiptCostExVat({ amount_ex_vat: null, amount_inc_vat: 121, vat_rate: 21 }),
    ).toBe(100);
  });

  it("behandelt amount_ex_vat van 0 als leeg en valt terug op incl", () => {
    expect(
      receiptCostExVat({ amount_ex_vat: 0, amount_inc_vat: 109, vat_rate: 9 }),
    ).toBe(100);
  });

  it("leidt ex af uit BTW-bedrag en tarief als alleen die bekend zijn", () => {
    // €21 BTW bij 21% → €100 ex.
    expect(
      receiptCostExVat({ amount_ex_vat: null, amount_inc_vat: null, vat_amount: 21, vat_rate: 21 }),
    ).toBe(100);
  });

  it("neemt incl als kosten wanneer er geen tarief is", () => {
    expect(
      receiptCostExVat({ amount_ex_vat: null, amount_inc_vat: 100, vat_rate: null }),
    ).toBe(100);
  });

  it("hanteert 0%-bonnen correct (incl == ex)", () => {
    expect(
      receiptCostExVat({ amount_ex_vat: null, amount_inc_vat: 50, vat_rate: 0 }),
    ).toBe(50);
  });

  it("geeft 0 terug als er niets bruikbaars is", () => {
    expect(receiptCostExVat({ amount_ex_vat: null })).toBe(0);
    expect(receiptCostExVat({ amount_ex_vat: null, amount_inc_vat: null, vat_amount: null, vat_rate: null })).toBe(0);
  });
});

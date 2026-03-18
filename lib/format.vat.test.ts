import { describe, it, expect } from "vitest";
import { calculateVat, calculateLineTotals } from "./format";

describe("calculateVat", () => {
  it("berekent 21% BTW correct", () => {
    const result = calculateVat(100, 21);
    expect(result.subtotalExVat).toBe(100);
    expect(result.vatAmount).toBe(21);
    expect(result.totalIncVat).toBe(121);
  });

  it("berekent 9% BTW correct (verlaagd tarief)", () => {
    const result = calculateVat(100, 9);
    expect(result.subtotalExVat).toBe(100);
    expect(result.vatAmount).toBe(9);
    expect(result.totalIncVat).toBe(109);
  });

  it("berekent 0% BTW correct (vrijgesteld)", () => {
    const result = calculateVat(100, 0);
    expect(result.subtotalExVat).toBe(100);
    expect(result.vatAmount).toBe(0);
    expect(result.totalIncVat).toBe(100);
  });

  it("rondt correct af op 2 decimalen", () => {
    const result = calculateVat(33.33, 21);
    expect(result.subtotalExVat).toBe(33.33);
    expect(result.vatAmount).toBe(7);
    expect(result.totalIncVat).toBe(40.33);
  });

  it("geeft nullen bij nul bedrag", () => {
    const result = calculateVat(0, 21);
    expect(result.subtotalExVat).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.totalIncVat).toBe(0);
  });

  it("werkt met negatieve bedragen (creditnota)", () => {
    const result = calculateVat(-100, 21);
    expect(result.subtotalExVat).toBe(-100);
    expect(result.vatAmount).toBe(-21);
    expect(result.totalIncVat).toBe(-121);
  });

  it("rondt subtotaal af", () => {
    const result = calculateVat(10.999, 21);
    expect(result.subtotalExVat).toBe(11);
    expect(result.vatAmount).toBe(2.31);
    expect(result.totalIncVat).toBe(13.31);
  });
});

describe("calculateLineTotals", () => {
  it("berekent totalen van meerdere regels", () => {
    const lines = [
      { quantity: 10, rate: 95 },
      { quantity: 5, rate: 120 },
    ];
    const result = calculateLineTotals(lines, 21);
    // subtotal: 10*95 + 5*120 = 950 + 600 = 1550
    expect(result.subtotalExVat).toBe(1550);
    expect(result.vatAmount).toBe(325.5);
    expect(result.totalIncVat).toBe(1875.5);
  });

  it("berekent totaal van enkele regel", () => {
    const result = calculateLineTotals([{ quantity: 1, rate: 200 }], 21);
    expect(result.subtotalExVat).toBe(200);
    expect(result.vatAmount).toBe(42);
    expect(result.totalIncVat).toBe(242);
  });

  it("berekent met fractionele hoeveelheden", () => {
    const result = calculateLineTotals([{ quantity: 1.5, rate: 80 }], 21);
    // subtotal: 1.5 * 80 = 120
    expect(result.subtotalExVat).toBe(120);
    expect(result.vatAmount).toBe(25.2);
    expect(result.totalIncVat).toBe(145.2);
  });

  it("geeft nullen bij lege regels", () => {
    const result = calculateLineTotals([], 21);
    expect(result.subtotalExVat).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.totalIncVat).toBe(0);
  });
});

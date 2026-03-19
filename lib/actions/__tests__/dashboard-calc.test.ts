import { describe, it, expect } from "vitest";
import { calculateSafeToSpend, estimateIncomeTax } from "../../tax";

describe("estimateIncomeTax", () => {
  it("geeft 0 bij omzet onder zelfstandigenaftrek", () => {
    // €5.000 winst → ZA = €5.000, winstNaZA = 0 → IB = 0
    expect(estimateIncomeTax(5000)).toBe(0);
  });

  it("geeft 0 bij lage winst door heffingskorting", () => {
    // €10.000 winst → ZA €7.390, winstNaZA €2.610
    // MKB: €2.610 × 13,31% = €347,39 → belastbaar: €2.262,61
    // Bruto IB: €2.262,61 × 35,82% = €810,47
    // Heffingskorting: €3.362 (volledig)
    // Netto IB: max(0, 810,47 - 3.362) = 0
    expect(estimateIncomeTax(10000)).toBe(0);
  });

  it("berekent IB correct bij middeninkomsten", () => {
    // €50.000 winst
    const result = estimateIncomeTax(50000);
    // Moet positief zijn en aanzienlijk lager dan 37% flat
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(50000 * 0.37); // minder dan oud flat tarief
  });

  it("berekent hogere IB bij hoge inkomsten (derde schijf)", () => {
    const result = estimateIncomeTax(100000);
    expect(result).toBeGreaterThan(0);
    // Bij €100k zitten we in de derde schijf (49,5%)
    expect(result).toBeGreaterThan(estimateIncomeTax(76817));
  });

  it("trekt kosten af van winst", () => {
    const zonderKosten = estimateIncomeTax(50000, 0);
    const metKosten = estimateIncomeTax(50000, 10000);
    expect(metKosten).toBeLessThan(zonderKosten);
  });

  it("respecteert zelfstandigenaftrek toggle", () => {
    const metZA = estimateIncomeTax(50000, 0, true);
    const zonderZA = estimateIncomeTax(50000, 0, false);
    expect(zonderZA).toBeGreaterThan(metZA);
  });

  it("geeft 0 bij negatieve winst", () => {
    expect(estimateIncomeTax(0)).toBe(0);
    expect(estimateIncomeTax(-1000)).toBe(0);
    expect(estimateIncomeTax(5000, 10000)).toBe(0);
  });
});

describe("calculateSafeToSpend", () => {
  it("berekent safe-to-spend correct met standaard waarden", () => {
    const bankTx = [{ amount: 10000 }, { amount: -2000 }];
    const yearRevenue = [{ total_inc_vat: 12100, vat_amount: 2100 }];
    const outputVat = 2100;
    const inputVat = 500;

    const result = calculateSafeToSpend(bankTx, yearRevenue, outputVat, inputVat);

    expect(result.currentBalance).toBe(8000);
    expect(result.estimatedVat).toBe(1600); // max(0, 2100 - 500)
    // €10.000 netto omzet → na ZA + MKB + heffingskorting = €0 IB
    expect(result.estimatedIncomeTax).toBe(0);
    expect(result.reservedTotal).toBe(1600);
    expect(result.safeToSpend).toBe(6400); // 8000 - 1600
    expect(result.yearRevenueExVat).toBe(10000);
  });

  it("geeft nul bij lege bank transacties", () => {
    const result = calculateSafeToSpend([], [], 0, 0);

    expect(result.currentBalance).toBe(0);
    expect(result.estimatedVat).toBe(0);
    expect(result.estimatedIncomeTax).toBe(0);
    expect(result.reservedTotal).toBe(0);
    expect(result.safeToSpend).toBe(0);
    expect(result.taxShieldPotential).toBe(0);
    expect(result.yearRevenueExVat).toBe(0);
  });

  it("klempt safe-to-spend op 0 (nooit negatief)", () => {
    const bankTx = [{ amount: 100 }];
    const yearRevenue = [{ total_inc_vat: 72600, vat_amount: 12600 }];

    const result = calculateSafeToSpend(bankTx, yearRevenue, 12600, 0);

    // balance: 100, vat: 12600, plus IB → reserved > 100
    expect(result.safeToSpend).toBe(0);
  });

  it("geen tax shield bij lage omzet (< 10000)", () => {
    const bankTx = [{ amount: 5000 }];
    const yearRevenue = [{ total_inc_vat: 5000, vat_amount: 868 }];

    const result = calculateSafeToSpend(bankTx, yearRevenue, 868, 200);

    // revenue ex vat: 5000 - 868 = 4132 < 10000
    expect(result.taxShieldPotential).toBe(0);
  });

  it("tax shield beschikbaar bij hoge omzet (> 10000)", () => {
    const bankTx = [{ amount: 50000 }];
    const yearRevenue = [{ total_inc_vat: 60500, vat_amount: 10500 }];

    const result = calculateSafeToSpend(bankTx, yearRevenue, 10500, 3000);

    // revenue ex vat: 60500 - 10500 = 50000 > 10000
    expect(result.taxShieldPotential).toBe(370);
  });

  it("trekt kosten af bij IB-berekening in safe-to-spend", () => {
    const bankTx = [{ amount: 50000 }];
    const yearRevenue = [{ total_inc_vat: 60500, vat_amount: 10500 }];

    const zonderKosten = calculateSafeToSpend(bankTx, yearRevenue, 10500, 0, 0);
    const metKosten = calculateSafeToSpend(bankTx, yearRevenue, 10500, 0, 15000);

    // Met kosten moet IB lager zijn → meer safe-to-spend
    expect(metKosten.estimatedIncomeTax).toBeLessThan(zonderKosten.estimatedIncomeTax);
    expect(metKosten.safeToSpend).toBeGreaterThan(zonderKosten.safeToSpend);
  });

  it("respecteert zelfstandigenaftrek toggle in safe-to-spend", () => {
    const bankTx = [{ amount: 50000 }];
    const yearRevenue = [{ total_inc_vat: 60500, vat_amount: 10500 }];

    const metZA = calculateSafeToSpend(bankTx, yearRevenue, 10500, 0, 0, true);
    const zonderZA = calculateSafeToSpend(bankTx, yearRevenue, 10500, 0, 0, false);

    // Zonder ZA moet IB hoger zijn
    expect(zonderZA.estimatedIncomeTax).toBeGreaterThan(metZA.estimatedIncomeTax);
  });

  it("BTW input hoger dan output geeft 0 BTW reserve", () => {
    const bankTx = [{ amount: 5000 }];
    const yearRevenue = [{ total_inc_vat: 1210, vat_amount: 210 }];

    const result = calculateSafeToSpend(bankTx, yearRevenue, 210, 500);

    // outputVat - inputVat = -290 → clamped to 0
    expect(result.estimatedVat).toBe(0);
  });
});

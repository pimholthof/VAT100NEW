import { describe, it, expect } from "vitest";
import { calculateSafeToSpend } from "../../tax";

describe("calculateSafeToSpend", () => {
  it("berekent safe-to-spend correct met standaard waarden", () => {
    const bankTx = [{ amount: 10000 }, { amount: -2000 }];
    const yearRevenue = [{ total_inc_vat: 12100, vat_amount: 2100 }];
    const outputVat = 2100;
    const inputVat = 500;

    const result = calculateSafeToSpend(bankTx, yearRevenue, outputVat, inputVat);

    expect(result.currentBalance).toBe(8000);
    expect(result.estimatedVat).toBe(1600); // max(0, 2100 - 500)
    // income tax: (12100 - 2100) * 0.37 = 10000 * 0.37 = 3700
    expect(result.estimatedIncomeTax).toBe(3700);
    expect(result.reservedTotal).toBe(5300); // 1600 + 3700
    expect(result.safeToSpend).toBe(2700); // 8000 - 5300
    // revenue ex vat = 10000, threshold is > 10000 (strict), so no shield
    expect(result.taxShieldPotential).toBe(0);
  });

  it("geeft nul bij lege bank transacties", () => {
    const result = calculateSafeToSpend([], [], 0, 0);

    expect(result.currentBalance).toBe(0);
    expect(result.estimatedVat).toBe(0);
    expect(result.estimatedIncomeTax).toBe(0);
    expect(result.reservedTotal).toBe(0);
    expect(result.safeToSpend).toBe(0);
    expect(result.taxShieldPotential).toBe(0);
  });

  it("klempt safe-to-spend op 0 (nooit negatief)", () => {
    const bankTx = [{ amount: 1000 }];
    const yearRevenue = [{ total_inc_vat: 24200, vat_amount: 4200 }];

    const result = calculateSafeToSpend(bankTx, yearRevenue, 4200, 0);

    // balance: 1000, vat: 4200, income tax: 20000*0.37=7400, reserved: 11600
    // safe: 1000 - 11600 = -10600 → clamped to 0
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

  it("BTW input hoger dan output geeft 0 BTW reserve", () => {
    const bankTx = [{ amount: 5000 }];
    const yearRevenue = [{ total_inc_vat: 1210, vat_amount: 210 }];

    const result = calculateSafeToSpend(bankTx, yearRevenue, 210, 500);

    // outputVat - inputVat = -290 → clamped to 0
    expect(result.estimatedVat).toBe(0);
  });
});

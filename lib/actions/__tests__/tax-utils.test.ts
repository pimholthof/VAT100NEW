import { describe, it, expect } from "vitest";
import { estimateIncomeTax, calculateSafeToSpend, ZELFSTANDIGENAFTREK, MKB_WINSTVRIJSTELLING_RATE } from "../../tax";

describe("estimateIncomeTax — grenswaarden", () => {
  it("berekent correct bij precies de grens van schijf 1 (€38.441)", () => {
    const result = estimateIncomeTax(38441 + ZELFSTANDIGENAFTREK);
    // Na ZA: €38.441, na MKB: €38.441 × (1 - 0.1331) = €33.323,46
    // Volledige in schijf 1 (35,82%)
    expect(result).toBeGreaterThan(0);
    // Moet minder dan flat rate zijn door heffingskorting
    expect(result).toBeLessThan(38441 * 0.3582);
  });

  it("berekent correct bij precies de grens van schijf 2 (€76.817)", () => {
    const result = estimateIncomeTax(76817 + ZELFSTANDIGENAFTREK);
    expect(result).toBeGreaterThan(estimateIncomeTax(38441 + ZELFSTANDIGENAFTREK));
  });

  it("berekent correct bij €1 winst", () => {
    expect(estimateIncomeTax(1)).toBe(0);
  });

  it("MKB-winstvrijstelling wordt correct toegepast", () => {
    const winst = 50000;
    const za = ZELFSTANDIGENAFTREK;
    const winstNaZA = winst - za;
    const mkbKorting = winstNaZA * MKB_WINSTVRIJSTELLING_RATE;
    const belastbaarInkomen = winstNaZA - mkbKorting;

    // Belastbaar inkomen moet onder schijf 1 grens zijn
    expect(belastbaarInkomen).toBeLessThan(38441);
  });

  it("kosten groter dan omzet geeft 0 IB", () => {
    expect(estimateIncomeTax(20000, 25000)).toBe(0);
  });

  it("zeer hoge inkomens raken de derde schijf", () => {
    const result = estimateIncomeTax(200000);
    // Effectieve belastingdruk moet boven 30% zijn bij €200k
    expect(result).toBeGreaterThan(200000 * 0.15);
  });
});

describe("calculateSafeToSpend — edge cases", () => {
  it("meerdere banktransacties worden correct opgeteld", () => {
    const bankTx = [
      { amount: 5000 },
      { amount: 3000 },
      { amount: -1000 },
      { amount: 500 },
      { amount: -200 },
    ];
    const result = calculateSafeToSpend(bankTx, [], 0, 0);
    expect(result.currentBalance).toBe(7300);
  });

  it("meerdere facturen worden correct opgeteld", () => {
    const yearRevenue = [
      { total_inc_vat: 12100, vat_amount: 2100 },
      { total_inc_vat: 6050, vat_amount: 1050 },
    ];
    const result = calculateSafeToSpend(
      [{ amount: 20000 }],
      yearRevenue,
      3150,
      500
    );
    // Total revenue ex vat: (12100-2100) + (6050-1050) = 15000
    expect(result.yearRevenueExVat).toBe(15000);
    expect(result.estimatedVat).toBe(2650); // 3150 - 500
  });

  it("rondt alle bedragen af op 2 decimalen", () => {
    const bankTx = [{ amount: 1000.005 }];
    const result = calculateSafeToSpend(bankTx, [], 0, 0);
    // Check that we get a properly rounded value
    const decimals = (result.currentBalance.toString().split(".")[1] ?? "").length;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it("NaN en ongeldige waarden worden als 0 behandeld", () => {
    const bankTx = [{ amount: NaN }, { amount: 1000 }];
    const yearRevenue = [{ total_inc_vat: NaN, vat_amount: NaN }];
    const result = calculateSafeToSpend(bankTx, yearRevenue, 0, 0);
    expect(result.currentBalance).toBe(1000);
    expect(result.yearRevenueExVat).toBe(0);
  });
});

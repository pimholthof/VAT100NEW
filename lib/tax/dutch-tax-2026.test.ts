import { describe, it, expect } from "vitest";
import {
  calculateBox1Tax,
  calculateAlgemeneHeffingskorting,
  calculateArbeidskorting,
  calculateKIA,
  calculateYearlyDepreciation,
  calculateZZPTaxProjection,
  TAX_CONSTANTS,
} from "./dutch-tax-2026";

// ─── Box 1: Inkomstenbelasting ───

describe("calculateBox1Tax", () => {
  it("returns 0 for zero income", () => {
    expect(calculateBox1Tax(0)).toBe(0);
  });

  it("returns 0 for negative income", () => {
    expect(calculateBox1Tax(-5000)).toBe(0);
  });

  it("calculates correctly within first bracket (€20.000)", () => {
    const tax = calculateBox1Tax(20_000);
    expect(tax).toBe(Math.round(20_000 * 0.3575 * 100) / 100);
  });

  it("calculates correctly at first bracket boundary (€38.883)", () => {
    const tax = calculateBox1Tax(38_883);
    expect(tax).toBeCloseTo(38_883 * 0.3575, 1);
  });

  it("calculates correctly in second bracket (€50.000)", () => {
    const tax = calculateBox1Tax(50_000);
    const expected =
      38_883 * 0.3575 + (50_000 - 38_883) * 0.3756;
    expect(tax).toBeCloseTo(expected, 1);
  });

  it("calculates correctly at second bracket boundary (€78.426)", () => {
    const tax = calculateBox1Tax(78_426);
    const expected =
      38_883 * 0.3575 + (78_426 - 38_883) * 0.3756;
    expect(tax).toBeCloseTo(expected, 1);
  });

  it("calculates correctly in third bracket (€100.000)", () => {
    const tax = calculateBox1Tax(100_000);
    const expected =
      38_883 * 0.3575 +
      (78_426 - 38_883) * 0.3756 +
      (100_000 - 78_426) * 0.495;
    expect(tax).toBeCloseTo(expected, 1);
  });

  it("handles very high income (€500.000)", () => {
    const tax = calculateBox1Tax(500_000);
    expect(tax).toBeGreaterThan(0);
    // Third bracket rate for bulk of income
    expect(tax).toBeGreaterThan(200_000);
  });
});

// ─── Algemene Heffingskorting ───

describe("calculateAlgemeneHeffingskorting", () => {
  it("returns maximum for income below afbouw start (€29.739)", () => {
    expect(calculateAlgemeneHeffingskorting(0)).toBe(TAX_CONSTANTS.ahkMax);
    expect(calculateAlgemeneHeffingskorting(20_000)).toBe(TAX_CONSTANTS.ahkMax);
    expect(calculateAlgemeneHeffingskorting(29_739)).toBe(TAX_CONSTANTS.ahkMax);
  });

  it("reduces for income above afbouw start", () => {
    const ahk = calculateAlgemeneHeffingskorting(50_000);
    expect(ahk).toBeLessThan(TAX_CONSTANTS.ahkMax);
    expect(ahk).toBeGreaterThan(0);
  });

  it("reaches 0 for high income", () => {
    // AHK reaches 0 at approximately €78.426
    const ahk = calculateAlgemeneHeffingskorting(80_000);
    expect(ahk).toBe(0);
  });

  it("never returns negative", () => {
    expect(calculateAlgemeneHeffingskorting(200_000)).toBe(0);
  });
});

// ─── Arbeidskorting ───

describe("calculateArbeidskorting", () => {
  it("returns 0 for zero income", () => {
    expect(calculateArbeidskorting(0)).toBe(0);
  });

  it("returns 0 for negative income", () => {
    expect(calculateArbeidskorting(-1000)).toBe(0);
  });

  it("builds up in traject 1 (€0 - €11.691)", () => {
    const ak = calculateArbeidskorting(10_000);
    expect(ak).toBeCloseTo(10_000 * 0.08521, 1);
  });

  it("builds up in traject 2 (€11.691 - €25.224)", () => {
    const ak = calculateArbeidskorting(20_000);
    const expected =
      11_691 * 0.08521 + (20_000 - 11_691) * 0.31994;
    expect(ak).toBeCloseTo(expected, 1);
  });

  it("builds up in traject 3 (€25.224 - €45.593)", () => {
    const ak = calculateArbeidskorting(35_000);
    const expected =
      11_691 * 0.08521 +
      (25_224 - 11_691) * 0.31994 +
      (35_000 - 25_224) * 0.019;
    expect(ak).toBeCloseTo(expected, 1);
  });

  it("starts declining after €45.593", () => {
    const akAtPeak = calculateArbeidskorting(45_593);
    const akAfterPeak = calculateArbeidskorting(60_000);
    expect(akAfterPeak).toBeLessThan(akAtPeak);
  });

  it("never returns negative", () => {
    expect(calculateArbeidskorting(200_000)).toBe(0);
  });

  it("reaches maximum around €45.593", () => {
    const ak = calculateArbeidskorting(45_593);
    // Allow small rounding difference due to discrete bracket boundaries
    expect(Math.abs(ak - TAX_CONSTANTS.akMax)).toBeLessThan(2);
  });
});

// ─── KIA (Kleinschaligheidsinvesteringsaftrek) ───

describe("calculateKIA", () => {
  it("returns 0 below minimum (€2.901)", () => {
    expect(calculateKIA(0)).toBe(0);
    expect(calculateKIA(2_900)).toBe(0);
  });

  it("returns 28% for investments at minimum (€2.901)", () => {
    const kia = calculateKIA(2_901);
    expect(kia).toBeCloseTo(2_901 * 0.28, 1);
  });

  it("returns 28% in tier 1 (€2.901 - €71.683)", () => {
    const kia = calculateKIA(50_000);
    expect(kia).toBeCloseTo(50_000 * 0.28, 1);
  });

  it("returns fixed €20.072 in tier 2 (€71.683 - €132.746)", () => {
    expect(calculateKIA(100_000)).toBe(20_072);
  });

  it("declines in tier 3 (€132.746 - €398.236)", () => {
    const kia = calculateKIA(200_000);
    const expected = 20_072 - (200_000 - 132_746) * 0.0756;
    expect(kia).toBeCloseTo(expected, 1);
  });

  it("returns 0 above maximum (€398.236)", () => {
    expect(calculateKIA(400_000)).toBe(0);
  });

  it("returns 0 for negative amounts", () => {
    expect(calculateKIA(-1000)).toBe(0);
  });
});

// ─── Afschrijving (Depreciation) ───

describe("calculateYearlyDepreciation", () => {
  it("calculates pro-rata first year depreciation", () => {
    // Bought July 2026 (month 6, 0-based) → 6 months remaining
    const dep = calculateYearlyDepreciation(10_000, 0, 5, "2026-07-01", 2026);
    const fullYear = 10_000 / 5; // €2.000
    const proRata = fullYear * (6 / 12); // €1.000
    expect(dep.jaarAfschrijving).toBeCloseTo(proRata, 1);
  });

  it("calculates full year depreciation in subsequent years", () => {
    const dep = calculateYearlyDepreciation(10_000, 0, 5, "2025-01-01", 2026);
    expect(dep.jaarAfschrijving).toBeCloseTo(2_000, 1);
  });

  it("respects residual value", () => {
    const dep = calculateYearlyDepreciation(10_000, 2_000, 5, "2025-01-01", 2026);
    // Afschrijfbaar = 10.000 - 2.000 = 8.000 / 5 = 1.600/jaar
    expect(dep.jaarAfschrijving).toBeCloseTo(1_600, 1);
  });

  it("marks fully depreciated assets", () => {
    const dep = calculateYearlyDepreciation(10_000, 0, 5, "2020-01-01", 2026);
    expect(dep.isFullyDepreciated).toBe(true);
    expect(dep.boekwaarde).toBe(0);
  });

  it("respects 20% max depreciation rate", () => {
    // 2 year lifespan → 50%/year → capped at 20%
    const dep = calculateYearlyDepreciation(10_000, 0, 2, "2026-01-01", 2026);
    expect(dep.jaarAfschrijving).toBeLessThanOrEqual(2_000);
  });
});

// ─── Integration: Full ZZP Tax Projection ───

describe("calculateZZPTaxProjection", () => {
  it("handles zero income scenario", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 0,
      jaarKostenExBtw: 0,
      investeringen: [],
      maandenVerstreken: 6,
    });
    expect(result.nettoIB).toBe(0);
    expect(result.brutoWinst).toBe(0);
    expect(result.belastbaarInkomen).toBe(0);
  });

  it("calculates realistic freelancer scenario (€60k revenue)", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 60_000,
      jaarKostenExBtw: 5_000,
      investeringen: [],
      maandenVerstreken: 12,
    });

    // Verify chain of deductions
    expect(result.brutoOmzet).toBe(60_000);
    expect(result.kosten).toBe(5_000);
    expect(result.brutoWinst).toBe(55_000);

    // Zelfstandigenaftrek should be applied
    expect(result.zelfstandigenaftrek).toBe(1_200);

    // MKB vrijstelling should reduce income
    expect(result.mkbVrijstelling).toBeGreaterThan(0);

    // Net IB should be positive but less than gross tax
    expect(result.nettoIB).toBeGreaterThan(0);
    expect(result.nettoIB).toBeLessThan(result.inkomstenbelasting);

    // Effective rate should be reasonable (10-25% for this income)
    expect(result.effectiefTarief).toBeGreaterThan(5);
    expect(result.effectiefTarief).toBeLessThan(30);
  });

  it("applies KIA for qualifying investments", () => {
    const withoutKIA = calculateZZPTaxProjection({
      jaarOmzetExBtw: 60_000,
      jaarKostenExBtw: 5_000,
      investeringen: [],
      maandenVerstreken: 12,
    });

    const withKIA = calculateZZPTaxProjection({
      jaarOmzetExBtw: 60_000,
      jaarKostenExBtw: 5_000,
      investeringen: [
        {
          id: "1",
          omschrijving: "MacBook Pro",
          aanschafprijs: 3_000,
          aanschafDatum: "2026-03-01",
          levensduur: 5,
          restwaarde: 0,
        },
      ],
      maandenVerstreken: 12,
    });

    expect(withKIA.kia).toBeGreaterThan(0);
    expect(withKIA.nettoIB).toBeLessThan(withoutKIA.nettoIB);
  });

  it("annualizes projections for partial year", () => {
    const halfYear = calculateZZPTaxProjection({
      jaarOmzetExBtw: 30_000,
      jaarKostenExBtw: 2_500,
      investeringen: [],
      maandenVerstreken: 6,
    });

    // Projected annual revenue should be ~double
    expect(halfYear.prognoseJaarOmzet).toBeCloseTo(60_000, 0);
    expect(halfYear.prognoseJaarKosten).toBeCloseTo(5_000, 0);
  });

  it("generates savings tips for freelancers near KIA threshold", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 50_000,
      jaarKostenExBtw: 3_000,
      investeringen: [
        {
          id: "1",
          omschrijving: "Monitor",
          aanschafprijs: 800,
          aanschafDatum: "2026-02-01",
          levensduur: 5,
          restwaarde: 0,
        },
      ],
      maandenVerstreken: 6,
    });

    // Should have tips since investments are in KIA range
    expect(result.bespaartips.length).toBeGreaterThan(0);
  });

  it("applies kilometer deduction", () => {
    const without = calculateZZPTaxProjection({
      jaarOmzetExBtw: 50_000,
      jaarKostenExBtw: 3_000,
      investeringen: [],
      maandenVerstreken: 12,
    });

    const withKm = calculateZZPTaxProjection({
      jaarOmzetExBtw: 50_000,
      jaarKostenExBtw: 3_000,
      investeringen: [],
      maandenVerstreken: 12,
      kilometerAftrek: 2_000, // €0.23/km * ~8700km
    });

    expect(withKm.brutoWinst).toBeLessThan(without.brutoWinst);
    expect(withKm.nettoIB).toBeLessThan(without.nettoIB);
  });
});

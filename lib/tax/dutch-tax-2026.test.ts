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

const round2 = (v: number) => Math.round(v * 100) / 100;

// ─── Box 1: Inkomstenbelasting ───

describe("calculateBox1Tax", () => {
  it("geeft 0 bij negatief inkomen", () => {
    expect(calculateBox1Tax(-5000)).toBe(0);
  });

  it("geeft 0 bij nul inkomen", () => {
    expect(calculateBox1Tax(0)).toBe(0);
  });

  it("berekent eerste schijf correct (35,75%)", () => {
    // €10.000 × 35,75% = €3.575
    expect(calculateBox1Tax(10_000)).toBe(3_575);
  });

  it("berekent op grens eerste schijf (€38.883)", () => {
    const expected = round2(38_883 * 0.3575);
    expect(calculateBox1Tax(38_883)).toBe(expected);
  });

  it("berekent tweede schijf correct (37,56%)", () => {
    const income = 50_000;
    const firstBracket = round2(38_883 * 0.3575);
    const secondBracket = round2((income - 38_883) * 0.3756);
    expect(calculateBox1Tax(income)).toBe(round2(firstBracket + secondBracket));
  });

  it("berekent derde schijf correct (49,5%)", () => {
    const income = 100_000;
    const first = round2(38_883 * 0.3575);
    const second = round2((78_426 - 38_883) * 0.3756);
    const third = round2((income - 78_426) * 0.495);
    expect(calculateBox1Tax(income)).toBe(round2(first + second + third));
  });

  it("berekent hoge inkomens correct", () => {
    const result = calculateBox1Tax(200_000);
    expect(result).toBeGreaterThan(0);
    // Moet meer zijn dan alleen eerste schijf tarief
    expect(result).toBeGreaterThan(200_000 * 0.3575);
  });
});

// ─── Algemene Heffingskorting ───

describe("calculateAlgemeneHeffingskorting", () => {
  it("geeft maximum bij laag inkomen", () => {
    expect(calculateAlgemeneHeffingskorting(0)).toBe(TAX_CONSTANTS.ahkMax);
    expect(calculateAlgemeneHeffingskorting(20_000)).toBe(TAX_CONSTANTS.ahkMax);
  });

  it("geeft maximum tot afbouwgrens (€29.739)", () => {
    expect(calculateAlgemeneHeffingskorting(29_739)).toBe(TAX_CONSTANTS.ahkMax);
  });

  it("begint afbouw boven €29.739", () => {
    const result = calculateAlgemeneHeffingskorting(35_000);
    expect(result).toBeLessThan(TAX_CONSTANTS.ahkMax);
    expect(result).toBeGreaterThan(0);
  });

  it("geeft 0 of positief bij hoge inkomens", () => {
    const result = calculateAlgemeneHeffingskorting(100_000);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("wordt nooit negatief", () => {
    expect(calculateAlgemeneHeffingskorting(500_000)).toBe(0);
  });
});

// ─── Arbeidskorting ───

describe("calculateArbeidskorting", () => {
  it("geeft 0 bij nul inkomen", () => {
    expect(calculateArbeidskorting(0)).toBe(0);
  });

  it("geeft 0 bij negatief inkomen", () => {
    expect(calculateArbeidskorting(-1000)).toBe(0);
  });

  it("berekent traject 1 correct (8,521%)", () => {
    const income = 10_000;
    const expected = round2(income * 0.08521);
    expect(calculateArbeidskorting(income)).toBe(expected);
  });

  it("berekent traject 2 correct", () => {
    const income = 20_000;
    const t1 = 11_691 * 0.08521;
    const t2 = (income - 11_691) * 0.31994;
    expect(calculateArbeidskorting(income)).toBe(round2(t1 + t2));
  });

  it("berekent traject 3 correct", () => {
    const income = 40_000;
    const t1 = 11_691 * 0.08521;
    const t2 = (25_224 - 11_691) * 0.31994;
    const t3 = (income - 25_224) * 0.019;
    expect(calculateArbeidskorting(income)).toBe(round2(t1 + t2 + t3));
  });

  it("berekent afbouw bij hoog inkomen", () => {
    const result = calculateArbeidskorting(80_000);
    expect(result).toBeGreaterThan(0);
    // Moet lager zijn dan maximum
    expect(result).toBeLessThan(TAX_CONSTANTS.akMax);
  });

  it("wordt nooit negatief", () => {
    expect(calculateArbeidskorting(200_000)).toBe(0);
  });
});

// ─── KIA (Kleinschaligheidsinvesteringsaftrek) ───

describe("calculateKIA", () => {
  it("geeft 0 onder drempel (€2.901)", () => {
    expect(calculateKIA(0)).toBe(0);
    expect(calculateKIA(2_900)).toBe(0);
  });

  it("berekent 28% bij drempel exact", () => {
    expect(calculateKIA(2_901)).toBe(round2(2_901 * 0.28));
  });

  it("berekent 28% in eerste schijf", () => {
    expect(calculateKIA(10_000)).toBe(round2(10_000 * 0.28));
    expect(calculateKIA(50_000)).toBe(round2(50_000 * 0.28));
  });

  it("geeft vast bedrag (€20.072) in tweede schijf", () => {
    expect(calculateKIA(80_000)).toBe(20_072);
    expect(calculateKIA(130_000)).toBe(20_072);
  });

  it("bouwt af in derde schijf", () => {
    const investment = 200_000;
    const expected = round2(20_072 - (investment - 132_746) * 0.0756);
    expect(calculateKIA(investment)).toBe(expected);
  });

  it("geeft 0 boven bovengrens (€398.236)", () => {
    expect(calculateKIA(400_000)).toBe(0);
  });

  it("wordt nooit negatief in afbouwfase", () => {
    expect(calculateKIA(395_000)).toBeGreaterThanOrEqual(0);
  });

  it("geeft 0 bij negatief bedrag", () => {
    expect(calculateKIA(-1000)).toBe(0);
  });
});

// ─── Afschrijving ───

describe("calculateYearlyDepreciation", () => {
  it("berekent standaard afschrijving (5 jaar)", () => {
    const result = calculateYearlyDepreciation(
      5000, 0, 5, "2026-01-01", 2026
    );
    expect(result.jaarAfschrijving).toBe(1000);
    expect(result.boekwaarde).toBe(4000);
  });

  it("houdt rekening met restwaarde", () => {
    const result = calculateYearlyDepreciation(
      5000, 500, 5, "2026-01-01", 2026
    );
    // Afschrijfbaar: 5000 - 500 = 4500, per jaar: 900
    expect(result.jaarAfschrijving).toBe(900);
  });

  it("berekent pro-rata eerste jaar (aanschaf in juli)", () => {
    const result = calculateYearlyDepreciation(
      6000, 0, 5, "2026-07-01", 2026
    );
    // 1200/jaar, eerste jaar: 6/12 × 1200 = 600
    expect(result.jaarAfschrijving).toBe(600);
  });

  it("respecteert 20% maximum per jaar", () => {
    // 10.000 met levensduur 3 jaar → 3333/jaar, maar max 20% = 2000
    const result = calculateYearlyDepreciation(
      10_000, 0, 3, "2026-01-01", 2026
    );
    expect(result.jaarAfschrijving).toBeLessThanOrEqual(2000);
  });

  it("markeert volledig afgeschreven", () => {
    const result = calculateYearlyDepreciation(
      5000, 0, 5, "2020-01-01", 2026
    );
    expect(result.isFullyDepreciated).toBe(true);
    expect(result.boekwaarde).toBe(0);
  });

  it("geeft correcte boekwaarde na meerdere jaren", () => {
    const result = calculateYearlyDepreciation(
      10_000, 0, 5, "2024-01-01", 2026
    );
    // Jaar 1 (2024): 2000, Jaar 2 (2025): 2000, Jaar 3 (2026): 2000
    expect(result.totaalAfgeschreven).toBe(6000);
    expect(result.boekwaarde).toBe(4000);
  });
});

// ─── End-to-end: ZZP Tax Projection ───

describe("calculateZZPTaxProjection", () => {
  it("berekent complete projectie voor gemiddelde ZZP'er", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 60_000,
      jaarKostenExBtw: 5_000,
      investeringen: [],
      maandenVerstreken: 12,
    });

    expect(result.brutoOmzet).toBe(60_000);
    expect(result.kosten).toBe(5_000);
    expect(result.brutoWinst).toBe(55_000);
    expect(result.zelfstandigenaftrek).toBe(1_200);
    expect(result.nettoIB).toBeGreaterThan(0);
    expect(result.effectiefTarief).toBeGreaterThan(0);
    expect(result.effectiefTarief).toBeLessThan(50);
  });

  it("berekent KIA correct bij investeringen", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 80_000,
      jaarKostenExBtw: 10_000,
      investeringen: [
        {
          id: "1",
          omschrijving: "MacBook Pro",
          aanschafprijs: 3000,
          aanschafDatum: "2026-03-01",
          levensduur: 5,
          restwaarde: 0,
        },
      ],
      maandenVerstreken: 6,
      huidigJaar: 2026,
    });

    expect(result.kia).toBe(round2(3000 * 0.28));
    expect(result.totalInvestments).toBe(3000);
    expect(result.afschrijvingDetails).toHaveLength(1);
  });

  it("filtert investeringen onder €450 voor KIA", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 50_000,
      jaarKostenExBtw: 3_000,
      investeringen: [
        {
          id: "1",
          omschrijving: "Klein materiaal",
          aanschafprijs: 300,
          aanschafDatum: "2026-01-01",
          levensduur: 3,
          restwaarde: 0,
        },
      ],
      maandenVerstreken: 12,
      huidigJaar: 2026,
    });

    // Investering < €450 telt niet mee voor KIA
    expect(result.kia).toBe(0);
    // En ook niet in afschrijvingsdetails
    expect(result.afschrijvingDetails).toHaveLength(0);
  });

  it("beperkt zelfstandigenaftrek tot brutowinst", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 2_000,
      jaarKostenExBtw: 1_500,
      investeringen: [],
      maandenVerstreken: 12,
    });

    // Winst = 500, zelfstandigenaftrek max 1200 maar beperkt tot winst
    expect(result.zelfstandigenaftrek).toBe(500);
    expect(result.belastbaarInkomen).toBe(0);
    expect(result.nettoIB).toBe(0);
  });

  it("annualiseert correct bij halfjaar", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 30_000,
      jaarKostenExBtw: 2_000,
      investeringen: [],
      maandenVerstreken: 6,
    });

    expect(result.prognoseJaarOmzet).toBe(60_000);
    expect(result.prognoseJaarKosten).toBe(4_000);
  });

  it("genereert bespaartips", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 80_000,
      jaarKostenExBtw: 10_000,
      investeringen: [],
      maandenVerstreken: 9,
    });

    expect(result.bespaartips.length).toBeGreaterThan(0);
  });

  it("berekent kilometervergoeding aftrek", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 60_000,
      jaarKostenExBtw: 5_000,
      investeringen: [],
      maandenVerstreken: 12,
      kilometerAftrek: 2_000,
    });

    // Brutowinst moet lager zijn door kilometerAftrek
    expect(result.brutoWinst).toBe(53_000); // 60000 - 5000 - 0 - 2000
  });
});

// ─── Belastingdienst Rekenvoorbeelden 2026 ───

describe("Belastingdienst rekenvoorbeelden 2026 — consistentiecheck", () => {
  it("Box1 + heffingskortingen zijn consistent bij €35.000", () => {
    const inkomen = 35_000;
    const ib = calculateBox1Tax(inkomen);
    const ahk = calculateAlgemeneHeffingskorting(inkomen);
    const ak = calculateArbeidskorting(inkomen);
    const netto = Math.max(0, round2(ib - ahk - ak));

    // IB moet in eerste schijf vallen
    expect(ib).toBe(round2(35_000 * 0.3575));
    // AHK is boven afbouwgrens (29739), dus afgebouwd
    expect(ahk).toBeLessThan(TAX_CONSTANTS.ahkMax);
    expect(ahk).toBeGreaterThan(0);
    // Netto < bruto IB
    expect(netto).toBeLessThan(ib);
    expect(netto).toBeGreaterThan(0);
  });

  it("Box1 schijfovergangen zijn exact", () => {
    // Exact op de grens van schijf 1 → 2
    const grens1 = calculateBox1Tax(38_883);
    expect(grens1).toBe(round2(38_883 * 0.3575));

    // €1 boven de grens
    const grens1plus1 = calculateBox1Tax(38_884);
    const expected = round2(38_883 * 0.3575 + 1 * 0.3756);
    expect(grens1plus1).toBe(expected);

    // Exact op de grens van schijf 2 → 3
    const grens2 = calculateBox1Tax(78_426);
    const expectedGrenz2 = round2(38_883 * 0.3575 + (78_426 - 38_883) * 0.3756);
    expect(grens2).toBe(expectedGrenz2);
  });

  it("KIA-schijfovergangen zijn exact", () => {
    // Net onder minimum
    expect(calculateKIA(2_900)).toBe(0);
    // Exact op minimum
    expect(calculateKIA(2_901)).toBe(round2(2_901 * 0.28));
    // Bovengrens tier 1 → tier 2
    expect(calculateKIA(71_683)).toBe(round2(71_683 * 0.28));
    expect(calculateKIA(71_684)).toBe(20_072);
    // Bovengrens tier 2 → tier 3
    expect(calculateKIA(132_746)).toBe(20_072);
    // Boven bovengrens
    expect(calculateKIA(398_237)).toBe(0);
  });

  it("volledig ZZP-scenario: €75k omzet, €8k kosten, €10k investering", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 75_000,
      jaarKostenExBtw: 8_000,
      investeringen: [
        {
          id: "1",
          omschrijving: "MacBook Pro",
          aanschafprijs: 3_500,
          aanschafDatum: "2026-02-15",
          levensduur: 5,
          restwaarde: 0,
        },
        {
          id: "2",
          omschrijving: "Camera systeem",
          aanschafprijs: 6_500,
          aanschafDatum: "2026-06-01",
          levensduur: 5,
          restwaarde: 500,
        },
      ],
      maandenVerstreken: 12,
      huidigJaar: 2026,
    });

    // KIA: totaal investeringen = 3500 + 6500 = 10000, beide >= 450
    expect(result.totalInvestments).toBe(10_000);
    expect(result.kia).toBe(round2(10_000 * 0.28));
    // Zelfstandigenaftrek = 1200
    expect(result.zelfstandigenaftrek).toBe(1_200);
    // Brutowinst > 0 (75000 - 8000 - afschrijvingen)
    expect(result.brutoWinst).toBeGreaterThan(0);
    // Afschrijving details: 2 items
    expect(result.afschrijvingDetails).toHaveLength(2);
    // Netto IB > 0
    expect(result.nettoIB).toBeGreaterThan(0);
  });
});

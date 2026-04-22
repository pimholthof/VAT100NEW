import { describe, it, expect } from "vitest";
import {
  CONFIDENCE_THRESHOLDS,
  calculateInvestmentTaxSaving,
  calculateKIAThresholdGap,
  calculateAuditScore,
  toHumanReviewTitle,
  toHumanReviewDescription,
  getMissingReceiptConfidence,
  generateKIAThresholdDescription,
  generateInvestmentSuggestionDescription,
} from "./fiscal-claim-validator";
import {
  calculateZZPTaxProjection,
  calculateBox1Tax,
  calculateKIA,
  TAX_CONSTANTS,
} from "./dutch-tax-2026";

const round2 = (v: number) => Math.round(v * 100) / 100;

// ─── Pillar 1: Deterministic Core — Belastingdienst Rekenvoorbeelden 2026 ───

describe("Belastingdienst rekenvoorbeelden 2026", () => {
  it("Scenario A: freelancer €45k omzet, €3k kosten, €5k investering", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 45_000,
      jaarKostenExBtw: 3_000,
      investeringen: [
        {
          id: "1",
          omschrijving: "Camera",
          aanschafprijs: 5_000,
          aanschafDatum: "2026-01-01",
          levensduur: 5,
          restwaarde: 0,
        },
      ],
      maandenVerstreken: 12,
      huidigJaar: 2026,
    });

    // Afschrijving: 5000 / 5 = 1000/jaar
    expect(result.afschrijvingen).toBe(1_000);
    // Brutowinst = 45000 - 3000 - 1000 = 41000
    expect(result.brutoWinst).toBe(41_000);
    // KIA = 5000 * 0.28 = 1400
    expect(result.kia).toBe(1_400);
    // Zelfstandigenaftrek = 1200 (< brutowinst)
    expect(result.zelfstandigenaftrek).toBe(1_200);
    // Winst na aftrek = 41000 - 1200 = 39800
    // MKB-vrijstelling = 39800 * 0.127 = 5054.60
    expect(result.mkbVrijstelling).toBe(5_054.6);
    // Belastbaar = 39800 - 5054.60 - 1400 = 33345.40
    expect(result.belastbaarInkomen).toBe(33_345.4);
    // Box1 belasting: 33345.40 * 0.3575 = 11920.98 (afgerond)
    expect(result.inkomstenbelasting).toBe(round2(33_345.4 * 0.3575));
    // NettoIB > 0
    expect(result.nettoIB).toBeGreaterThan(0);
    // Effectief tarief < 50%
    expect(result.effectiefTarief).toBeLessThan(50);
  });

  it("Scenario B: starter €20k omzet, €2k kosten, geen investeringen", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 20_000,
      jaarKostenExBtw: 2_000,
      investeringen: [],
      maandenVerstreken: 12,
      huidigJaar: 2026,
    });

    // Brutowinst = 20000 - 2000 = 18000
    expect(result.brutoWinst).toBe(18_000);
    // Zelfstandigenaftrek = 1200
    expect(result.zelfstandigenaftrek).toBe(1_200);
    // Winst na aftrek = 16800
    // MKB = 16800 * 0.127 = 2133.60
    expect(result.mkbVrijstelling).toBe(2_133.6);
    // Belastbaar = 16800 - 2133.60 = 14666.40
    expect(result.belastbaarInkomen).toBe(14_666.4);
    // Bij laag inkomen: AHK = max (3115) want 14666.40 < 29739
    expect(result.algemeneHeffingskorting).toBe(TAX_CONSTANTS.ahkMax);
    // Arbeidskorting bij 14666.40: traject 1 + deel traject 2
    // t1: 11691 * 0.08521 = 996.16
    // t2: (14666.40 - 11691) * 0.31994 = 952.26
    // totaal: 1948.42
    expect(result.arbeidskorting).toBe(round2(11_691 * 0.08521 + (14_666.4 - 11_691) * 0.31994));
    // Netto IB zou erg laag moeten zijn door heffingskortingen
    expect(result.nettoIB).toBeLessThan(result.inkomstenbelasting);
  });

  it("Scenario C: topverdiener €120k omzet, €10k kosten", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 120_000,
      jaarKostenExBtw: 10_000,
      investeringen: [],
      maandenVerstreken: 12,
      huidigJaar: 2026,
    });

    // Brutowinst = 110000
    expect(result.brutoWinst).toBe(110_000);
    // Zelfstandigenaftrek = 1200
    expect(result.zelfstandigenaftrek).toBe(1_200);
    // Winst na aftrek = 108800
    // MKB = 108800 * 0.127 = 13817.60
    expect(result.mkbVrijstelling).toBe(13_817.6);
    // Belastbaar = 108800 - 13817.60 = 94982.40
    expect(result.belastbaarInkomen).toBe(94_982.4);
    // Moet in derde schijf vallen (>78426)
    // Box1: 38883*0.3575 + (78426-38883)*0.3756 + (94982.40-78426)*0.495
    const schijf1 = round2(38_883 * 0.3575);
    const schijf2 = round2((78_426 - 38_883) * 0.3756);
    const schijf3 = round2((94_982.4 - 78_426) * 0.495);
    expect(result.inkomstenbelasting).toBe(round2(schijf1 + schijf2 + schijf3));
    // AHK zou 0 moeten zijn bij dit inkomen (ver boven afbouwgrens)
    expect(result.algemeneHeffingskorting).toBe(0);
    // Effectief tarief zou hoog moeten zijn
    expect(result.effectiefTarief).toBeGreaterThan(15);
  });

  it("Scenario D: investering net onder KIA-drempel (€2.900)", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 50_000,
      jaarKostenExBtw: 5_000,
      investeringen: [
        {
          id: "1",
          omschrijving: "Apparaat",
          aanschafprijs: 2_900,
          aanschafDatum: "2026-06-01",
          levensduur: 5,
          restwaarde: 0,
        },
      ],
      maandenVerstreken: 12,
      huidigJaar: 2026,
    });

    // KIA = 0 (onder de drempel van €2.901)
    expect(result.kia).toBe(0);
    // Maar afschrijving telt wel mee
    expect(result.afschrijvingDetails).toHaveLength(1);
  });

  it("Scenario E: investering exact op KIA-drempel (€2.901)", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 50_000,
      jaarKostenExBtw: 5_000,
      investeringen: [
        {
          id: "1",
          omschrijving: "Apparaat",
          aanschafprijs: 2_901,
          aanschafDatum: "2026-01-01",
          levensduur: 5,
          restwaarde: 0,
        },
      ],
      maandenVerstreken: 12,
      huidigJaar: 2026,
    });

    // KIA = 2901 * 0.28 = 812.28
    expect(result.kia).toBe(round2(2_901 * 0.28));
  });

  it("Scenario F: ZZP'er met kilometervergoeding (€0,23/km)", () => {
    const result = calculateZZPTaxProjection({
      jaarOmzetExBtw: 60_000,
      jaarKostenExBtw: 5_000,
      investeringen: [],
      maandenVerstreken: 12,
      kilometerAftrek: 3_000, // 13.043 km * €0,23
    });

    // Brutowinst = 60000 - 5000 - 0 - 3000 = 52000
    expect(result.brutoWinst).toBe(52_000);
  });
});

// ─── Pillar 1: Deterministic Core — Validator Functions ───

describe("calculateInvestmentTaxSaving", () => {
  it("berekent besparing bij investering die KIA-drempel bereikt", () => {
    // Van 2000 (onder drempel, KIA=0) naar 3000 (boven drempel, KIA=840)
    const result = calculateInvestmentTaxSaving({
      currentTotalInvestments: 2_000,
      proposedAdditionalInvestment: 1_000,
      currentBelastbaarInkomen: 35_000,
    });

    // KIA delta: calculateKIA(3000) - calculateKIA(2000) = 840 - 0 = 840
    expect(result.kiaDelta).toBe(round2(3_000 * 0.28));
    // Tax saving: verschil in Box1 belasting
    const taxBefore = calculateBox1Tax(35_000);
    const taxAfter = calculateBox1Tax(35_000 - 840);
    expect(result.taxSaving).toBe(round2(taxBefore - taxAfter));
    expect(result.taxSaving).toBeGreaterThan(0);
  });

  it("berekent besparing bij al bestaande KIA", () => {
    // Van 5000 (KIA=1400) naar 6000 (KIA=1680), delta=280
    const result = calculateInvestmentTaxSaving({
      currentTotalInvestments: 5_000,
      proposedAdditionalInvestment: 1_000,
      currentBelastbaarInkomen: 40_000,
    });

    expect(result.kiaDelta).toBe(round2(calculateKIA(6_000) - calculateKIA(5_000)));
    expect(result.taxSaving).toBeGreaterThan(0);
  });

  it("geeft 0 als investering geen KIA-voordeel oplevert", () => {
    // Boven de KIA-bovengrens
    const result = calculateInvestmentTaxSaving({
      currentTotalInvestments: 400_000,
      proposedAdditionalInvestment: 1_000,
      currentBelastbaarInkomen: 50_000,
    });

    expect(result.kiaDelta).toBe(0);
    expect(result.taxSaving).toBe(0);
  });

  it("geeft 0 bij belastbaar inkomen van 0", () => {
    const result = calculateInvestmentTaxSaving({
      currentTotalInvestments: 2_000,
      proposedAdditionalInvestment: 1_000,
      currentBelastbaarInkomen: 0,
    });

    expect(result.taxSaving).toBe(0);
  });
});

describe("calculateKIAThresholdGap", () => {
  it("berekent gap wanneer onder drempel", () => {
    const result = calculateKIAThresholdGap(2_000);
    expect(result).not.toBeNull();
    expect(result!.nodig).toBe(901);
    expect(result!.potentialKIA).toBe(calculateKIA(TAX_CONSTANTS.kiaMinTotal));
  });

  it("geeft null wanneer al boven drempel", () => {
    expect(calculateKIAThresholdGap(5_000)).toBeNull();
  });

  it("geeft null wanneer geen investeringen", () => {
    expect(calculateKIAThresholdGap(0)).toBeNull();
  });

  it("berekent exact de juiste gap", () => {
    const result = calculateKIAThresholdGap(2_500);
    expect(result).not.toBeNull();
    expect(result!.nodig).toBe(401);
  });
});

describe("calculateAuditScore", () => {
  it("geeft 100 bij perfecte administratie", () => {
    const result = calculateAuditScore({
      missingReceiptsCount: 0,
      unlinkedInvoicesCount: 0,
      hoursLogged: 1_300,
      targetHours: 1_225,
    });

    expect(result.score).toBe(100);
    expect(result.status).toBe("Gedaan");
  });

  it("trekt 5 punten af per missend bonnetje", () => {
    const result = calculateAuditScore({
      missingReceiptsCount: 3,
      unlinkedInvoicesCount: 0,
      hoursLogged: 1_300,
      targetHours: 1_225,
    });

    expect(result.score).toBe(85);
    expect(result.status).toBe("Aandacht Vereist");
  });

  it("trekt 15 punten af bij urencriterium achterstand", () => {
    const result = calculateAuditScore({
      missingReceiptsCount: 0,
      unlinkedInvoicesCount: 0,
      hoursLogged: 500, // < 80% van 1000
      targetHours: 1_000,
    });

    expect(result.score).toBe(85);
  });

  it("geeft Kritiek bij veel problemen", () => {
    const result = calculateAuditScore({
      missingReceiptsCount: 10,
      unlinkedInvoicesCount: 5,
      hoursLogged: 200,
      targetHours: 800,
    });

    // 100 - 50 - 10 - 15 = 25
    expect(result.score).toBe(25);
    expect(result.status).toBe("Kritiek");
  });

  it("wordt nooit negatief", () => {
    const result = calculateAuditScore({
      missingReceiptsCount: 100,
      unlinkedInvoicesCount: 100,
      hoursLogged: 0,
      targetHours: 1000,
    });

    expect(result.score).toBe(0);
    expect(result.status).toBe("Kritiek");
  });
});

// ─── Pillar 2: Confidence Scoring & Human-in-the-loop ───

describe("toHumanReviewTitle", () => {
  it("geeft originele titel terug bij confidence >= 0.95", () => {
    expect(toHumanReviewTitle("KIA-drempel bereikt", 0.95)).toBe(
      "KIA-drempel bereikt",
    );
    expect(toHumanReviewTitle("Match gevonden", 0.98)).toBe("Match gevonden");
    expect(toHumanReviewTitle("BTW deadline", 1.0)).toBe("BTW deadline");
  });

  it("verpakt als vraag bij confidence < 0.95", () => {
    expect(toHumanReviewTitle("Match gevonden", 0.85)).toBe(
      "Vat100 denkt: match gevonden \u2014 klopt dat?",
    );
    expect(toHumanReviewTitle("Bon ontbreekt: Shell", 0.90)).toBe(
      "Vat100 denkt: bon ontbreekt: Shell \u2014 klopt dat?",
    );
  });

  it("werkt correct op de grens (0.94 vs 0.95)", () => {
    expect(toHumanReviewTitle("Test", 0.94)).toContain("Vat100 denkt:");
    expect(toHumanReviewTitle("Test", 0.95)).toBe("Test");
  });
});

describe("toHumanReviewDescription", () => {
  it("geeft originele beschrijving bij confidence >= 0.95", () => {
    const desc = "Een beschrijving.";
    expect(toHumanReviewDescription(desc, 0.95)).toBe(desc);
  });

  it("voegt controle-tekst toe bij confidence < 0.95", () => {
    const desc = "Een beschrijving.";
    const result = toHumanReviewDescription(desc, 0.85);
    expect(result).toContain(desc);
    expect(result).toContain("Controleer en bevestig");
  });
});

describe("getMissingReceiptConfidence", () => {
  it("geeft 0.95 voor bedragen >= €100", () => {
    expect(getMissingReceiptConfidence(100)).toBe(0.95);
    expect(getMissingReceiptConfidence(500)).toBe(0.95);
  });

  it("geeft 0.90 voor bedragen >= €50 en < €100", () => {
    expect(getMissingReceiptConfidence(50)).toBe(0.90);
    expect(getMissingReceiptConfidence(99)).toBe(0.90);
  });

  it("geeft 0.85 voor bedragen < €50", () => {
    expect(getMissingReceiptConfidence(20)).toBe(0.85);
    expect(getMissingReceiptConfidence(49)).toBe(0.85);
  });
});

describe("CONFIDENCE_THRESHOLDS", () => {
  it("heeft correcte hiërarchie", () => {
    expect(CONFIDENCE_THRESHOLDS.KEYWORD_MATCH).toBeLessThan(
      CONFIDENCE_THRESHOLDS.HUMAN_REVIEW,
    );
    expect(CONFIDENCE_THRESHOLDS.HUMAN_REVIEW).toBeLessThan(
      CONFIDENCE_THRESHOLDS.AUTO_EXECUTE,
    );
    expect(CONFIDENCE_THRESHOLDS.AUTO_EXECUTE).toBeLessThan(
      CONFIDENCE_THRESHOLDS.DETERMINISTIC,
    );
  });
});

// ─── Beschrijving Generators ───

describe("generateKIAThresholdDescription", () => {
  it("genereert correcte beschrijving met echte bedragen", () => {
    const desc = generateKIAThresholdDescription(2_600, {
      nodig: 301,
      potentialKIA: calculateKIA(TAX_CONSTANTS.kiaMinTotal),
    });

    expect(desc).toContain("2.600"); // totalInvestments formatted
    expect(desc).toContain("301"); // nodig formatted
    expect(desc).toContain("2.901"); // KIA drempel
  });
});

describe("generateInvestmentSuggestionDescription", () => {
  it("genereert beschrijving met berekende besparing", () => {
    const saving = calculateInvestmentTaxSaving({
      currentTotalInvestments: 0,
      proposedAdditionalInvestment: 3_000,
      currentBelastbaarInkomen: 40_000,
    });

    const desc = generateInvestmentSuggestionDescription(60_000, 3_000, saving);

    expect(desc).toContain("60.000"); // omzet
    expect(desc).toContain("3.000"); // investering
    // Mag geen "€370" hardcoded bevatten
    expect(desc).not.toContain("370");
  });
});

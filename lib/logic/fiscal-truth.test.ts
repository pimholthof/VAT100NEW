import { describe, it, expect } from "vitest";
import {
  calculateInvoiceTruth,
  estimateMarginalIncomeTax,
  DEFAULT_ASSUMED_ANNUAL_REVENUE,
} from "./fiscal-truth";

describe("calculateInvoiceTruth", () => {
  it("ontleedt een standaard 21%-factuur in BTW, IB-reservering en 'van jou'", () => {
    const truth = calculateInvoiceTruth({
      subtotalExVat: 1000,
      vatRate: 21,
      profile: { estimatedAnnualIncome: 40_000 },
    });

    expect(truth.net).toBe(1000);
    expect(truth.btw).toBe(210);
    expect(truth.clientPays).toBe(1210);

    // De drie delen sluiten exact op het netto-bedrag aan.
    expect(truth.yours + truth.incomeTaxReserve).toBeCloseTo(truth.net, 2);
    // En samen met de BTW op wat de klant betaalt.
    expect(truth.yours + truth.incomeTaxReserve + truth.btw).toBeCloseTo(
      truth.clientPays,
      2,
    );

    // Marginaal IB-tarief ligt voor een doorsnee ZZP'er rond 30–40%.
    expect(truth.marginalRate).toBeGreaterThan(0.2);
    expect(truth.marginalRate).toBeLessThan(0.45);
    expect(truth.yours).toBeLessThan(truth.net);
    expect(truth.yours).toBeGreaterThan(0);
  });

  it("houdt geen BTW in bij verlegd/0%-tarief (klant betaalt netto)", () => {
    const truth = calculateInvoiceTruth({
      subtotalExVat: 1000,
      vatRate: 0,
      profile: { estimatedAnnualIncome: 40_000 },
    });

    expect(truth.btw).toBe(0);
    expect(truth.clientPays).toBe(truth.net);
  });

  it("gebruikt een aangenomen jaarinkomen als het profiel het niet kent", () => {
    const personal = calculateInvoiceTruth({
      subtotalExVat: 1000,
      vatRate: 21,
      profile: { estimatedAnnualIncome: DEFAULT_ASSUMED_ANNUAL_REVENUE },
    });
    const fallback = calculateInvoiceTruth({
      subtotalExVat: 1000,
      vatRate: 21,
      profile: { estimatedAnnualIncome: null },
    });

    expect(fallback.personalised).toBe(false);
    expect(personal.personalised).toBe(true);
    // Zonder profiel valt de schatting terug op het aangenomen inkomen.
    expect(fallback.incomeTaxReserve).toBeCloseTo(personal.incomeTaxReserve, 2);
  });

  it("respecteert een expliciet meegegeven BTW-bedrag", () => {
    const truth = calculateInvoiceTruth({
      subtotalExVat: 1000,
      vatRate: 9,
      vatAmount: 90,
      profile: { estimatedAnnualIncome: 50_000 },
    });
    expect(truth.btw).toBe(90);
    expect(truth.clientPays).toBe(1090);
  });

  it("geeft nul terug bij een leeg factuurbedrag", () => {
    const truth = calculateInvoiceTruth({
      subtotalExVat: 0,
      vatRate: 21,
      profile: { estimatedAnnualIncome: 40_000 },
    });
    expect(truth.net).toBe(0);
    expect(truth.btw).toBe(0);
    expect(truth.incomeTaxReserve).toBe(0);
    expect(truth.yours).toBe(0);
    expect(truth.marginalRate).toBe(0);
  });
});

describe("estimateMarginalIncomeTax", () => {
  it("loopt op met het inkomen (progressief tarief)", () => {
    const low = estimateMarginalIncomeTax(1000, 20_000);
    const high = estimateMarginalIncomeTax(1000, 90_000);
    expect(high).toBeGreaterThan(low);
  });

  it("is nooit negatief", () => {
    expect(estimateMarginalIncomeTax(-500, 40_000)).toBe(0);
    expect(estimateMarginalIncomeTax(0, 40_000)).toBe(0);
  });
});

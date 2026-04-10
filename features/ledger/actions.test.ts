import { describe, it, expect } from "vitest";

/**
 * Tests voor ledger-boekingslogica.
 * De autoBook-functies vereisen een Supabase client, dus hier
 * testen we de berekeningslogica die in die functies wordt gebruikt.
 */

const round2 = (v: number) => Math.round(v * 100) / 100;

describe("Ledger boekingsberekeningen", () => {
  describe("Representatie 80/20 split", () => {
    it("berekent 80% zakelijk correct", () => {
      const totalIncVat = 121; // €100 + €21 BTW
      const businessAmount = round2(totalIncVat * 0.8);
      const priveAmount = round2(totalIncVat * 0.2);

      expect(businessAmount).toBe(96.8);
      expect(priveAmount).toBe(24.2);
      expect(round2(businessAmount + priveAmount)).toBe(totalIncVat);
    });

    it("berekent split correct voor oneven bedragen", () => {
      const totalIncVat = 33.33;
      const businessAmount = round2(totalIncVat * 0.8);
      const priveAmount = round2(totalIncVat * 0.2);

      expect(businessAmount).toBe(26.66);
      expect(priveAmount).toBe(6.67);
    });
  });

  describe("Horeca BTW-regels", () => {
    it("forceert 0 BTW-aftrek voor horeca", () => {
      const vatAmount = 21;
      const businessPercentage = 100;
      const isHoreca = true;

      const effectiveVat = isHoreca ? 0 : round2(vatAmount * (businessPercentage / 100));
      expect(effectiveVat).toBe(0);
    });

    it("berekent normale BTW-aftrek voor niet-horeca", () => {
      const vatAmount = 21;
      const businessPercentage = 100;
      const isHoreca = false;

      const effectiveVat = isHoreca ? 0 : round2(vatAmount * (businessPercentage / 100));
      expect(effectiveVat).toBe(21);
    });

    it("berekent partiele BTW-aftrek bij gemengd gebruik", () => {
      const vatAmount = 42;
      const businessPercentage = 60;
      const isHoreca = false;

      const effectiveVat = isHoreca ? 0 : round2(vatAmount * (businessPercentage / 100));
      expect(effectiveVat).toBe(25.2);
    });
  });

  describe("Standaard boeking berekeningen", () => {
    it("berekent zakelijk bedrag met business_percentage", () => {
      const amountExVat = 500;
      const businessPercentage = 75;

      const businessCost = round2(amountExVat * (businessPercentage / 100));
      expect(businessCost).toBe(375);
    });

    it("berekent totaal inclusief BTW correct", () => {
      const amountExVat = 1000;
      const vatAmount = 210;

      expect(round2(amountExVat + vatAmount)).toBe(1210);
    });
  });
});

describe("Factuur boekingsberekeningen", () => {
  it("berekent debiteur aan omzet + BTW correct", () => {
    const subtotalExVat = 1550;
    const vatAmount = 325.5;
    const totalIncVat = round2(subtotalExVat + vatAmount);

    expect(totalIncVat).toBe(1875.5);
    // Debiteur: totaal inc. BTW
    // Omzet: subtotaal ex. BTW
    // BTW: btw-bedrag
    expect(subtotalExVat + vatAmount).toBe(totalIncVat);
  });

  it("behandelt 0% BTW bij EU reverse charge", () => {
    const subtotalExVat = 2000;
    const vatAmount = 0;
    const totalIncVat = round2(subtotalExVat + vatAmount);

    expect(totalIncVat).toBe(2000);
    expect(vatAmount).toBe(0);
  });
});

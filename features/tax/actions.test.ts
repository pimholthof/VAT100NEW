import { describe, it, expect } from "vitest";
import { validate } from "@/lib/validation";
import { taxPaymentSchema, assetSchema, openingBalanceSchema } from "@/lib/validation";

/**
 * Tests voor tax-gerelateerde validatieschema's.
 */

describe("taxPaymentSchema", () => {
  it("accepteert geldige BTW-betaling", () => {
    const result = validate(taxPaymentSchema, {
      type: "btw",
      period: "2026-Q1",
      amount: 1250.50,
      paid_date: "2026-04-15",
    });
    expect(result.error).toBeNull();
  });

  it("accepteert geldige IB-betaling", () => {
    const result = validate(taxPaymentSchema, {
      type: "ib",
      period: "2025",
      amount: 5000,
    });
    expect(result.error).toBeNull();
  });

  it("weigert negatief bedrag", () => {
    const result = validate(taxPaymentSchema, {
      type: "btw",
      period: "2026-Q1",
      amount: -100,
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert lege periode", () => {
    const result = validate(taxPaymentSchema, {
      type: "btw",
      period: "",
      amount: 100,
    });
    expect(result.error).toBe("Periode is verplicht");
  });

  it("weigert ongeldig type", () => {
    const result = validate(taxPaymentSchema, {
      type: "vpb",
      period: "2026-Q1",
      amount: 100,
    });
    expect(result.error).not.toBeNull();
  });

  it("accepteert nul bedrag", () => {
    const result = validate(taxPaymentSchema, {
      type: "btw",
      period: "2026-Q1",
      amount: 0,
    });
    expect(result.error).toBeNull();
  });
});

describe("assetSchema", () => {
  it("accepteert geldig bedrijfsmiddel", () => {
    const result = validate(assetSchema, {
      omschrijving: "MacBook Pro 16",
      aanschaf_datum: "2026-01-15",
      aanschaf_prijs: 2999,
      restwaarde: 500,
      levensduur: 5,
    });
    expect(result.error).toBeNull();
  });

  it("weigert lege omschrijving", () => {
    const result = validate(assetSchema, {
      omschrijving: "",
      aanschaf_datum: "2026-01-01",
      aanschaf_prijs: 100,
    });
    expect(result.error).toBe("Omschrijving is verplicht");
  });

  it("weigert negatieve aanschafprijs", () => {
    const result = validate(assetSchema, {
      omschrijving: "Laptop",
      aanschaf_datum: "2026-01-01",
      aanschaf_prijs: -100,
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert levensduur > 30 jaar", () => {
    const result = validate(assetSchema, {
      omschrijving: "Pand",
      aanschaf_datum: "2026-01-01",
      aanschaf_prijs: 100000,
      levensduur: 50,
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert negatieve restwaarde", () => {
    const result = validate(assetSchema, {
      omschrijving: "Auto",
      aanschaf_datum: "2026-01-01",
      aanschaf_prijs: 20000,
      restwaarde: -500,
    });
    expect(result.error).not.toBeNull();
  });

  it("accepteert verkocht bedrijfsmiddel", () => {
    const result = validate(assetSchema, {
      omschrijving: "Oude laptop",
      aanschaf_datum: "2024-01-01",
      aanschaf_prijs: 1500,
      is_verkocht: true,
      verkoop_datum: "2026-03-01",
      verkoop_prijs: 400,
    });
    expect(result.error).toBeNull();
  });
});

describe("openingBalanceSchema", () => {
  it("accepteert geldige openingsbalans", () => {
    const result = validate(openingBalanceSchema, {
      eigen_vermogen: 10000,
      vaste_activa: 5000,
      bank_saldo: 8000,
      debiteuren: 2000,
      crediteuren: 1500,
      btw_schuld: 500,
    });
    expect(result.error).toBeNull();
  });

  it("accepteert lege openingsbalans met defaults", () => {
    const result = validate(openingBalanceSchema, {});
    expect(result.error).toBeNull();
    expect(result.data?.eigen_vermogen).toBe(0);
    expect(result.data?.bank_saldo).toBe(0);
  });

  it("weigert negatieve debiteuren", () => {
    const result = validate(openingBalanceSchema, {
      debiteuren: -500,
    });
    expect(result.error).not.toBeNull();
  });

  it("accepteert negatief eigen vermogen", () => {
    const result = validate(openingBalanceSchema, {
      eigen_vermogen: -2000,
    });
    expect(result.error).toBeNull();
  });

  it("accepteert negatief bank saldo", () => {
    const result = validate(openingBalanceSchema, {
      bank_saldo: -500,
    });
    expect(result.error).toBeNull();
  });
});

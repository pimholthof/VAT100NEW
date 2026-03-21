import { describe, it, expect } from "vitest";
import {
  vatReturnSchema,
  assetSchema,
  openingBalanceSchema,
  profileSchema,
  receiptSchema,
  validate,
} from "./index";

describe("vatReturnSchema", () => {
  it("accepteert geldige BTW-aangifte input", () => {
    const result = validate(vatReturnSchema, {
      period_start: "2026-01-01",
      period_end: "2026-03-31",
      output_vat: 5000,
      input_vat: 1200,
    });
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
  });

  it("weigert ontbrekende startdatum", () => {
    const result = validate(vatReturnSchema, {
      period_start: "",
      period_end: "2026-03-31",
      output_vat: 5000,
      input_vat: 1200,
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert negatieve output BTW", () => {
    const result = validate(vatReturnSchema, {
      period_start: "2026-01-01",
      period_end: "2026-03-31",
      output_vat: -100,
      input_vat: 0,
    });
    expect(result.error).not.toBeNull();
  });

  it("accepteert 0 waarden", () => {
    const result = validate(vatReturnSchema, {
      period_start: "2026-01-01",
      period_end: "2026-03-31",
      output_vat: 0,
      input_vat: 0,
    });
    expect(result.error).toBeNull();
  });
});

describe("profileSchema", () => {
  it("accepteert minimaal profiel", () => {
    const result = validate(profileSchema, {
      full_name: "Jan de Vries",
    });
    expect(result.error).toBeNull();
  });

  it("accepteert volledig profiel met belastinginstellingen", () => {
    const result = validate(profileSchema, {
      full_name: "Jan de Vries",
      studio_name: "Studio Jan",
      kvk_number: "12345678",
      btw_number: "NL123456789B01",
      iban: "NL91ABNA0417164300",
      expected_annual_revenue: 75000,
      zelfstandigenaftrek: true,
      monthly_fixed_costs: 500,
      btw_period: "kwartaal",
    });
    expect(result.error).toBeNull();
  });

  it("weigert lege naam", () => {
    const result = validate(profileSchema, {
      full_name: "",
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert negatieve verwachte omzet", () => {
    const result = validate(profileSchema, {
      full_name: "Jan",
      expected_annual_revenue: -1000,
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert ongeldige btw_period", () => {
    const result = validate(profileSchema, {
      full_name: "Jan",
      btw_period: "jaarlijks",
    });
    expect(result.error).not.toBeNull();
  });
});

describe("receiptSchema", () => {
  it("accepteert minimale bon", () => {
    const result = validate(receiptSchema, {});
    expect(result.error).toBeNull();
  });

  it("accepteert volledige bon", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Albert Heijn",
      amount_ex_vat: 50.42,
      vat_rate: 21,
      category: "Kantoor",
      cost_code: 4300,
      receipt_date: "2026-03-15",
    });
    expect(result.error).toBeNull();
  });

  it("weigert ongeldig BTW-tarief", () => {
    const result = validate(receiptSchema, {
      vat_rate: 15,
    });
    expect(result.error).not.toBeNull();
  });
});

describe("assetSchema", () => {
  it("accepteert geldig activum", () => {
    const result = validate(assetSchema, {
      description: "MacBook Pro",
      acquisition_date: "2026-01-15",
      acquisition_cost: 2499,
      residual_value: 200,
      useful_life_months: 36,
      category: "computer",
    });
    expect(result.error).toBeNull();
  });

  it("weigert onbekende categorie", () => {
    const result = validate(assetSchema, {
      description: "Test",
      acquisition_date: "2026-01-15",
      acquisition_cost: 100,
      residual_value: 0,
      useful_life_months: 12,
      category: "onbekend",
    });
    expect(result.error).not.toBeNull();
  });

  it("weigert negatieve restwaarde", () => {
    const result = validate(assetSchema, {
      description: "Test",
      acquisition_date: "2026-01-15",
      acquisition_cost: 100,
      residual_value: -50,
      useful_life_months: 12,
      category: "software",
    });
    expect(result.error).not.toBeNull();
  });
});

describe("openingBalanceSchema", () => {
  it("accepteert geldige openingsbalans", () => {
    const result = validate(openingBalanceSchema, {
      equity: 15000,
      fixed_assets: 5000,
      current_assets: 2000,
      cash: 8000,
      liabilities: 0,
    });
    expect(result.error).toBeNull();
  });

  it("accepteert negatief eigen vermogen", () => {
    const result = validate(openingBalanceSchema, {
      equity: -3000,
      fixed_assets: 0,
      current_assets: 0,
      cash: 1000,
      liabilities: 4000,
    });
    expect(result.error).toBeNull();
  });

  it("weigert negatieve vaste activa", () => {
    const result = validate(openingBalanceSchema, {
      equity: 1000,
      fixed_assets: -500,
      current_assets: 0,
      cash: 0,
      liabilities: 0,
    });
    expect(result.error).not.toBeNull();
  });
});

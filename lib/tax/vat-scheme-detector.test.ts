import { describe, it, expect } from "vitest";
import { detectVatScheme } from "./vat-scheme-detector";

describe("detectVatScheme — with BTW-nummer", () => {
  it("NL BTW-nummer → standard 21%", () => {
    const r = detectVatScheme({ btw_number: "NL123456789B01", country: "NL" });
    expect(r.scheme).toBe("standard");
    expect(r.rate).toBe(21);
  });

  it("normalizes lowercase prefix (nl123…) to NL → standard", () => {
    const r = detectVatScheme({ btw_number: "nl123456789B01", country: null });
    expect(r.scheme).toBe("standard");
    expect(r.rate).toBe(21);
  });

  it("trims surrounding whitespace before detecting prefix", () => {
    const r = detectVatScheme({ btw_number: "  DE123456789  ", country: null });
    expect(r.scheme).toBe("eu_reverse_charge");
    expect(r.rate).toBe(0);
  });

  it("DE BTW-nummer → eu_reverse_charge 0%", () => {
    const r = detectVatScheme({ btw_number: "DE123456789", country: "DE" });
    expect(r.scheme).toBe("eu_reverse_charge");
    expect(r.rate).toBe(0);
  });

  it("BE BTW-nummer → eu_reverse_charge 0%", () => {
    const r = detectVatScheme({ btw_number: "BE0123456789", country: "BE" });
    expect(r.scheme).toBe("eu_reverse_charge");
    expect(r.rate).toBe(0);
  });

  it("non-EU prefix on btw_number → export_outside_eu 0%", () => {
    const r = detectVatScheme({ btw_number: "US12-3456789", country: "US" });
    expect(r.scheme).toBe("export_outside_eu");
    expect(r.rate).toBe(0);
  });

  it("BTW-nummer wins over conflicting country field", () => {
    // Klant claimt NL land, maar heeft een Duits BTW-nummer → EU verlegging.
    const r = detectVatScheme({ btw_number: "DE123456789", country: "NL" });
    expect(r.scheme).toBe("eu_reverse_charge");
  });
});

describe("detectVatScheme — zonder BTW-nummer", () => {
  it("NL country zonder BTW → standard 21% (B2C)", () => {
    const r = detectVatScheme({ btw_number: null, country: "NL" });
    expect(r.scheme).toBe("standard");
    expect(r.rate).toBe(21);
  });

  it("country is lowercase → normalized", () => {
    const r = detectVatScheme({ btw_number: null, country: "de" });
    expect(r.scheme).toBe("standard");
    expect(r.rate).toBe(21);
  });

  it("EU country zonder BTW → standard 21% (B2C)", () => {
    const r = detectVatScheme({ btw_number: "", country: "FR" });
    expect(r.scheme).toBe("standard");
    expect(r.rate).toBe(21);
  });

  it("non-EU country zonder BTW → export_outside_eu 0%", () => {
    const r = detectVatScheme({ btw_number: null, country: "US" });
    expect(r.scheme).toBe("export_outside_eu");
    expect(r.rate).toBe(0);
  });

  it("country onbekend (null) → defaults to NL standard", () => {
    const r = detectVatScheme({ btw_number: null, country: null });
    expect(r.scheme).toBe("standard");
    expect(r.rate).toBe(21);
  });
});

describe("detectVatScheme — edge cases", () => {
  it("whitespace-only btw_number is treated as empty", () => {
    const r = detectVatScheme({ btw_number: "   ", country: "NL" });
    expect(r.scheme).toBe("standard");
    expect(r.rate).toBe(21);
  });

  it("btw_number too short to contain prefix → ignores and falls back to country", () => {
    const r = detectVatScheme({ btw_number: "N", country: "US" });
    expect(r.scheme).toBe("export_outside_eu");
    expect(r.rate).toBe(0);
  });

  it("returns a human-readable Dutch reason for every branch", () => {
    const cases = [
      { btw_number: "NL123456789B01", country: "NL" },
      { btw_number: "DE123456789", country: null },
      { btw_number: "US12", country: null },
      { btw_number: null, country: "NL" },
      { btw_number: null, country: "FR" },
      { btw_number: null, country: "CN" },
    ];
    for (const c of cases) {
      const r = detectVatScheme(c);
      expect(r.reason).toMatch(/[a-zA-Z]/);
      expect(r.reason.length).toBeGreaterThan(5);
    }
  });
});

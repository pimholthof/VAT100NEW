import { describe, it, expect } from "vitest";
import { commandFilter } from "./command-filter";

describe("commandFilter", () => {
  it("laat server-resultaten altijd staan (server filtert al)", () => {
    expect(commandFilter("invoice-abc-2026-001-Studio Noord", "xyzqwerty")).toBe(1);
    expect(commandFilter("client-abc-Studio Noord", "xyzqwerty")).toBe(1);
  });

  it("matcht op substring van het label", () => {
    expect(commandFilter("nav-instellingen", "inst", ["Instellingen"])).toBe(1);
    expect(commandFilter("actie-nieuwe-factuur", "factuur", ["Nieuwe factuur maken"])).toBe(1);
  });

  it("matcht op keywords/synoniemen", () => {
    expect(
      commandFilter("nav-belasting", "btw", ["btw", "belasting", "aangifte"])
    ).toBe(1);
    expect(
      commandFilter("actie-nieuwe-klant", "relatie", ["klant", "contact", "relatie"])
    ).toBe(1);
  });

  it("matcht woord-prefixen met een lagere score", () => {
    const score = commandFilter("nav-facturen", "fact over", [
      "Facturen overzicht",
    ]);
    expect(score).toBe(0.7);
  });

  it("is ongevoelig voor hoofdletters en diakrieten", () => {
    expect(commandFilter("nav-klanten", "KLANT", ["Klanten overzicht"])).toBe(1);
    expect(commandFilter("actie-x", "credit", ["crédit nota"])).toBe(1);
  });

  it("verbergt items zonder match", () => {
    expect(commandFilter("nav-instellingen", "xyzqwerty", ["Instellingen"])).toBe(0);
  });

  it("toont alles bij een lege zoekopdracht", () => {
    expect(commandFilter("nav-dashboard", "", ["Dashboard"])).toBe(1);
    expect(commandFilter("nav-dashboard", "   ", ["Dashboard"])).toBe(1);
  });
});

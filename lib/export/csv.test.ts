import { describe, it, expect } from "vitest";
import { generateCSV } from "./csv";

describe("generateCSV", () => {
  it("generates header and data rows", () => {
    const result = generateCSV(["Naam", "Bedrag"], [["Test BV", "100"]]);
    expect(result).toBe("Naam,Bedrag\nTest BV,100");
  });

  it("escapes fields with commas", () => {
    const result = generateCSV(["Naam"], [["Achternaam, Voornaam"]]);
    expect(result).toContain('"Achternaam, Voornaam"');
  });

  it("escapes fields with double quotes", () => {
    const result = generateCSV(["Naam"], [['Studio "De Brug"']]);
    expect(result).toContain('"Studio ""De Brug"""');
  });

  it("escapes fields with newlines", () => {
    const result = generateCSV(["Notitie"], [["Regel 1\nRegel 2"]]);
    expect(result).toContain('"Regel 1\nRegel 2"');
  });

  it("handles empty rows", () => {
    const result = generateCSV(["Naam", "Bedrag"], []);
    expect(result).toBe("Naam,Bedrag");
  });

  it("handles multiple rows", () => {
    const result = generateCSV(
      ["Klant", "Totaal"],
      [
        ["Klant A", "500"],
        ["Klant B", "750"],
      ]
    );
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe("Klant B,750");
  });
});

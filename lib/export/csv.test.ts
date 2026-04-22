import { describe, it, expect } from "vitest";
import { generateCSV, csvResponse } from "./csv";

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

  it("leaves simple fields unquoted", () => {
    expect(generateCSV(["naam"], [["Jan Jansen"]])).toBe("naam\nJan Jansen");
  });

  it("quotes a header that itself contains a comma", () => {
    expect(generateCSV(["kol, met komma", "andere"], [["x", "y"]]))
      .toBe('"kol, met komma",andere\nx,y');
  });

  it("handles empty string fields", () => {
    expect(generateCSV(["a", "b"], [["", "x"]])).toBe("a,b\n,x");
  });

  it("produces an empty string when there are no headers and no rows", () => {
    expect(generateCSV([], [])).toBe("");
  });

  it("survives a realistic BTW-aangifte row with EUR-formatted amounts", () => {
    // Dutch formatting uses a comma for the decimal separator; because our
    // amounts are strings, not numbers, they must be quoted so the "12.500,00"
    // doesn't fragment into two columns.
    const csv = generateCSV(
      ["Kwartaal", "Omzet excl. BTW", "BTW te voldoen", "Opmerking"],
      [
        ["Q1 2026", "12.500,00", "2.625,00", "Geen bijzonderheden"],
        ["Q2 2026", "15.250,50", "3.202,61", "Let op: 1 factuur naar DE"],
      ]
    );
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Q1 2026,\"12.500,00\",\"2.625,00\",Geen bijzonderheden");
    expect(lines[2]).toContain("Let op: 1 factuur naar DE");
  });
});

describe("csvResponse", () => {
  it("returns a Response with csv MIME type and UTF-8 charset", () => {
    const res = csvResponse("a,b\n1,2", "export.csv");
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  });

  it("sets Content-Disposition attachment with the given filename", () => {
    const res = csvResponse("x", "btw-q2-2026.csv");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="btw-q2-2026.csv"'
    );
  });

  it("prepends a UTF-8 BOM so Excel opens the file in the right encoding", async () => {
    // Response.text() strips a leading BOM per the WHATWG Encoding spec, so
    // we read raw bytes to assert the BOM is actually on the wire.
    const res = csvResponse("naam\nJan", "x.csv");
    const bytes = new Uint8Array(await res.arrayBuffer());
    // UTF-8 BOM = EF BB BF
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    // Remaining bytes decode to the CSV payload.
    const rest = new TextDecoder("utf-8").decode(bytes.slice(3));
    expect(rest).toBe("naam\nJan");
  });

  it("preserves CSV payload (incl. escaped quotes) byte-for-byte after BOM", async () => {
    const csv = 'a,b\n"quoted ""field""","x"';
    const res = csvResponse(csv, "x.csv");
    const bytes = new Uint8Array(await res.arrayBuffer());
    const rest = new TextDecoder("utf-8").decode(bytes.slice(3));
    expect(rest).toBe(csv);
  });
});

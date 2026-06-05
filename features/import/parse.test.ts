import { describe, it, expect } from "vitest";
import { parseCSV, detectColumns, parseDate, parseNumber, TARGET_FIELDS } from "./parse";

describe("parseCSV", () => {
  it("splits comma-separated rows", () => {
    expect(parseCSV("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("supports semicolon separators (NL Excel)", () => {
    expect(parseCSV("a;b;c\n1;2;3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCSV("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("respects quoted fields containing the separator", () => {
    expect(parseCSV('naam,plaats\n"Jansen, B.V.",Amsterdam')).toEqual([
      ["naam", "plaats"],
      ["Jansen, B.V.", "Amsterdam"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCSV('x\n"hij zei ""hoi"""')).toEqual([["x"], ['hij zei "hoi"']]);
  });
});

describe("detectColumns — invoices", () => {
  it("maps Dutch headers", () => {
    const m = detectColumns(["Factuurnummer", "Klant", "Factuurdatum", "Totaal"], "invoices");
    expect(m).toMatchObject({
      Factuurnummer: "invoice_number",
      Klant: "client_name",
      Factuurdatum: "issue_date",
      Totaal: "total_inc_vat",
    });
  });

  it("maps Moneybird 'Contact' to the client name", () => {
    const m = detectColumns(["Factuurnummer", "Contact"], "invoices");
    expect(m.Contact).toBe("client_name");
  });

  it("never assigns the same target twice", () => {
    // 'bedrag' and 'amount' both map to subtotal_ex_vat — only the first wins.
    const m = detectColumns(["Bedrag", "Amount"], "invoices");
    const targets = Object.values(m);
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe("detectColumns — clients", () => {
  it("maps a typical Moneybird contact export", () => {
    const headers = ["Bedrijfsnaam", "Contactpersoon", "E-mail", "Adres", "Postcode", "Plaats", "Land", "KvK-nummer", "Btw-nummer"];
    const m = detectColumns(headers, "clients");
    expect(m).toMatchObject({
      Bedrijfsnaam: "name",
      Contactpersoon: "contact_name",
      "E-mail": "email",
      Adres: "address",
      Postcode: "postal_code",
      Plaats: "city",
      Land: "country",
      "KvK-nummer": "kvk_number",
      "Btw-nummer": "btw_number",
    });
  });

  it("maps English headers too", () => {
    const m = detectColumns(["Company Name", "Email", "City", "VAT number"], "clients");
    expect(m).toMatchObject({
      "Company Name": "name",
      Email: "email",
      City: "city",
      "VAT number": "btw_number",
    });
  });
});

describe("detectColumns — receipts", () => {
  it("maps supplier and amounts", () => {
    const m = detectColumns(["Leverancier", "Datum", "Bedrag", "BTW", "Totaal"], "receipts");
    expect(m).toMatchObject({
      Leverancier: "vendor_name",
      Datum: "receipt_date",
      Bedrag: "amount_ex_vat",
      BTW: "vat_amount",
      Totaal: "amount_inc_vat",
    });
  });
});

describe("parseDate", () => {
  it("keeps ISO dates", () => {
    expect(parseDate("2026-06-05")).toBe("2026-06-05");
    expect(parseDate("2026-06-05T10:00:00Z")).toBe("2026-06-05");
  });

  it("converts DD-MM-YYYY and DD/MM/YYYY", () => {
    expect(parseDate("5-6-2026")).toBe("2026-06-05");
    expect(parseDate("05/06/2026")).toBe("2026-06-05");
  });

  it("returns null for empty or unknown formats", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("juni 2026")).toBeNull();
  });
});

describe("parseNumber", () => {
  it("parses Dutch notation with thousands separator", () => {
    expect(parseNumber("1.234,56")).toBe(1234.56);
    expect(parseNumber("€ 2.400,00")).toBe(2400);
  });

  it("parses plain numbers", () => {
    expect(parseNumber("99")).toBe(99);
    expect(parseNumber("12,50")).toBe(12.5);
  });

  it("returns null for empty/non-numeric", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("n.v.t.")).toBeNull();
  });
});

describe("TARGET_FIELDS", () => {
  it("exposes a field list per import type", () => {
    expect(TARGET_FIELDS.invoices.some((f) => f.field === "invoice_number")).toBe(true);
    expect(TARGET_FIELDS.clients.some((f) => f.field === "name")).toBe(true);
    expect(TARGET_FIELDS.receipts.some((f) => f.field === "vendor_name")).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import {
  clientSchema,
  invoiceSchema,
  quoteSchema,
  receiptSchema,
  profileSchema,
  validate,
} from "./index";

describe("clientSchema", () => {
  it("accepts valid client input", () => {
    const result = validate(clientSchema, {
      name: "Test BV",
      contact_name: "Jan",
      email: "jan@test.nl",
      address: null,
      city: null,
      postal_code: null,
      kvk_number: null,
      btw_number: null,
    });
    expect(result.error).toBeNull();
    expect(result.data?.name).toBe("Test BV");
  });

  it("rejects empty name", () => {
    const result = validate(clientSchema, {
      name: "",
      contact_name: null,
      email: null,
    });
    expect(result.error).toBe("Naam is verplicht");
  });

  it("rejects invalid email", () => {
    const result = validate(clientSchema, {
      name: "Test BV",
      email: "niet-geldig",
    });
    expect(result.error).toBe("Ongeldig e-mailadres");
  });

  it("allows null email", () => {
    const result = validate(clientSchema, {
      name: "Test BV",
      email: null,
    });
    expect(result.error).toBeNull();
  });
});

describe("invoiceSchema", () => {
  const validInvoice = {
    client_id: "abc-123",
    invoice_number: "FAC-001",
    status: "draft" as const,
    issue_date: "2026-03-15",
    due_date: null,
    vat_rate: 21 as const,
    notes: null,
    lines: [
      {
        id: "line-1",
        description: "Ontwikkeling",
        quantity: 10,
        unit: "uren" as const,
        rate: 95,
      },
    ],
  };

  it("accepts valid invoice input", () => {
    const result = validate(invoiceSchema, validInvoice);
    expect(result.error).toBeNull();
  });

  it("rejects empty lines", () => {
    const result = validate(invoiceSchema, { ...validInvoice, lines: [] });
    expect(result.error).toBe("Minimaal één factuurregel is verplicht");
  });

  it("rejects invalid VAT rate", () => {
    const result = validate(invoiceSchema, { ...validInvoice, vat_rate: 15 });
    expect(result.error).not.toBeNull();
  });

  it("accepts all valid VAT rates", () => {
    for (const rate of [0, 9, 21]) {
      const result = validate(invoiceSchema, { ...validInvoice, vat_rate: rate });
      expect(result.error).toBeNull();
    }
  });

  it("rejects negative quantity", () => {
    const result = validate(invoiceSchema, {
      ...validInvoice,
      lines: [{ ...validInvoice.lines[0], quantity: -1 }],
    });
    expect(result.error).toBe("Aantal moet positief zijn");
  });
});

describe("receiptSchema", () => {
  it("accepts valid receipt", () => {
    const result = validate(receiptSchema, {
      vendor_name: "Albert Heijn",
      amount_ex_vat: 25.5,
      vat_rate: 21,
      category: "Kantoorkosten",
      cost_code: 4100,
      receipt_date: "2026-03-15",
    });
    expect(result.error).toBeNull();
  });

  it("accepts empty receipt (all nullable)", () => {
    const result = validate(receiptSchema, {
      vendor_name: null,
      amount_ex_vat: null,
      vat_rate: null,
      category: null,
      cost_code: null,
      receipt_date: null,
    });
    expect(result.error).toBeNull();
  });
});

describe("profileSchema", () => {
  it("accepts valid profile", () => {
    const result = validate(profileSchema, {
      full_name: "Jan de Vries",
      studio_name: "Studio Jan",
      kvk_number: null,
      btw_number: null,
      address: null,
      city: null,
      postal_code: null,
      iban: null,
      bic: null,
    });
    expect(result.error).toBeNull();
  });

  it("rejects empty name", () => {
    const result = validate(profileSchema, {
      full_name: "",
    });
    expect(result.error).toBe("Naam is verplicht");
  });
});

describe("quoteSchema", () => {
  const validQuote = {
    client_id: "abc-123",
    quote_number: "OFF-001",
    status: "draft" as const,
    issue_date: "2026-03-15",
    valid_until: "2026-04-15",
    vat_rate: 21 as const,
    notes: null,
    lines: [
      { id: "line-1", description: "Ontwerp", quantity: 20, unit: "uren" as const, rate: 85 },
    ],
  };

  it("accepts valid quote", () => {
    const result = validate(quoteSchema, validQuote);
    expect(result.error).toBeNull();
  });

  it("rejects invalid status", () => {
    const result = validate(quoteSchema, { ...validQuote, status: "expired" });
    expect(result.error).not.toBeNull();
  });

  it("rejects empty lines", () => {
    const result = validate(quoteSchema, { ...validQuote, lines: [] });
    expect(result.error).toBe("Minimaal één offerteregel is verplicht");
  });

  it("rejects negative rate in line", () => {
    const result = validate(quoteSchema, {
      ...validQuote,
      lines: [{ ...validQuote.lines[0], rate: -10 }],
    });
    expect(result.error).toBe("Tarief mag niet negatief zijn");
  });
});

describe("validate helper", () => {
  it("returns first error message", () => {
    const result = validate(clientSchema, { name: "" });
    expect(result.error).toBe("Naam is verplicht");
    expect(result.data).toBeUndefined();
  });

  it("returns data on success", () => {
    const result = validate(clientSchema, { name: "  Trimmed  " });
    expect(result.error).toBeNull();
    expect(result.data?.name).toBe("Trimmed");
  });
});

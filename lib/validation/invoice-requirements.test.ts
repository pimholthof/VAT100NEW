import { describe, it, expect } from "vitest";
import { validateDutchInvoiceRequirements } from "./invoice-requirements";
import type {
  InvoiceData,
  Invoice,
  InvoiceLine,
  Client,
  Profile,
} from "@/lib/types";

const baseProfile: Profile = {
  id: "u1",
  full_name: "Jan Jansen",
  studio_name: "Studio Jansen",
  kvk_number: "12345678",
  btw_number: "NL123456789B01",
  address: "Hoofdstraat 1",
  city: "Amsterdam",
  postal_code: "1011AA",
  iban: "NL91ABNA0417164300",
  bic: "ABNANL2A",
  logo_path: null,
  vat_frequency: "quarterly",
  bookkeeping_start_date: null,
  onboarding_completed_at: null,
  onboarding_dismissed_at: null,
  uses_kor: false,
  estimated_annual_income: null,
  meets_urencriterium: false,
  created_at: "2026-01-01",
};

const baseClient: Client = {
  id: "c1",
  user_id: "u1",
  name: "Acme BV",
  contact_name: null,
  email: null,
  address: "Kerkstraat 5",
  city: "Rotterdam",
  postal_code: "3011AB",
  kvk_number: null,
  btw_number: null,
  country: "NL",
  payment_terms_days: 30,
  archived_at: null,
  created_at: "2026-01-01",
};

const baseInvoice: Invoice = {
  id: "i1",
  user_id: "u1",
  client_id: "c1",
  invoice_number: "2026-0001",
  status: "sent",
  issue_date: "2026-04-22",
  due_date: "2026-05-22",
  sent_via: null,
  subtotal_ex_vat: 100,
  vat_rate: 21,
  vat_amount: 21,
  total_inc_vat: 121,
  notes: null,
  share_token: null,
  is_credit_note: false,
  original_invoice_id: null,
  payment_link: null,
  mollie_payment_id: null,
  payment_method: null,
  vat_scheme: "standard",
  pdf_template: null,
  archived_at: null,
  created_at: "2026-04-22",
};

const baseLine: InvoiceLine = {
  id: "l1",
  invoice_id: "i1",
  description: "Werk",
  quantity: 10,
  unit: "uren",
  rate: 10,
  amount: 100,
  sort_order: 0,
};

const makeData = (overrides: Partial<InvoiceData> = {}): InvoiceData => ({
  invoice: baseInvoice,
  lines: [baseLine],
  client: baseClient,
  profile: baseProfile,
  ...overrides,
});

function findRule(
  data: InvoiceData,
  id: string
): { passed: boolean; severity: string } {
  const results = validateDutchInvoiceRequirements(data);
  const r = results.find((x) => x.id === id);
  if (!r) throw new Error(`rule ${id} not found`);
  return { passed: r.passed, severity: r.severity };
}

describe("validateDutchInvoiceRequirements — happy path", () => {
  it("every rule passes for a complete, well-formed invoice", () => {
    const results = validateDutchInvoiceRequirements(makeData());
    const failing = results.filter((r) => !r.passed);
    expect(failing).toEqual([]);
  });

  it("produces a stable set of 15 baseline rules for the standard scheme", () => {
    // The module documents "13 wettelijke eisen" but splits NAW (naam +
    // adres) for both supplier and customer into separate rules, giving
    // 15 total. EU reverse charge adds one more.
    const results = validateDutchInvoiceRequirements(makeData());
    expect(results.length).toBe(15);
  });
});

describe("severity tiering", () => {
  it("missing factuurnummer is an error, not a warning", () => {
    const r = findRule(
      makeData({ invoice: { ...baseInvoice, invoice_number: "" } }),
      "factuurnummer"
    );
    expect(r.passed).toBe(false);
    expect(r.severity).toBe("error");
  });

  it("missing KVK is a warning (not blocking)", () => {
    const r = findRule(
      makeData({ profile: { ...baseProfile, kvk_number: null } }),
      "kvk_leverancier"
    );
    expect(r.passed).toBe(false);
    expect(r.severity).toBe("warning");
  });

  it("missing BTW is an error — required on every invoice", () => {
    const r = findRule(
      makeData({ profile: { ...baseProfile, btw_number: null } }),
      "btw_leverancier"
    );
    expect(r.passed).toBe(false);
    expect(r.severity).toBe("error");
  });
});

describe("NAW leverancier", () => {
  it("falls back from studio_name to full_name", () => {
    const r = findRule(
      makeData({
        profile: { ...baseProfile, studio_name: null, full_name: "Jan" },
      }),
      "naam_leverancier"
    );
    expect(r.passed).toBe(true);
  });

  it("rejects blank-only studio_name AND empty full_name", () => {
    const r = findRule(
      makeData({
        profile: { ...baseProfile, studio_name: "   ", full_name: "" },
      }),
      "naam_leverancier"
    );
    expect(r.passed).toBe(false);
  });

  it("requires both address AND city (warning)", () => {
    const r = findRule(
      makeData({ profile: { ...baseProfile, city: null } }),
      "adres_leverancier"
    );
    expect(r.passed).toBe(false);
    expect(r.severity).toBe("warning");
  });
});

describe("lines validation", () => {
  it("rejects an invoice with zero lines", () => {
    const data = makeData({ lines: [] });
    const omschrijving = findRule(data, "omschrijving");
    const aantal = findRule(data, "aantal");
    const eenheidsprijs = findRule(data, "eenheidsprijs");
    expect(omschrijving.passed).toBe(false);
    expect(aantal.passed).toBe(false);
    expect(eenheidsprijs.passed).toBe(false);
  });

  it("rejects a line with an empty description", () => {
    const r = findRule(
      makeData({ lines: [{ ...baseLine, description: "" }] }),
      "omschrijving"
    );
    expect(r.passed).toBe(false);
  });

  it("rejects a line with zero or negative quantity", () => {
    const zero = findRule(
      makeData({ lines: [{ ...baseLine, quantity: 0 }] }),
      "aantal"
    );
    expect(zero.passed).toBe(false);

    const negative = findRule(
      makeData({ lines: [{ ...baseLine, quantity: -1 }] }),
      "aantal"
    );
    expect(negative.passed).toBe(false);
  });

  it("accepts zero rate (e.g. free consultation line)", () => {
    const r = findRule(
      makeData({ lines: [{ ...baseLine, rate: 0 }] }),
      "eenheidsprijs"
    );
    expect(r.passed).toBe(true);
  });

  it("rejects a negative rate", () => {
    const r = findRule(
      makeData({ lines: [{ ...baseLine, rate: -5 }] }),
      "eenheidsprijs"
    );
    expect(r.passed).toBe(false);
  });
});

describe("VAT rules", () => {
  it("accepts the three legal rates: 0%, 9%, 21%", () => {
    for (const rate of [0, 9, 21] as const) {
      const r = findRule(
        makeData({ invoice: { ...baseInvoice, vat_rate: rate } }),
        "btw_tarief"
      );
      expect(r.passed).toBe(true);
    }
  });

  it("rejects non-standard rates (e.g. 10%)", () => {
    const r = findRule(
      makeData({
        invoice: { ...baseInvoice, vat_rate: 10 as unknown as 0 | 9 | 21 },
      }),
      "btw_tarief"
    );
    expect(r.passed).toBe(false);
  });

  it("btw_bedrag warning only triggers for standard scheme with 0 amount", () => {
    // Standard scheme, 21%, but vat_amount missing → warning.
    const r1 = findRule(
      makeData({
        invoice: { ...baseInvoice, vat_amount: 0, vat_rate: 21 },
      }),
      "btw_bedrag"
    );
    expect(r1.passed).toBe(false);

    // 0% rate → legitimately 0, no warning.
    const r2 = findRule(
      makeData({
        invoice: { ...baseInvoice, vat_amount: 0, vat_rate: 0 },
      }),
      "btw_bedrag"
    );
    expect(r2.passed).toBe(true);

    // Reverse charge → legitimately 0, no warning.
    const r3 = findRule(
      makeData({
        invoice: {
          ...baseInvoice,
          vat_amount: 0,
          vat_rate: 0,
          vat_scheme: "eu_reverse_charge",
        },
      }),
      "btw_bedrag"
    );
    expect(r3.passed).toBe(true);
  });

  it("requires client BTW number when scheme is eu_reverse_charge", () => {
    const data = makeData({
      invoice: {
        ...baseInvoice,
        vat_scheme: "eu_reverse_charge",
        vat_rate: 0,
        vat_amount: 0,
      },
      client: { ...baseClient, btw_number: null, country: "DE" },
    });
    const r = findRule(data, "btw_verlegd");
    expect(r.passed).toBe(false);
    expect(r.severity).toBe("error");

    const ok = findRule(
      makeData({
        invoice: {
          ...baseInvoice,
          vat_scheme: "eu_reverse_charge",
          vat_rate: 0,
          vat_amount: 0,
        },
        client: { ...baseClient, btw_number: "DE123456789" },
      }),
      "btw_verlegd"
    );
    expect(ok.passed).toBe(true);
  });

  it("omits the EU reverse-charge rule entirely for non-EU schemes", () => {
    const results = validateDutchInvoiceRequirements(
      makeData({
        invoice: { ...baseInvoice, vat_scheme: "standard" },
      })
    );
    expect(results.find((r) => r.id === "btw_verlegd")).toBeUndefined();
  });
});

describe("totals", () => {
  it("rejects total_inc_vat of zero", () => {
    const r = findRule(
      makeData({ invoice: { ...baseInvoice, total_inc_vat: 0 } }),
      "totaalbedrag"
    );
    expect(r.passed).toBe(false);
  });

  it("accepts a positive total", () => {
    const r = findRule(makeData(), "totaalbedrag");
    expect(r.passed).toBe(true);
  });
});

describe("IBAN", () => {
  it("missing IBAN is a warning, not blocking", () => {
    const r = findRule(
      makeData({ profile: { ...baseProfile, iban: null } }),
      "iban"
    );
    expect(r.passed).toBe(false);
    expect(r.severity).toBe("warning");
  });

  it("whitespace-only IBAN also fails", () => {
    const r = findRule(
      makeData({ profile: { ...baseProfile, iban: "   " } }),
      "iban"
    );
    expect(r.passed).toBe(false);
  });
});

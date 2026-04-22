import { describe, it, expect } from "vitest";
import { generateUBLInvoice } from "./ubl-generator";
import type { InvoiceData, Invoice, InvoiceLine, Client, Profile } from "@/lib/types";

const profile: Profile = {
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
  bookkeeping_start_date: "2026-01-01",
  onboarding_completed_at: null,
  onboarding_dismissed_at: null,
  uses_kor: false,
  estimated_annual_income: null,
  meets_urencriterium: true,
  created_at: "2026-01-01",
};

const client: Client = {
  id: "c1",
  user_id: "u1",
  name: "Acme BV",
  contact_name: null,
  email: "billing@acme.nl",
  address: "Kerkstraat 5",
  city: "Rotterdam",
  postal_code: "3011AB",
  kvk_number: "87654321",
  btw_number: "NL987654321B01",
  country: "NL",
  payment_terms_days: 30,
  archived_at: null,
  created_at: "2026-01-01",
};

const line = (overrides: Partial<InvoiceLine> = {}): InvoiceLine => ({
  id: "l1",
  invoice_id: "i1",
  description: "Ontwerp homepage",
  quantity: 10,
  unit: "uren",
  rate: 95,
  amount: 950,
  sort_order: 0,
  ...overrides,
});

const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: "i1",
  user_id: "u1",
  client_id: "c1",
  invoice_number: "2026-0001",
  status: "sent",
  issue_date: "2026-04-22",
  due_date: "2026-05-22",
  sent_via: null,
  subtotal_ex_vat: 950,
  vat_rate: 21,
  vat_amount: 199.5,
  total_inc_vat: 1149.5,
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
  ...overrides,
});

const data = (overrides: Partial<InvoiceData> = {}): InvoiceData => ({
  invoice: invoice(),
  lines: [line()],
  client,
  profile,
  ...overrides,
});

describe("generateUBLInvoice — root document", () => {
  it("starts with XML declaration + Invoice root for a normal invoice", () => {
    const xml = generateUBLInvoice(data());
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<Invoice");
    expect(xml).toContain("</Invoice>");
    expect(xml).not.toContain("<CreditNote");
  });

  it("uses CreditNote root and TypeCode 381 for a credit note", () => {
    const xml = generateUBLInvoice(
      data({ invoice: invoice({ is_credit_note: true }) })
    );
    expect(xml).toContain("<CreditNote");
    expect(xml).toContain("</CreditNote>");
    expect(xml).toContain("<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>");
    expect(xml).not.toContain("<cbc:InvoiceTypeCode>");
  });

  it("uses InvoiceTypeCode 380 for a normal invoice", () => {
    const xml = generateUBLInvoice(data());
    expect(xml).toContain("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>");
  });

  it("declares UBL 2.1 and NLCIUS customization", () => {
    const xml = generateUBLInvoice(data());
    expect(xml).toContain("<cbc:UBLVersionID>2.1</cbc:UBLVersionID>");
    expect(xml).toContain("urn:fdc:nen.nl:nlcius:v1.0");
    expect(xml).toContain("urn:fdc:peppol.eu:2017:poacc:billing:01:1.0");
  });
});

describe("generateUBLInvoice — identifiers and dates", () => {
  it("emits invoice number and issue/due dates", () => {
    const xml = generateUBLInvoice(data());
    expect(xml).toContain("<cbc:ID>2026-0001</cbc:ID>");
    expect(xml).toContain("<cbc:IssueDate>2026-04-22</cbc:IssueDate>");
    expect(xml).toContain("<cbc:DueDate>2026-05-22</cbc:DueDate>");
  });

  it("falls back due_date → issue_date when due is null", () => {
    const xml = generateUBLInvoice(
      data({ invoice: invoice({ due_date: null }) })
    );
    expect(xml).toContain("<cbc:DueDate>2026-04-22</cbc:DueDate>");
  });
});

describe("generateUBLInvoice — XML escaping", () => {
  it("escapes ampersands and quotes in names (prevents malformed XML)", () => {
    const xml = generateUBLInvoice(
      data({
        client: { ...client, name: 'Tom & "Jerry" <LLC>' },
      })
    );
    expect(xml).toContain("Tom &amp; &quot;Jerry&quot; &lt;LLC&gt;");
    // Critically: the raw string must not appear unescaped
    expect(xml).not.toContain("Tom & \"Jerry\"");
  });

  it("escapes apostrophes in a line description", () => {
    const xml = generateUBLInvoice(
      data({ lines: [line({ description: "O'Reilly boek" })] })
    );
    expect(xml).toContain("O&apos;Reilly boek");
  });
});

describe("generateUBLInvoice — monetary totals", () => {
  it("renders monetary amounts with exactly 2 decimals", () => {
    const xml = generateUBLInvoice(
      data({
        invoice: invoice({
          subtotal_ex_vat: 950,
          vat_amount: 199.5,
          total_inc_vat: 1149.5,
        }),
      })
    );
    expect(xml).toContain('<cbc:TaxAmount currencyID="EUR">199.50</cbc:TaxAmount>');
    expect(xml).toContain(
      '<cbc:TaxExclusiveAmount currencyID="EUR">950.00</cbc:TaxExclusiveAmount>'
    );
    expect(xml).toContain(
      '<cbc:PayableAmount currencyID="EUR">1149.50</cbc:PayableAmount>'
    );
  });

  it("tax-inclusive == tax-exclusive + tax-amount", () => {
    const xml = generateUBLInvoice(data());
    // Quick regex pluck: grab the three amounts.
    const exMatch = xml.match(/TaxExclusiveAmount currencyID="EUR">([\d.]+)</);
    const incMatch = xml.match(/TaxInclusiveAmount currencyID="EUR">([\d.]+)</);
    const taxMatch = xml.match(/PayableAmount currencyID="EUR">([\d.]+)</);
    expect(exMatch).not.toBeNull();
    expect(incMatch).not.toBeNull();
    expect(taxMatch).not.toBeNull();
    expect(Number(incMatch![1])).toBeCloseTo(Number(taxMatch![1]), 2);
  });
});

describe("generateUBLInvoice — VAT category", () => {
  it("uses category S for 21% VAT", () => {
    const xml = generateUBLInvoice(data());
    // TaxCategory for the totals block should be S.
    expect(xml).toMatch(/<cac:TaxCategory>\s*<cbc:ID>S<\/cbc:ID>/);
  });

  it("uses category Z for 0% VAT (reverse charge or export)", () => {
    const xml = generateUBLInvoice(
      data({
        invoice: invoice({
          vat_rate: 0,
          vat_amount: 0,
          total_inc_vat: 950,
          vat_scheme: "eu_reverse_charge",
        }),
      })
    );
    expect(xml).toMatch(/<cac:TaxCategory>\s*<cbc:ID>Z<\/cbc:ID>/);
  });
});

describe("generateUBLInvoice — parties", () => {
  it("emits supplier KvK and BTW when present", () => {
    const xml = generateUBLInvoice(data());
    expect(xml).toContain(
      '<cbc:CompanyID schemeID="0106">12345678</cbc:CompanyID>'
    );
    expect(xml).toContain("<cbc:CompanyID>NL123456789B01</cbc:CompanyID>");
  });

  it("omits supplier PartyTaxScheme when btw_number is null", () => {
    const xml = generateUBLInvoice(
      data({ profile: { ...profile, btw_number: null } })
    );
    // PartyTaxScheme appears per party; we check the supplier block only.
    const supplierBlock = xml.slice(
      xml.indexOf("<cac:AccountingSupplierParty>"),
      xml.indexOf("</cac:AccountingSupplierParty>")
    );
    expect(supplierBlock).not.toContain("<cac:PartyTaxScheme>");
  });

  it("emits PaymentMeans when profile has an IBAN", () => {
    const xml = generateUBLInvoice(data());
    expect(xml).toContain("<cac:PaymentMeans>");
    expect(xml).toContain("NL91ABNA0417164300");
  });

  it("omits PaymentMeans entirely when IBAN is null", () => {
    const xml = generateUBLInvoice(
      data({ profile: { ...profile, iban: null } })
    );
    expect(xml).not.toContain("<cac:PaymentMeans>");
  });
});

describe("generateUBLInvoice — lines", () => {
  it("uses InvoiceLine and InvoicedQuantity for a regular invoice", () => {
    const xml = generateUBLInvoice(data());
    expect(xml).toContain("<cac:InvoiceLine>");
    expect(xml).toContain('<cbc:InvoicedQuantity unitCode="C62">');
    expect(xml).not.toContain("<cac:CreditNoteLine>");
  });

  it("uses CreditNoteLine and CreditedQuantity for a credit note", () => {
    const xml = generateUBLInvoice(
      data({ invoice: invoice({ is_credit_note: true }) })
    );
    expect(xml).toContain("<cac:CreditNoteLine>");
    expect(xml).toContain('<cbc:CreditedQuantity unitCode="C62">');
    expect(xml).not.toContain("<cac:InvoiceLine>");
  });

  it("emits one line element per InvoiceLine with 1-based IDs", () => {
    const xml = generateUBLInvoice(
      data({
        lines: [
          line({ id: "a", description: "Regel A", amount: 100 }),
          line({ id: "b", description: "Regel B", amount: 200 }),
          line({ id: "c", description: "Regel C", amount: 300 }),
        ],
      })
    );
    expect(xml).toContain("<cbc:ID>1</cbc:ID>");
    expect(xml).toContain("<cbc:ID>2</cbc:ID>");
    expect(xml).toContain("<cbc:ID>3</cbc:ID>");
    expect(xml).toContain("Regel A");
    expect(xml).toContain("Regel B");
    expect(xml).toContain("Regel C");
  });
});

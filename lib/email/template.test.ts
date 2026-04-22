import { describe, it, expect } from "vitest";
import { buildBaseEmailHtml, buildInvoiceEmailHtml } from "./template";
import type { InvoiceData, Invoice, InvoiceLine, Client, Profile } from "@/lib/types";

const profile: Profile = {
  id: "u1",
  full_name: "Jan Jansen",
  studio_name: "Studio Jansen",
  kvk_number: "12345678",
  btw_number: "NL123456789B01",
  address: null,
  city: null,
  postal_code: null,
  iban: null,
  bic: null,
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

const client: Client = {
  id: "c1",
  user_id: "u1",
  name: "Acme BV",
  contact_name: "Piet Pietersen",
  email: "billing@acme.nl",
  address: null,
  city: null,
  postal_code: null,
  kvk_number: null,
  btw_number: null,
  country: "NL",
  payment_terms_days: 30,
  archived_at: null,
  created_at: "2026-01-01",
};

const invoice: Invoice = {
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

const line: InvoiceLine = {
  id: "l1",
  invoice_id: "i1",
  description: "Werk",
  quantity: 1,
  unit: "uren",
  rate: 100,
  amount: 100,
  sort_order: 0,
};

const data: InvoiceData = { invoice, lines: [line], client, profile };

describe("buildBaseEmailHtml", () => {
  it("escapes the CTA url and label to prevent HTML injection", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>x</p>",
      cta: {
        label: '<script>alert(1)</script>',
        url: 'javascript:alert(1)"onclick="alert(2)',
      },
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // The URL's quote-breaker must be escaped so it can't end the href attr.
    expect(html).not.toContain('onclick="alert(2)');
  });

  it("omits the unsubscribe link block when no token is provided", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>x</p>",
    });
    expect(html).not.toContain("/api/unsubscribe/");
  });

  it("includes an unsubscribe link when a token is provided", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>x</p>",
      unsubscribeToken: "abc123",
    });
    expect(html).toContain("/api/unsubscribe/abc123");
  });
});

describe("buildInvoiceEmailHtml — XSS defence on DB-sourced names", () => {
  it("escapes a malicious client name (no raw <script> in output)", () => {
    const malicious: Client = {
      ...client,
      name: '<script>alert("xss")</script>',
      contact_name: null,
    };
    const html = buildInvoiceEmailHtml(
      { ...data, client: malicious },
      { introParagraph: "Hoi", amountLabel: "Totaal" }
    );
    expect(html).not.toContain("<script>alert(");
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });

  it("escapes a malicious contact_name (preferred over name when present)", () => {
    const malicious: Client = {
      ...client,
      contact_name: '"><img src=x onerror=alert(1)>',
    };
    const html = buildInvoiceEmailHtml(
      { ...data, client: malicious },
      { introParagraph: "Hoi", amountLabel: "Totaal" }
    );
    expect(html).not.toContain('"><img src=x');
    expect(html).toContain("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes a malicious studio_name in the footer", () => {
    const malicious: Profile = {
      ...profile,
      studio_name: '<iframe src="evil.com"></iframe>',
    };
    const html = buildInvoiceEmailHtml(
      { ...data, profile: malicious },
      { introParagraph: "Hoi", amountLabel: "Totaal" }
    );
    expect(html).not.toContain('<iframe src="evil.com">');
    expect(html).toContain(
      "&lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt;"
    );
  });

  it("escapes the invoice number in the details table", () => {
    const rigged: Invoice = {
      ...invoice,
      invoice_number: '2026<script>"',
    };
    const html = buildInvoiceEmailHtml(
      { ...data, invoice: rigged },
      { introParagraph: "Hoi", amountLabel: "Totaal" }
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("2026&lt;script&gt;&quot;");
  });

  it("renders a formatted EUR total in the invoice summary", () => {
    const html = buildInvoiceEmailHtml(data, {
      introParagraph: "Hoi",
      amountLabel: "Totaal",
    });
    // formatCurrency yields "€ 121,00" or similar — assert just the amount.
    expect(html).toContain("121,00");
  });

  it("trusts introParagraph and extraHtml — caller responsibility", () => {
    // These fields are documented as pre-escaped. We assert that we don't
    // accidentally double-escape them (breaks existing callers that pass
    // HTML like <strong>…</strong> intentionally).
    const html = buildInvoiceEmailHtml(data, {
      introParagraph: "Hierbij factuur <strong>2026-0001</strong>.",
      amountLabel: "Totaal",
      extraHtml: '<p class="x">Extra</p>',
    });
    expect(html).toContain("<strong>2026-0001</strong>");
    expect(html).toContain('<p class="x">Extra</p>');
  });
});

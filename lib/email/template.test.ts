import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/format", async () => {
  const actual = await vi.importActual<typeof import("@/lib/format")>(
    "@/lib/format"
  );
  return {
    ...actual,
    // Keep real escapeHtml and formatCurrency
  };
});

import { buildBaseEmailHtml, buildInvoiceEmailHtml } from "./template";
import { escapeHtml } from "@/lib/format";
import type { InvoiceData } from "@/lib/types";

// ─── buildBaseEmailHtml ───

describe("buildBaseEmailHtml", () => {
  it("bevat DOCTYPE declaratie", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
    });
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("bevat <html>, <head>, en <body> tags", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
    });
    expect(html).toContain("<html");
    expect(html).toContain("<head>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
    expect(html).toContain("</html>");
  });

  it("bevat de titel in een h1 tag", () => {
    const html = buildBaseEmailHtml({
      title: "Mijn Factuur",
      contentHtml: "<p>Test</p>",
    });
    expect(html).toContain("Mijn Factuur</h1>");
  });

  it("bevat de content HTML", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: '<p class="special">Speciale inhoud</p>',
    });
    expect(html).toContain('<p class="special">Speciale inhoud</p>');
  });

  it("voegt CTA-knop toe wanneer cta is meegegeven", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
      cta: { label: "Betaal nu", url: "https://vat100.nl/pay/123" },
    });
    expect(html).toContain("Betaal nu");
    expect(html).toContain("https://vat100.nl/pay/123");
  });

  it("toont geen CTA-knop zonder cta optie", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
    });
    // Geen <a> tag met background:#000000 stijl
    expect(html).not.toContain("inline-block;background:#000000");
  });

  it("toont standaard footer tekst als geen footerText is meegegeven", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
    });
    expect(html).toContain("De premium standaard voor creatief boekhouden.");
  });

  it("toont aangepaste footer tekst", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
      footerText: "Verzonden door Studio X",
    });
    expect(html).toContain("Verzonden door Studio X");
    expect(html).not.toContain("De premium standaard voor creatief boekhouden.");
  });

  it("voegt unsubscribe link toe wanneer token is meegegeven", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
      unsubscribeToken: "tok_abc123",
    });
    expect(html).toContain("Emailvoorkeuren beheren");
    expect(html).toContain("tok_abc123");
  });

  it("toont geen unsubscribe link zonder token", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
    });
    expect(html).not.toContain("Emailvoorkeuren beheren");
  });

  it("bevat VAT100 branding", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
    });
    expect(html).toContain("VAT100 Founder Hub");
  });

  it("is ingesteld op Nederlandse taal", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
    });
    expect(html).toContain('lang="nl"');
  });
});

// ─── XSS prevention ───

describe("XSS-preventie in email templates", () => {
  it("escapet HTML in CTA-label", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
      cta: {
        label: '<script>alert("xss")</script>',
        url: "https://vat100.nl",
      },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapet HTML in CTA-url", () => {
    const html = buildBaseEmailHtml({
      title: "Test",
      contentHtml: "<p>Inhoud</p>",
      cta: {
        label: "Klik",
        url: 'https://evil.com/"><script>alert(1)</script>',
      },
    });
    expect(html).not.toContain('"><script>');
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("escapeHtml werkt correct voor alle speciale tekens", () => {
    const result = escapeHtml(`<div class="test">'Tom & Jerry'</div>`);
    expect(result).toBe(
      "&lt;div class=&quot;test&quot;&gt;&#39;Tom &amp; Jerry&#39;&lt;/div&gt;"
    );
  });
});

// ─── buildInvoiceEmailHtml ───

describe("buildInvoiceEmailHtml", () => {
  const mockInvoiceData: InvoiceData = {
    invoice: {
      id: "inv-1",
      user_id: "user-1",
      client_id: "client-1",
      invoice_number: "2026-001",
      status: "sent",
      issue_date: "2026-04-10",
      due_date: "2026-05-10",
      sent_via: null,
      subtotal_ex_vat: 1000,
      vat_rate: 21,
      vat_amount: 210,
      total_inc_vat: 1210,
      notes: null,
      share_token: null,
      is_credit_note: false,
      original_invoice_id: null,
      payment_link: null,
      mollie_payment_id: null,
      payment_method: null,
      vat_scheme: "standard",
      pdf_template: null,
      created_at: "2026-04-10T00:00:00Z",
    },
    lines: [],
    client: {
      id: "client-1",
      user_id: "user-1",
      name: "Acme BV",
      contact_name: "Jan de Vries",
      email: "jan@acme.nl",
      address: "Keizersgracht 1",
      city: "Amsterdam",
      postal_code: "1015AA",
      kvk_number: null,
      btw_number: null,
      country: "NL",
      payment_terms_days: 30,
      created_at: "2026-01-01T00:00:00Z",
    },
    profile: {
      id: "user-1",
      full_name: "Lisa Bakker",
      studio_name: "Studio Bakker",
      kvk_number: "12345678",
      btw_number: "NL123456789B01",
      address: "Prinsengracht 10",
      city: "Amsterdam",
      postal_code: "1016GR",
      iban: "NL91ABNA0417164300",
      bic: "ABNANL2A",
      logo_path: null,
      vat_frequency: "quarterly",
      bookkeeping_start_date: null,
      onboarding_completed_at: null,
      created_at: "2026-01-01T00:00:00Z",
    },
  };

  it("bevat factuurnummer", () => {
    const html = buildInvoiceEmailHtml(mockInvoiceData, {
      introParagraph: "Hierbij uw factuur.",
      amountLabel: "Totaal incl. BTW",
    });
    expect(html).toContain("2026-001");
  });

  it("bevat klant contactnaam", () => {
    const html = buildInvoiceEmailHtml(mockInvoiceData, {
      introParagraph: "Hierbij uw factuur.",
      amountLabel: "Totaal incl. BTW",
    });
    expect(html).toContain("Jan de Vries");
  });

  it("gebruikt bedrijfsnaam als contact_name ontbreekt", () => {
    const dataNoContact: InvoiceData = {
      ...mockInvoiceData,
      client: {
        ...mockInvoiceData.client,
        contact_name: null,
      },
    };
    const html = buildInvoiceEmailHtml(dataNoContact, {
      introParagraph: "Hierbij uw factuur.",
      amountLabel: "Totaal incl. BTW",
    });
    expect(html).toContain("Acme BV");
  });

  it("gebruikt studio_name als afzender", () => {
    const html = buildInvoiceEmailHtml(mockInvoiceData, {
      introParagraph: "Hierbij uw factuur.",
      amountLabel: "Totaal incl. BTW",
    });
    expect(html).toContain("Studio Bakker");
  });

  it("valt terug op full_name als studio_name ontbreekt", () => {
    const dataNoStudio: InvoiceData = {
      ...mockInvoiceData,
      profile: {
        ...mockInvoiceData.profile,
        studio_name: null,
      },
    };
    const html = buildInvoiceEmailHtml(dataNoStudio, {
      introParagraph: "Hierbij uw factuur.",
      amountLabel: "Totaal incl. BTW",
    });
    expect(html).toContain("Lisa Bakker");
  });

  it("bevat extraHtml indien meegegeven", () => {
    const html = buildInvoiceEmailHtml(mockInvoiceData, {
      introParagraph: "Hierbij uw factuur.",
      amountLabel: "Totaal incl. BTW",
      extraHtml: '<div class="iban-block">NL91ABNA0417164300</div>',
    });
    expect(html).toContain("iban-block");
    expect(html).toContain("NL91ABNA0417164300");
  });

  it("produceert valide HTML structuur", () => {
    const html = buildInvoiceEmailHtml(mockInvoiceData, {
      introParagraph: "Hierbij uw factuur.",
      amountLabel: "Totaal incl. BTW",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });
});

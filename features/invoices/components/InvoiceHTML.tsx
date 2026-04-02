import type { InvoiceData, InvoiceTemplate } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n";
import { calculatePaymentDays } from "@/lib/logic/invoice-calculations";
import { formatCurrency } from "@/lib/format";

// ─── Shared helpers ───

function fmtDate(d: string | null, locale: Locale = "nl"): string {
  if (!d) return "—";
  const l = locale === "en" ? "en-GB" : "nl-NL";
  return new Date(d).toLocaleDateString(l, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateLong(d: string | null, locale: Locale = "nl"): string {
  if (!d) return "—";
  const l = locale === "en" ? "en-GB" : "nl-NL";
  return new Date(d).toLocaleDateString(l, { day: "numeric", month: "long", year: "numeric" });
}

const fmtEur = formatCurrency;

function unitLabel(u: string, t: ReturnType<typeof getDictionary>): string {
  if (u === "dagen") return t.invoices.unitDays;
  if (u === "uren") return t.invoices.unitHours;
  return t.invoices.unitPieces;
}

// ─── Dispatcher ───

export function InvoiceHTML({ data, template = "minimaal", locale = "nl" }: { data: InvoiceData; template?: InvoiceTemplate; locale?: Locale }) {
  switch (template) {
    case "klassiek": return <KlassiekHTML data={data} locale={locale} />;
    case "strak": return <StrakHTML data={data} locale={locale} />;
    default: return <MinimaalHTML data={data} locale={locale} />;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE 1: MINIMAAL — Current VAT100 style, refined
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MinimaalHTML({ data, locale }: { data: InvoiceData; locale: Locale }) {
  const t = getDictionary(locale);
  const { invoice, lines, client, profile } = data;
  const isCreditNote = invoice.is_credit_note;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  const INK = "#000";
  const GREY = "rgba(0,0,0,0.4)";
  const RULE = "rgba(0,0,0,0.08)";
  const F = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const COL_R = 220;

  const lbl: React.CSSProperties = { fontSize: 7, letterSpacing: "0.12em", color: GREY, textTransform: "uppercase", fontWeight: 400 };
  const body: React.CSSProperties = { fontSize: 8.5, color: GREY, lineHeight: 1.6 };

  return (
    <div style={{ width: 595, minHeight: 842, padding: 48, fontFamily: F, color: INK, background: "#fff", position: "relative", boxSizing: "border-box" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 120, letterSpacing: "-0.04em", color: INK, opacity: 0.045, lineHeight: 0.78 }}>VAT100</div>
      </div>
      <div style={{ display: "flex", marginBottom: 28 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{profile.studio_name || profile.full_name}</div>
          {profile.kvk_number && <div style={body}>KVK {profile.kvk_number}</div>}
          {profile.btw_number && <div style={body}>BTW {profile.btw_number}</div>}
          {profile.address && <div style={body}>{profile.address}</div>}
          {(profile.postal_code || profile.city) && <div style={body}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</div>}
        </div>
        <div style={{ width: COL_R }}>
          <div style={{ ...lbl, fontWeight: 700, marginBottom: 12 }}>{isCreditNote ? t.invoiceDoc.creditNote : t.invoiceDoc.invoice}</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>{invoice.invoice_number}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={lbl}>{t.invoiceDoc.date}</span><span style={{ fontSize: 9 }}>{fmtDate(invoice.issue_date)}</span>
          </div>
          {invoice.due_date && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={lbl}>{t.invoiceDoc.dueDate}</span><span style={{ fontSize: 9 }}>{fmtDate(invoice.due_date)}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ borderBottom: `0.5px solid ${RULE}`, marginBottom: 20 }} />
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...lbl, marginBottom: 5 }}>{t.invoiceDoc.to}</div>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{client.name}</div>
        {showContact && <div style={body}>{client.contact_name}</div>}
        {client.address && <div style={body}>{client.address}</div>}
        {(client.postal_code || client.city) && <div style={body}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</div>}
        {client.kvk_number && <div style={body}>KVK {client.kvk_number}</div>}
      </div>
      {invoice.notes && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...lbl, marginBottom: 4 }}>{t.invoiceDoc.description}</div>
          <div style={body}>{invoice.notes}</div>
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", borderBottom: `0.5px solid ${INK}`, paddingBottom: 6 }}>
          <div style={{ ...lbl, width: "48%" }}>{t.invoiceDoc.description}</div>
          <div style={{ ...lbl, width: "14%" }}>{t.invoiceDoc.quantity}</div>
          <div style={{ ...lbl, width: "18%", textAlign: "right" }}>{t.invoiceDoc.rate}</div>
          <div style={{ ...lbl, width: "20%", textAlign: "right" }}>{t.invoiceDoc.amount}</div>
        </div>
        {lines.map((l, i) => (
          <div key={l.id} style={{ display: "flex", padding: "7px 0", borderBottom: `0.5px solid ${i === lines.length - 1 ? INK : RULE}` }}>
            <div style={{ width: "48%", fontSize: 9 }}>{l.description}</div>
            <div style={{ width: "14%", fontSize: 9 }}>{l.quantity} {unitLabel(l.unit, t)}</div>
            <div style={{ width: "18%", fontSize: 9, textAlign: "right" }}>{fmtEur(l.rate)}</div>
            <div style={{ width: "20%", fontSize: 9, textAlign: "right" }}>{fmtEur(l.amount)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <div style={{ width: COL_R }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <span style={lbl}>{t.invoiceDoc.subtotalExVat}</span><span style={{ fontSize: 9, color: GREY }}>{fmtEur(invoice.subtotal_ex_vat)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <span style={lbl}>{t.invoiceDoc.vat} {invoice.vat_rate ?? 21}%</span><span style={{ fontSize: 9, color: GREY }}>{fmtEur(invoice.vat_amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: 4, borderTop: `1px solid ${INK}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.invoiceDoc.total}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtEur(invoice.total_inc_vat)}</span>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 48, left: 48, right: 48, display: "flex", gap: 32, borderTop: `0.5px solid ${RULE}`, paddingTop: 10 }}>
        {profile.iban && <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>IBAN</div><div style={{ fontSize: 8 }}>{profile.iban}</div></div>}
        {profile.bic && <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>BIC</div><div style={{ fontSize: 8 }}>{profile.bic}</div></div>}
        <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>{t.invoiceDoc.paymentTerms}</div><div style={{ fontSize: 8 }}>{days} {t.invoiceDoc.daysNet}</div></div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE 2: KLASSIEK — Bold title, clean professional
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function KlassiekHTML({ data, locale }: { data: InvoiceData; locale: Locale }) {
  const t = getDictionary(locale);
  const { invoice, lines, client, profile } = data;
  const isCreditNote = invoice.is_credit_note;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  const INK = "#000";
  const GREY = "rgba(0,0,0,0.45)";
  const RULE = "rgba(0,0,0,0.1)";
  const F = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  const lbl: React.CSSProperties = { fontSize: 7.5, letterSpacing: "0.1em", color: GREY, textTransform: "uppercase", fontWeight: 500 };
  const body: React.CSSProperties = { fontSize: 9, color: INK, lineHeight: 1.7 };
  const bodyGrey: React.CSSProperties = { ...body, color: GREY };

  return (
    <div style={{ width: 595, minHeight: 842, padding: "56px 48px 48px", fontFamily: F, color: INK, background: "#FAFAF8", position: "relative", boxSizing: "border-box" }}>
      {/* Header — Big title + meta right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
        <div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.9, marginBottom: 8 }}>
            VAT100
          </div>
          <div style={{ fontSize: 8, letterSpacing: "0.12em", color: GREY, textTransform: "uppercase", marginTop: 8 }}>
            {isCreditNote ? t.invoiceDoc.creditNote : t.invoiceDoc.invoice}
          </div>
        </div>
        <div style={{ textAlign: "right", paddingTop: 8 }}>
          <div style={{ fontSize: 9, color: GREY, marginBottom: 4 }}>{fmtDateLong(invoice.issue_date, locale)}</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>Nr. {invoice.invoice_number}</div>
        </div>
      </div>

      {/* From + To in two columns */}
      <div style={{ display: "flex", gap: 40, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...lbl, marginBottom: 8 }}>{t.invoiceDoc.from}</div>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{profile.studio_name || profile.full_name}</div>
          {profile.address && <div style={bodyGrey}>{profile.address}</div>}
          {(profile.postal_code || profile.city) && <div style={bodyGrey}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</div>}
          {profile.kvk_number && <div style={{ ...bodyGrey, marginTop: 4 }}>KVK {profile.kvk_number}</div>}
          {profile.btw_number && <div style={bodyGrey}>BTW {profile.btw_number}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...lbl, marginBottom: 8 }}>{t.invoiceDoc.to}</div>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{client.name}</div>
          {showContact && <div style={bodyGrey}>{client.contact_name}</div>}
          {client.address && <div style={bodyGrey}>{client.address}</div>}
          {(client.postal_code || client.city) && <div style={bodyGrey}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</div>}
          {client.kvk_number && <div style={{ ...bodyGrey, marginTop: 4 }}>{t.invoiceDoc.kvk} {client.kvk_number}</div>}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderBottom: `0.5px solid ${RULE}`, marginBottom: 32 }} />

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginBottom: 24 }}>
          <div style={bodyGrey}>{invoice.notes}</div>
        </div>
      )}

      {/* Table */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${INK}`, paddingBottom: 8 }}>
          <div style={{ ...lbl, width: "46%" }}>{t.invoiceDoc.description}</div>
          <div style={{ ...lbl, width: "16%", textAlign: "center" }}>{t.invoiceDoc.quantity}</div>
          <div style={{ ...lbl, width: "18%", textAlign: "right" }}>{t.invoiceDoc.rate}</div>
          <div style={{ ...lbl, width: "20%", textAlign: "right" }}>{t.invoiceDoc.amount}</div>
        </div>
        {lines.map((l, i) => (
          <div key={l.id} style={{ display: "flex", padding: "10px 0", borderBottom: `0.5px solid ${i === lines.length - 1 ? INK : RULE}`, alignItems: "baseline" }}>
            <div style={{ width: "46%", fontSize: 10, fontWeight: 400 }}>{l.description}</div>
            <div style={{ width: "16%", fontSize: 9, textAlign: "center", color: GREY }}>{l.quantity} {unitLabel(l.unit, t)}</div>
            <div style={{ width: "18%", fontSize: 9, textAlign: "right", color: GREY }}>{fmtEur(l.rate)}</div>
            <div style={{ width: "20%", fontSize: 10, textAlign: "right", fontWeight: 500 }}>{fmtEur(l.amount)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 240 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span style={lbl}>{t.invoiceDoc.subtotalExVat}</span><span style={{ fontSize: 9, color: GREY }}>{fmtEur(invoice.subtotal_ex_vat)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span style={lbl}>{t.invoiceDoc.vat} {invoice.vat_rate ?? 21}%</span><span style={{ fontSize: 9, color: GREY }}>{fmtEur(invoice.vat_amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6, borderTop: `1.5px solid ${INK}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.invoiceDoc.total}</span>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{fmtEur(invoice.total_inc_vat)}</span>
          </div>
        </div>
      </div>

      {/* Due date */}
      {invoice.due_date && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 8.5, color: GREY }}>{t.invoiceDoc.paymentTerms}: {fmtDateLong(invoice.due_date, locale)}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 48, left: 48, right: 48, borderTop: `0.5px solid ${RULE}`, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 32 }}>
          {profile.iban && <div><div style={{ ...lbl, fontSize: 6.5, marginBottom: 2 }}>IBAN</div><div style={{ fontSize: 8.5, fontWeight: 500 }}>{profile.iban}</div></div>}
          {profile.bic && <div><div style={{ ...lbl, fontSize: 6.5, marginBottom: 2 }}>BIC</div><div style={{ fontSize: 8.5, fontWeight: 500 }}>{profile.bic}</div></div>}
          <div><div style={{ ...lbl, fontSize: 6.5, marginBottom: 2 }}>{t.invoiceDoc.paymentTerms}</div><div style={{ fontSize: 8.5, fontWeight: 500 }}>{days} {t.invoiceDoc.daysNet}</div></div>
        </div>
        <div style={{ fontSize: 7, color: GREY, alignSelf: "flex-end" }}>
          {profile.studio_name || profile.full_name}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE 3: STRAK — Jil Sander inspired, ultra minimal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StrakHTML({ data, locale }: { data: InvoiceData; locale: Locale }) {
  const t = getDictionary(locale);
  const { invoice, lines, client, profile } = data;
  const isCreditNote = invoice.is_credit_note;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  const INK = "#1A1A1A";
  const GREY = "rgba(0,0,0,0.35)";
  const RULE = "rgba(0,0,0,0.06)";
  const F = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  const lbl: React.CSSProperties = { fontSize: 6.5, letterSpacing: "0.16em", color: GREY, textTransform: "uppercase", fontWeight: 400 };
  const body: React.CSSProperties = { fontSize: 8, color: GREY, lineHeight: 1.8 };

  return (
    <div style={{ width: 595, minHeight: 842, padding: "64px 56px 56px", fontFamily: F, color: INK, background: "#FAF9F6", position: "relative", boxSizing: "border-box" }}>
      {/* Brand — large and bold like Jil Sander */}
      <div style={{ marginBottom: 64 }}>
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.85 }}>
          VAT100
        </div>
      </div>

      {/* Minimal meta row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 48, paddingBottom: 16, borderBottom: `0.5px solid ${RULE}` }}>
        <div>
          <div style={{ ...lbl, marginBottom: 6 }}>{isCreditNote ? t.invoiceDoc.creditNote : t.invoiceDoc.invoice}</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em" }}>{invoice.invoice_number}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...lbl, marginBottom: 6 }}>{t.invoiceDoc.date}</div>
          <div style={{ fontSize: 9, fontWeight: 400 }}>{fmtDate(invoice.issue_date)}</div>
        </div>
        {invoice.due_date && (
          <div style={{ textAlign: "right" }}>
            <div style={{ ...lbl, marginBottom: 6 }}>{t.invoiceDoc.dueDate}</div>
            <div style={{ fontSize: 9, fontWeight: 400 }}>{fmtDate(invoice.due_date)}</div>
          </div>
        )}
      </div>

      {/* Client — minimal */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ ...lbl, marginBottom: 8 }}>{t.invoiceDoc.to}</div>
        <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{client.name}</div>
        {showContact && <div style={body}>{client.contact_name}</div>}
        {client.address && <div style={body}>{client.address}</div>}
        {(client.postal_code || client.city) && <div style={body}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</div>}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginBottom: 32, fontSize: 8.5, color: GREY, lineHeight: 1.7 }}>{invoice.notes}</div>
      )}

      {/* Table — extreme simplicity */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", paddingBottom: 8, borderBottom: `0.5px solid ${RULE}` }}>
          <div style={{ ...lbl, width: "50%" }}>{t.invoiceDoc.description}</div>
          <div style={{ ...lbl, width: "14%", textAlign: "right" }}>{t.invoiceDoc.quantity}</div>
          <div style={{ ...lbl, width: "18%", textAlign: "right" }}>{t.invoiceDoc.rate}</div>
          <div style={{ ...lbl, width: "18%", textAlign: "right" }}>{t.invoiceDoc.amount}</div>
        </div>
        {lines.map((l) => (
          <div key={l.id} style={{ display: "flex", padding: "10px 0", borderBottom: `0.5px solid ${RULE}`, alignItems: "baseline" }}>
            <div style={{ width: "50%", fontSize: 9, fontWeight: 400 }}>{l.description}</div>
            <div style={{ width: "14%", fontSize: 8, textAlign: "right", color: GREY }}>{l.quantity} {unitLabel(l.unit, t)}</div>
            <div style={{ width: "18%", fontSize: 8, textAlign: "right", color: GREY }}>{fmtEur(l.rate)}</div>
            <div style={{ width: "18%", fontSize: 9, textAlign: "right", fontWeight: 500 }}>{fmtEur(l.amount)}</div>
          </div>
        ))}
      </div>

      {/* Totals — right-aligned, minimal */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
            <span style={lbl}>{t.invoiceDoc.subtotalExVat}</span><span style={{ fontSize: 8, color: GREY }}>{fmtEur(invoice.subtotal_ex_vat)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
            <span style={lbl}>{t.invoiceDoc.vat} {invoice.vat_rate ?? 21}%</span><span style={{ fontSize: 8, color: GREY }}>{fmtEur(invoice.vat_amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", marginTop: 8, borderTop: `0.5px solid ${INK}` }}>
            <span style={{ ...lbl, color: INK, fontWeight: 600 }}>{t.invoiceDoc.total}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtEur(invoice.total_inc_vat)}</span>
          </div>
        </div>
      </div>

      {/* Footer — absolute bottom, hairline separator */}
      <div style={{ position: "absolute", bottom: 56, left: 56, right: 56 }}>
        <div style={{ borderTop: `0.5px solid ${RULE}`, paddingTop: 12, display: "flex", gap: 40 }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 600, marginBottom: 1 }}>{profile.studio_name || profile.full_name}</div>
            {profile.address && <div style={{ fontSize: 7, color: GREY }}>{profile.address}, {[profile.postal_code, profile.city].filter(Boolean).join(" ")}</div>}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
            {profile.iban && <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>IBAN</div><div style={{ fontSize: 7.5 }}>{profile.iban}</div></div>}
            {profile.bic && <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>BIC</div><div style={{ fontSize: 7.5 }}>{profile.bic}</div></div>}
            <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>{t.invoiceDoc.paymentTerms}</div><div style={{ fontSize: 7.5 }}>{days} {t.invoiceDoc.daysNet}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { InvoiceData } from "@/lib/types";
import { calculatePaymentDays } from "@/lib/logic/invoice-calculations";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

function unit(u: string): string {
  return u === "dagen" ? "dagen" : u === "uren" ? "uren" : "stuks";
}

// ─── Design tokens ───

const INK = "#000";
const GREY = "rgba(0,0,0,0.4)";
const RULE = "rgba(0,0,0,0.08)";
const F = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const COL_R = 220;

const lbl: React.CSSProperties = {
  fontSize: 7, letterSpacing: "0.12em", color: GREY, textTransform: "uppercase", fontWeight: 400,
};

const body: React.CSSProperties = {
  fontSize: 8.5, color: GREY, lineHeight: 1.6,
};

// ─── Component ───

export function InvoiceHTML({ data }: { data: InvoiceData }) {
  const { invoice, lines, client, profile } = data;
  const isCreditNote = invoice.is_credit_note;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  return (
    <div style={{ width: 595, minHeight: 842, padding: 48, fontFamily: F, color: INK, background: "#fff", position: "relative", boxSizing: "border-box" }}>

      {/* Watermark */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 120, letterSpacing: "-0.04em", color: INK, opacity: 0.045, lineHeight: 0.78 }}>VAT100</div>
      </div>

      {/* Meta grid */}
      <div style={{ display: "flex", marginBottom: 28 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{profile.studio_name || profile.full_name}</div>
          {profile.kvk_number && <div style={body}>KVK {profile.kvk_number}</div>}
          {profile.btw_number && <div style={body}>BTW {profile.btw_number}</div>}
          {profile.address && <div style={body}>{profile.address}</div>}
          {(profile.postal_code || profile.city) && <div style={body}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</div>}
        </div>
        <div style={{ width: COL_R }}>
          <div style={{ ...lbl, fontWeight: 700, marginBottom: 12 }}>{isCreditNote ? "Creditnota" : "Factuur"}</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>{invoice.invoice_number}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={lbl}>Datum</span>
            <span style={{ fontSize: 9 }}>{fmtDate(invoice.issue_date)}</span>
          </div>
          {invoice.due_date && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={lbl}>Vervaldatum</span>
              <span style={{ fontSize: 9 }}>{fmtDate(invoice.due_date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderBottom: `0.5px solid ${RULE}`, marginBottom: 20 }} />

      {/* Client */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...lbl, marginBottom: 5 }}>Aan</div>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{client.name}</div>
        {showContact && <div style={body}>{client.contact_name}</div>}
        {client.address && <div style={body}>{client.address}</div>}
        {(client.postal_code || client.city) && <div style={body}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</div>}
        {client.kvk_number && <div style={body}>KVK {client.kvk_number}</div>}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...lbl, marginBottom: 4 }}>Omschrijving</div>
          <div style={body}>{invoice.notes}</div>
        </div>
      )}

      {/* Table */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", borderBottom: `0.5px solid ${INK}`, paddingBottom: 6 }}>
          <div style={{ ...lbl, width: "48%" }}>Omschrijving</div>
          <div style={{ ...lbl, width: "14%" }}>Aantal</div>
          <div style={{ ...lbl, width: "18%", textAlign: "right" }}>Tarief</div>
          <div style={{ ...lbl, width: "20%", textAlign: "right" }}>Bedrag</div>
        </div>
        {lines.map((l, i) => (
          <div key={l.id} style={{ display: "flex", padding: "7px 0", borderBottom: `0.5px solid ${i === lines.length - 1 ? INK : RULE}` }}>
            <div style={{ width: "48%", fontSize: 9 }}>{l.description}</div>
            <div style={{ width: "14%", fontSize: 9 }}>{l.quantity} {unit(l.unit)}</div>
            <div style={{ width: "18%", fontSize: 9, textAlign: "right" }}>{fmtEur(l.rate)}</div>
            <div style={{ width: "20%", fontSize: 9, textAlign: "right" }}>{fmtEur(l.amount)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <div style={{ width: COL_R }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <span style={lbl}>Subtotaal</span>
            <span style={{ fontSize: 9, color: GREY }}>{fmtEur(invoice.subtotal_ex_vat)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <span style={lbl}>BTW {invoice.vat_rate ?? 21}%</span>
            <span style={{ fontSize: 9, color: GREY }}>{fmtEur(invoice.vat_amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: 4, borderTop: `1px solid ${INK}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Totaal</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtEur(invoice.total_inc_vat)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 48, left: 48, right: 48, display: "flex", gap: 32, borderTop: `0.5px solid ${RULE}`, paddingTop: 10 }}>
        {profile.iban && <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>IBAN</div><div style={{ fontSize: 8 }}>{profile.iban}</div></div>}
        {profile.bic && <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>BIC</div><div style={{ fontSize: 8 }}>{profile.bic}</div></div>}
        <div><div style={{ ...lbl, fontSize: 6, marginBottom: 2 }}>Betaaltermijn</div><div style={{ fontSize: 8 }}>{days} dagen</div></div>
      </div>
    </div>
  );
}

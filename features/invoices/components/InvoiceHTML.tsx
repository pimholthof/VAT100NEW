import type { InvoiceData } from "@/lib/types";
import { calculatePaymentDays } from "@/lib/logic/invoice-calculations";

// ─── Helpers ───

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function unitLabel(unit: string): string {
  if (unit === "dagen") return "dagen";
  if (unit === "uren") return "uren";
  return "stuks";
}

// ─── Component ───

export function InvoiceHTML({ data }: { data: InvoiceData }) {
  const { invoice, lines, client, profile } = data;
  const isCreditNote = invoice.is_credit_note;

  const paymentDays = calculatePaymentDays({
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    defaultDays: 30,
  });

  return (
    <div style={page}>
      {/* ── Massive VAT100 Header ── */}
      <div style={header}>
        <div style={vat100Mark}>VAT100</div>
      </div>

      {/* ── Two-column Meta ── */}
      <div style={metaGrid}>
        {/* Left: Sender */}
        <div style={{ flex: "0 0 55%" }}>
          <div style={senderName}>
            {profile.studio_name || profile.full_name}
          </div>
          {profile.kvk_number && (
            <div style={senderDetail}>KVK {profile.kvk_number}</div>
          )}
          {profile.btw_number && (
            <div style={senderDetail}>BTW {profile.btw_number}</div>
          )}
          {profile.address && (
            <div style={senderDetail}>{profile.address}</div>
          )}
          {(profile.postal_code || profile.city) && (
            <div style={senderDetail}>
              {[profile.postal_code, profile.city].filter(Boolean).join(" ")}
            </div>
          )}
        </div>

        {/* Right: Invoice metadata */}
        <div style={{ flex: 1 }}>
          <div style={docType}>
            {isCreditNote ? "CREDITNOTA" : "FACTUUR"}
          </div>
          <div style={metaLabelStyle}>
            {isCreditNote ? "Creditnotanr" : "Factuurnr"}
          </div>
          <div style={invoiceNumber}>{invoice.invoice_number}</div>
          <div style={metaRowStyle}>
            <span style={metaLabelStyle}>Datum</span>
            <span style={metaValueStyle}>{formatDate(invoice.issue_date)}</span>
          </div>
          {invoice.due_date && (
            <div style={metaRowStyle}>
              <span style={metaLabelStyle}>Vervaldatum</span>
              <span style={metaValueStyle}>
                {formatDate(invoice.due_date)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Client ── */}
      <div style={clientSection}>
        <div style={clientLabel}>Aan</div>
        <div style={clientName}>{client.name}</div>
        {client.contact_name && (
          <div style={clientDetail}>{client.contact_name}</div>
        )}
        {client.address && (
          <div style={clientDetail}>{client.address}</div>
        )}
        {(client.postal_code || client.city) && (
          <div style={clientDetail}>
            {[client.postal_code, client.city].filter(Boolean).join(" ")}
          </div>
        )}
        {client.kvk_number && (
          <div style={clientDetail}>KVK {client.kvk_number}</div>
        )}
      </div>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div style={notesSection}>
          <div style={notesLabel}>Omschrijving</div>
          <div style={notesText}>{invoice.notes}</div>
        </div>
      )}

      {/* ── Table ── */}
      <div style={tableSection}>
        <div style={tableHeaderStyle}>
          <div style={{ ...tableHeaderCell, width: "50%" }}>Omschrijving</div>
          <div style={{ ...tableHeaderCell, width: "12%" }}>Aantal</div>
          <div style={{ ...tableHeaderCell, width: "18%", textAlign: "right" }}>
            Tarief
          </div>
          <div style={{ ...tableHeaderCell, width: "20%", textAlign: "right" }}>
            Bedrag
          </div>
        </div>

        {lines.map((line, i) => (
          <div
            style={i === lines.length - 1 ? tableRowLast : tableRow}
            key={line.id}
          >
            <div style={{ ...tableCell, width: "50%" }}>
              {line.description}
            </div>
            <div style={{ ...tableCell, width: "12%" }}>
              {line.quantity} {unitLabel(line.unit)}
            </div>
            <div style={{ ...tableCell, width: "18%", textAlign: "right" }}>
              {formatCurrency(line.rate)}
            </div>
            <div style={{ ...tableCell, width: "20%", textAlign: "right" }}>
              {formatCurrency(line.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Totals ── */}
      <div style={totalsContainer}>
        <div style={totalsRow}>
          <span style={totalsLabelStyle}>Subtotaal excl. BTW</span>
          <span style={totalsValueStyle}>
            {formatCurrency(invoice.subtotal_ex_vat)}
          </span>
        </div>
        <div style={totalsRow}>
          <span style={totalsLabelStyle}>
            BTW {invoice.vat_rate ?? 21}%
          </span>
          <span style={totalsValueStyle}>
            {formatCurrency(invoice.vat_amount)}
          </span>
        </div>
        <div style={totalRowStyle}>
          <span style={totalLabelStyle}>Totaal</span>
          <span style={totalValueStyle}>
            {formatCurrency(invoice.total_inc_vat)}
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={footer}>
        <div style={footerRow}>
          {profile.iban && (
            <div style={footerCol}>
              <div style={footerLabel}>IBAN</div>
              <div style={footerValue}>{profile.iban}</div>
            </div>
          )}
          {profile.bic && (
            <div style={footerCol}>
              <div style={footerLabel}>BIC</div>
              <div style={footerValue}>{profile.bic}</div>
            </div>
          )}
          <div style={footerCol}>
            <div style={footerLabel}>Betaaltermijn</div>
            <div style={footerValue}>{paymentDays} dagen</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline styles ───

const COLOR = "#000000";
const ACCENT = "#A51C30";
const FONT_STACK =
  '"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif';

const page: React.CSSProperties = {
  width: "595px",
  minHeight: "842px",
  padding: "48px",
  fontFamily: FONT_STACK,
  fontWeight: 400,
  color: COLOR,
  backgroundColor: "#FFFFFF",
  position: "relative",
  boxSizing: "border-box",
};

const header: React.CSSProperties = {
  marginBottom: "20px",
};

const vat100Mark: React.CSSProperties = {
  fontFamily: FONT_STACK,
  fontWeight: 700,
  fontSize: "72px",
  letterSpacing: "-0.05em",
  color: COLOR,
  opacity: 0.06,
  lineHeight: 0.9,
};

const metaGrid: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  marginBottom: "24px",
  gap: "32px",
};

const senderName: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: COLOR,
  marginBottom: "4px",
};

const senderDetail: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 400,
  color: "rgba(0,0,0,0.5)",
  lineHeight: 1.5,
};

const docType: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.2em",
  color: ACCENT,
  textTransform: "uppercase",
  marginBottom: "8px",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "2px",
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: "8px",
  letterSpacing: "0.14em",
  color: "rgba(0,0,0,0.45)",
  fontWeight: 400,
  textTransform: "uppercase",
};

const metaValueStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 400,
  color: COLOR,
};

const invoiceNumber: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: COLOR,
  marginBottom: "8px",
};

const clientSection: React.CSSProperties = {
  marginBottom: "16px",
};

const clientLabel: React.CSSProperties = {
  fontSize: "8px",
  letterSpacing: "0.14em",
  color: "rgba(0,0,0,0.45)",
  fontWeight: 400,
  textTransform: "uppercase",
  marginBottom: "6px",
};

const clientName: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: COLOR,
  marginBottom: "2px",
};

const clientDetail: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 400,
  color: "rgba(0,0,0,0.5)",
  lineHeight: 1.5,
};

const notesSection: React.CSSProperties = {
  marginBottom: "12px",
};

const notesLabel: React.CSSProperties = {
  fontSize: "8px",
  letterSpacing: "0.14em",
  color: "rgba(0,0,0,0.45)",
  fontWeight: 400,
  textTransform: "uppercase",
  marginBottom: "4px",
};

const notesText: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 400,
  color: "rgba(0,0,0,0.5)",
  lineHeight: 1.5,
};

const tableSection: React.CSSProperties = {
  marginBottom: "12px",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  borderBottom: `0.5px solid ${COLOR}`,
  padding: "8px 0",
};

const tableHeaderCell: React.CSSProperties = {
  fontSize: "8px",
  letterSpacing: "0.14em",
  color: "rgba(0,0,0,0.45)",
  fontWeight: 400,
  textTransform: "uppercase",
};

const tableRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  padding: "7px 0",
  borderBottom: "0.5px solid rgba(0,0,0,0.08)",
};

const tableRowLast: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  padding: "7px 0",
  borderBottom: `0.5px solid ${COLOR}`,
};

const tableCell: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 400,
  color: COLOR,
  lineHeight: 1.4,
};

const totalsContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  marginTop: "12px",
};

const totalsRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  width: "240px",
  justifyContent: "space-between",
  padding: "4px 0",
};

const totalsLabelStyle: React.CSSProperties = {
  fontSize: "8px",
  fontWeight: 400,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(0,0,0,0.45)",
};

const totalsValueStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 400,
  color: "rgba(0,0,0,0.5)",
  textAlign: "right",
};

const totalRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  width: "240px",
  justifyContent: "space-between",
  padding: "8px 0",
  borderTop: `1.5px solid ${COLOR}`,
  marginTop: "4px",
};

const totalLabelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: COLOR,
};

const totalValueStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: COLOR,
  textAlign: "right",
};

const footer: React.CSSProperties = {
  position: "absolute",
  bottom: "48px",
  left: "48px",
  right: "48px",
};

const footerRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  borderTop: "0.5px solid rgba(0,0,0,0.08)",
  paddingTop: "12px",
};

const footerCol: React.CSSProperties = {
  marginRight: "40px",
};

const footerLabel: React.CSSProperties = {
  fontSize: "6px",
  fontWeight: 400,
  color: "rgba(0,0,0,0.45)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  marginBottom: "3px",
};

const footerValue: React.CSSProperties = {
  fontSize: "8px",
  fontWeight: 400,
  color: COLOR,
  marginBottom: "8px",
};

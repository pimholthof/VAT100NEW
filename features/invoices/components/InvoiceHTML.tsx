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

  const paymentDays = calculatePaymentDays({
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    defaultDays: 30,
  });

  return (
    <div style={page}>
      {/* ── Header ── */}
      <div style={header}>
        <div style={vat100Mark}>VAT100</div>
      </div>

      {/* ── Meta Row ── */}
      <div style={metaRow}>
        <div style={{ flex: 1 }}>
          <div style={partyName}>
            {profile.studio_name || profile.full_name}
          </div>
          {profile.kvk_number && (
            <div style={partyDetail}>KVK {profile.kvk_number}</div>
          )}
          {profile.btw_number && (
            <div style={partyDetail}>BTW {profile.btw_number}</div>
          )}
          {profile.address && (
            <div style={partyDetail}>{profile.address}</div>
          )}
          {(profile.postal_code || profile.city) && (
            <div style={partyDetail}>
              {[profile.postal_code, profile.city].filter(Boolean).join(" ")}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={metaLine}>
            <span style={label}>Factuurnr</span>
            <span style={value}>{invoice.invoice_number}</span>
          </div>
          <div style={metaLine}>
            <span style={label}>Factuurdatum</span>
            <span style={value}>{formatDate(invoice.issue_date)}</span>
          </div>
          {invoice.due_date && (
            <div style={metaLine}>
              <span style={label}>Vervaldatum</span>
              <span style={value}>{formatDate(invoice.due_date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Parties ── */}
      <div style={partiesRow}>
        <div style={partyCol}>
          <div style={label}>Aan</div>
          <div style={partyName}>{client.name}</div>
          {client.contact_name && (
            <div style={partyDetail}>{client.contact_name}</div>
          )}
          {client.address && (
            <div style={partyDetail}>{client.address}</div>
          )}
          {(client.postal_code || client.city) && (
            <div style={partyDetail}>
              {[client.postal_code, client.city].filter(Boolean).join(" ")}
            </div>
          )}
          {client.kvk_number && (
            <div style={partyDetail}>KVK {client.kvk_number}</div>
          )}
        </div>
        {invoice.notes && (
          <div style={partyCol}>
            <div style={label}>Notities</div>
            <div style={partyDetail}>{invoice.notes}</div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div>
        {/* Header */}
        <div style={tableHeader}>
          <div style={{ ...tableHeaderCell, width: "46%" }}>Omschrijving</div>
          <div style={{ ...tableHeaderCell, width: "10%" }}>Aantal</div>
          <div style={{ ...tableHeaderCell, width: "16%", textAlign: "right" }}>
            Tarief
          </div>
          <div style={{ ...tableHeaderCell, width: "16%", textAlign: "right" }}>
            Bedrag
          </div>
          <div style={{ width: "12%" }} />
        </div>

        {/* Rows */}
        {lines.map((line, i) => (
          <div style={i === lines.length - 1 ? tableRowLast : tableRow} key={line.id}>
            <div style={{ ...tableCell, width: "46%" }}>
              {line.description}
            </div>
            <div style={{ ...tableCell, width: "10%" }}>
              {line.quantity} {unitLabel(line.unit)}
            </div>
            <div
              style={{ ...tableCell, width: "16%", textAlign: "right" }}
            >
              {formatCurrency(line.rate)}
            </div>
            <div
              style={{ ...tableCell, width: "16%", textAlign: "right" }}
            >
              {formatCurrency(line.amount)}
            </div>
            <div style={{ width: "12%" }} />
          </div>
        ))}
      </div>

      {/* ── Totals ── */}
      <div style={totalsContainer}>
        <div style={totalsRow}>
          <span style={totalsLabel}>Subtotaal excl. BTW</span>
          <span style={totalsValue}>
            {formatCurrency(invoice.subtotal_ex_vat)}
          </span>
        </div>
        <div style={totalsRow}>
          <span style={totalsLabel}>BTW {invoice.vat_rate ?? 21}%</span>
          <span style={totalsValue}>
            {formatCurrency(invoice.vat_amount)}
          </span>
        </div>
        <div style={totalRow}>
          <span style={totalLabel}>Totaal incl. BTW</span>
          <span style={totalValue}>
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

// ─── Inline styles (aligned with Luminous Conceptualism design system) ───

const COLOR = "#000000";
const FONT_STACK = '"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif';

const page: React.CSSProperties = {
  width: "595px",
  minHeight: "842px",
  padding: "56px",
  fontFamily: FONT_STACK,
  fontWeight: 400,
  color: COLOR,
  backgroundColor: "#FFFFFF",
  position: "relative",
  boxSizing: "border-box",
};

const header: React.CSSProperties = {
  marginBottom: "24px",
};

const vat100Mark: React.CSSProperties = {
  fontFamily: FONT_STACK,
  fontWeight: 700,
  fontSize: "48px",
  letterSpacing: "-0.04em",
  color: COLOR,
  opacity: 0.06,
};

const metaRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  marginBottom: "48px",
  gap: "24px",
};

const metaLine: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "2px",
};

const label: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.14em",
  color: "rgba(0,0,0,0.5)",
  fontWeight: 500,
  textTransform: "uppercase",
  marginBottom: "4px",
};

const value: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 400,
  color: COLOR,
};

const partiesRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  marginBottom: "48px",
};

const partyCol: React.CSSProperties = {
  flex: 1,
};

const partyName: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: COLOR,
  marginBottom: "2px",
};

const partyDetail: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 400,
  color: "rgba(0,0,0,0.5)",
};

const tableHeader: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  borderBottom: `0.5px solid ${COLOR}`,
  padding: "8px 0",
};

const tableHeaderCell: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.14em",
  color: "rgba(0,0,0,0.5)",
  fontWeight: 500,
  textTransform: "uppercase",
};

const tableRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  padding: "8px 0",
};

const tableRowLast: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  padding: "8px 0",
  borderBottom: `0.5px solid ${COLOR}`,
};

const tableCell: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 400,
  color: "rgba(0,0,0,0.7)",
};

const totalsContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  marginTop: "8px",
};

const totalsRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  width: "220px",
  justifyContent: "space-between",
  padding: "4px 0",
};

const totalsLabel: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(0,0,0,0.5)",
};

const totalsValue: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 400,
  color: "rgba(0,0,0,0.5)",
  textAlign: "right",
};

const totalRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  width: "220px",
  justifyContent: "space-between",
  padding: "6px 0",
  borderTop: `0.5px solid ${COLOR}`,
  marginTop: "4px",
};

const totalLabel: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: COLOR,
};

const totalValue: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: COLOR,
  textAlign: "right",
};

const footer: React.CSSProperties = {
  position: "absolute",
  bottom: "56px",
  left: "56px",
  right: "56px",
};

const footerRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
};

const footerCol: React.CSSProperties = {
  marginRight: "40px",
};

const footerLabel: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 500,
  color: "rgba(0,0,0,0.5)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  marginBottom: "2px",
};

const footerValue: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 400,
  color: COLOR,
  marginBottom: "8px",
};

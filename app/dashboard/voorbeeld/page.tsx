import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export const metadata = {
  title: "Voorbeeld — VAT100",
};

// Statische voorbeelddata: puur ter illustratie, raakt geen database.
const SAMPLE_INVOICES: {
  number: string;
  client: string;
  amount: number;
  status: "paid" | "sent" | "overdue";
}[] = [
  { number: "2026-0042", client: "Studio Noord", amount: 3025, status: "paid" },
  { number: "2026-0041", client: "Atelier Veen", amount: 1815, status: "sent" },
  { number: "2026-0040", client: "Bakhuis & Co", amount: 2420, status: "paid" },
  { number: "2026-0039", client: "De Werkplaats", amount: 1210, status: "overdue" },
];

const STATUS: Record<string, { label: string; color: string }> = {
  paid: { label: "Betaald", color: "var(--color-success)" },
  sent: { label: "Verstuurd", color: "var(--color-info)" },
  overdue: { label: "Te laat", color: "var(--color-overdue)" },
};

const card: React.CSSProperties = {
  border: "var(--border-light)",
  borderRadius: "var(--radius)",
  padding: 20,
  background: "rgba(255,255,255,0.5)",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={card}>
      <p className="label" style={{ margin: 0, opacity: 0.5 }}>{label}</p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: "8px 0 0",
        }}
      >
        {value}
      </p>
      {hint && <p style={{ fontSize: 11, opacity: 0.4, margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

/**
 * Voorbeeld-showcase: laat zien hoe een gevulde VAT100 eruitziet, met
 * statische sample data. Geen database-toegang, niets staat in het account
 * van de gebruiker. Bereikbaar vanuit de lege staten.
 */
export default function VoorbeeldPage() {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 64px" }}>
      {/* Voorbeeld-melding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "10px 16px",
          borderRadius: "var(--radius)",
          background: "rgba(0,0,0,0.03)",
          border: "var(--border-light)",
          marginBottom: 32,
        }}
      >
        <span style={{ fontSize: 12.5, opacity: 0.7 }}>
          <strong>Voorbeeld.</strong> Zo ziet VAT100 eruit met data. Niets hiervan
          staat in jouw account.
        </span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
        Jouw kwartaal in één oogopslag
      </h1>
      <p style={{ fontSize: 14, opacity: 0.55, margin: "0 0 32px", lineHeight: 1.6 }}>
        Facturen, BTW en wat je vrij kunt besteden — automatisch bijgehouden.
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <Stat label="Omzet dit kwartaal" value={formatCurrency(14250)} />
        <Stat label="Opzij voor BTW" value={formatCurrency(2583)} hint="Q2 · af te dragen" />
        <Stat label="Vrij besteedbaar" value={formatCurrency(9870)} hint="na BTW en reserveringen" />
      </div>

      {/* Recente facturen */}
      <div style={{ ...card, padding: 0, marginBottom: 32 }}>
        <p className="label" style={{ margin: 0, opacity: 0.5, padding: "18px 20px 6px" }}>
          Recente facturen
        </p>
        {SAMPLE_INVOICES.map((inv) => {
          const st = STATUS[inv.status];
          return (
            <div
              key={inv.number}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 20px",
                borderTop: "0.5px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{inv.client}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.4 }}>
                  {inv.number}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: st.color,
                  }}
                >
                  {st.label}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, minWidth: 84, textAlign: "right" }}>
                  {formatCurrency(inv.amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BTW-kwartaal */}
      <div style={{ ...card, marginBottom: 40 }}>
        <p className="label" style={{ margin: "0 0 16px", opacity: 0.5 }}>BTW · Q2 2026</p>
        {[
          { l: "Rubriek 1a — omzet 21%", v: formatCurrency(14250) },
          { l: "Verschuldigde BTW", v: formatCurrency(2993) },
          { l: "Voorbelasting", v: formatCurrency(410) },
        ].map((row) => (
          <div
            key={row.l}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "0.5px solid rgba(0,0,0,0.06)",
              fontSize: 13,
            }}
          >
            <span style={{ opacity: 0.6 }}>{row.l}</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{row.v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0", fontWeight: 700 }}>
          <span>Te betalen</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(2583)}</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Link href="/dashboard/invoices/new" className="btn-primary">
          Begin met je eigen administratie
        </Link>
        <Link
          href="/dashboard"
          style={{ fontSize: 13, opacity: 0.5, color: "var(--foreground)", textDecoration: "none" }}
        >
          Naar mijn dashboard
        </Link>
      </div>
    </div>
  );
}

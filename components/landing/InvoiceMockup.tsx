"use client";

import BrowserFrame from "./BrowserFrame";

const text = {
  nl: {
    headers: ["NUMMER", "KLANT", "BEDRAG", "STATUS"],
    invoices: [
      { nr: "2024-042", client: "Ace & Partners", amount: "€ 2.400,00", status: "Betaald", color: "#1a7a3a" },
      { nr: "2024-041", client: "De Correspondent", amount: "€ 850,00", status: "Verzonden", color: "#2563eb" },
      { nr: "2024-040", client: "Foam Amsterdam", amount: "€ 1.200,00", status: "Betaald", color: "#1a7a3a" },
      { nr: "2024-039", client: "Bureau Borzo", amount: "€ 3.150,00", status: "Concept", color: "rgba(0,0,0,0.35)" },
    ],
  },
  en: {
    headers: ["NUMBER", "CLIENT", "AMOUNT", "STATUS"],
    invoices: [
      { nr: "2024-042", client: "Ace & Partners", amount: "€ 2,400.00", status: "Paid", color: "#1a7a3a" },
      { nr: "2024-041", client: "De Correspondent", amount: "€ 850.00", status: "Sent", color: "#2563eb" },
      { nr: "2024-040", client: "Foam Amsterdam", amount: "€ 1,200.00", status: "Paid", color: "#1a7a3a" },
      { nr: "2024-039", client: "Bureau Borzo", amount: "€ 3,150.00", status: "Draft", color: "rgba(0,0,0,0.35)" },
    ],
  },
};

export default function InvoiceMockup({ locale = "nl" }: { locale?: "nl" | "en" }) {
  const t = text[locale];

  return (
    <BrowserFrame>
      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr 0.8fr",
          gap: 8,
          paddingBottom: 8,
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          marginBottom: 4,
        }}
      >
        {t.headers.map((h) => (
          <p
            key={h}
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.15em",
              opacity: 0.3,
              margin: 0,
            }}
          >
            {h}
          </p>
        ))}
      </div>

      {/* Rows */}
      {t.invoices.map((inv) => (
        <div
          key={inv.nr}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr 1fr 0.8fr",
            gap: 8,
            padding: "8px 0",
            borderBottom: "0.5px solid rgba(0,0,0,0.03)",
            fontSize: 13,
          }}
        >
          <span style={{ opacity: 0.4, fontFamily: "monospace", fontSize: 12 }}>{inv.nr}</span>
          <span style={{ opacity: 0.7 }}>{inv.client}</span>
          <span style={{ fontWeight: 500 }}>{inv.amount}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: inv.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, opacity: 0.6 }}>{inv.status}</span>
          </span>
        </div>
      ))}
    </BrowserFrame>
  );
}

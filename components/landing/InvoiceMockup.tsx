"use client";

import BrowserFrame from "./BrowserFrame";

const text = {
  nl: {
    title: "FACTUREN",
    invoices: [
      { nr: "2024-042", client: "Ace & Partners", amount: "€ 2.400,00", status: "Betaald", color: "#1a7a3a", date: "15 mrt" },
      { nr: "2024-041", client: "De Correspondent", amount: "€ 850,00", status: "Verzonden", color: "#2563eb", date: "12 mrt" },
      { nr: "2024-040", client: "Foam Amsterdam", amount: "€ 1.200,00", status: "Betaald", color: "#1a7a3a", date: "8 mrt" },
      { nr: "2024-039", client: "Bureau Borzo", amount: "€ 3.150,00", status: "Concept", color: "rgba(0,0,0,0.25)", date: "5 mrt" },
    ],
  },
  en: {
    title: "INVOICES",
    invoices: [
      { nr: "2024-042", client: "Ace & Partners", amount: "€ 2,400.00", status: "Paid", color: "#1a7a3a", date: "Mar 15" },
      { nr: "2024-041", client: "De Correspondent", amount: "€ 850.00", status: "Sent", color: "#2563eb", date: "Mar 12" },
      { nr: "2024-040", client: "Foam Amsterdam", amount: "€ 1,200.00", status: "Paid", color: "#1a7a3a", date: "Mar 8" },
      { nr: "2024-039", client: "Bureau Borzo", amount: "€ 3,150.00", status: "Draft", color: "rgba(0,0,0,0.25)", date: "Mar 5" },
    ],
  },
};

export default function InvoiceMockup({ locale = "nl" }: { locale?: "nl" | "en" }) {
  const t = text[locale];

  return (
    <BrowserFrame>
      <p
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.3,
          margin: 0,
          marginBottom: 16,
        }}
      >
        {t.title}
      </p>

      {/* Rows */}
      {t.invoices.map((inv, i) => (
        <div
          key={inv.nr}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 0",
            borderBottom: i < t.invoices.length - 1 ? "0.5px solid rgba(0,0,0,0.05)" : "none",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              opacity: 0.2,
              flexShrink: 0,
              width: 64,
            }}
          >
            {inv.nr}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              flex: 1,
              color: "var(--color-black)",
            }}
          >
            {inv.client}
          </span>
          <span
            style={{
              fontSize: 10,
              opacity: 0.3,
              flexShrink: 0,
            }}
          >
            {inv.date}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              flexShrink: 0,
              width: 80,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {inv.amount}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
              width: 72,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: inv.color,
              }}
            />
            <span style={{ fontSize: 11, opacity: 0.5 }}>{inv.status}</span>
          </span>
        </div>
      ))}
    </BrowserFrame>
  );
}

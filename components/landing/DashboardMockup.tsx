"use client";

import BrowserFrame from "./BrowserFrame";

const text = {
  nl: {
    freeToSpend: "VRIJ TE BESTEDEN",
    stats: [
      { label: "BTW DEADLINE", value: "42 dagen", sub: "Q2 2024" },
      { label: "OPENSTAAND", value: "€ 1.850", sub: "2 facturen" },
      { label: "OMZET DEZE MAAND", value: "€ 6.400", sub: "+18% t.o.v. vorige maand" },
    ],
    upcoming: "OPENSTAANDE FACTUREN",
    invoices: [
      { client: "Ace & Partners", amount: "€ 2.400", status: "Verzonden", days: "3 dagen geleden", color: "#2563eb" },
      { client: "De Correspondent", amount: "€ 850", status: "Verzonden", days: "7 dagen geleden", color: "#2563eb" },
      { client: "Foam Amsterdam", amount: "€ 1.200", status: "Te laat", days: "12 dagen geleden", color: "#C44D2A" },
    ],
  },
  en: {
    freeToSpend: "FREE TO SPEND",
    stats: [
      { label: "VAT DEADLINE", value: "42 days", sub: "Q2 2024" },
      { label: "OUTSTANDING", value: "€ 1,850", sub: "2 invoices" },
      { label: "REVENUE THIS MONTH", value: "€ 6,400", sub: "+18% vs last month" },
    ],
    upcoming: "OUTSTANDING INVOICES",
    invoices: [
      { client: "Ace & Partners", amount: "€ 2,400", status: "Sent", days: "3 days ago", color: "#2563eb" },
      { client: "De Correspondent", amount: "€ 850", status: "Sent", days: "7 days ago", color: "#2563eb" },
      { client: "Foam Amsterdam", amount: "€ 1,200", status: "Overdue", days: "12 days ago", color: "#C44D2A" },
    ],
  },
};

export default function DashboardMockup({ locale = "nl" }: { locale?: "nl" | "en" }) {
  const t = text[locale];

  return (
    <BrowserFrame
      style={{
        transform: "perspective(1200px) rotateY(-4deg)",
        transformOrigin: "left center",
      }}
    >
      {/* Main metric */}
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          opacity: 0.35,
          margin: 0,
          marginBottom: 6,
        }}
      >
        {t.freeToSpend}
      </p>
      <p
        style={{
          fontSize: "clamp(2.2rem, 5vw, 3rem)",
          fontWeight: 300,
          letterSpacing: "-0.04em",
          margin: 0,
          lineHeight: 1,
          color: "var(--color-black)",
        }}
      >
        € 4.280
      </p>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 20,
        }}
      >
        {t.stats.map((s) => (
          <div
            key={s.label}
            style={{
              padding: "14px 12px",
              border: "0.5px solid rgba(0,0,0,0.06)",
              borderRadius: 8,
            }}
          >
            <p
              style={{
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.3,
                margin: 0,
                marginBottom: 8,
              }}
            >
              {s.label}
            </p>
            <div
              style={{
                width: 16,
                height: 0.5,
                background: "rgba(0,0,0,0.08)",
                marginBottom: 8,
              }}
            />
            <p
              style={{
                fontSize: 15,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                margin: 0,
                color: "var(--color-black)",
              }}
            >
              {s.value}
            </p>
            <p
              style={{
                fontSize: 9,
                opacity: 0.35,
                margin: 0,
                marginTop: 4,
              }}
            >
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Upcoming invoices */}
      <div style={{ marginTop: 20 }}>
        <p
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.3,
            margin: 0,
            marginBottom: 8,
          }}
        >
          {t.upcoming}
        </p>
        {t.invoices.map((inv, i) => (
          <div
            key={inv.client}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: i < t.invoices.length - 1 ? "0.5px solid rgba(0,0,0,0.05)" : "none",
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: inv.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 500 }}>{inv.client}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 10, opacity: 0.3 }}>{inv.days}</span>
              <span
                style={{
                  fontWeight: 500,
                  fontSize: 13,
                  color: inv.color === "#C44D2A" ? inv.color : "var(--color-black)",
                }}
              >
                {inv.amount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

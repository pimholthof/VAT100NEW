"use client";

import BrowserFrame from "./BrowserFrame";

const text = {
  nl: {
    freeToSpend: "VRIJ TE BESTEDEN",
    stats: [
      { label: "BTW DEADLINE", value: "42 dagen" },
      { label: "OPENSTAAND", value: "€ 1.850" },
      { label: "OMZET DEZE MAAND", value: "€ 6.400" },
    ],
    upcoming: "AANKOMENDE FACTUREN",
    invoices: [
      { client: "Ace & Partners", amount: "€ 2.400", days: "3 dagen" },
      { client: "De Correspondent", amount: "€ 850", days: "7 dagen" },
    ],
  },
  en: {
    freeToSpend: "FREE TO SPEND",
    stats: [
      { label: "VAT DEADLINE", value: "42 days" },
      { label: "OUTSTANDING", value: "€ 1,850" },
      { label: "REVENUE THIS MONTH", value: "€ 6,400" },
    ],
    upcoming: "UPCOMING INVOICES",
    invoices: [
      { client: "Ace & Partners", amount: "€ 2,400", days: "3 days" },
      { client: "De Correspondent", amount: "€ 850", days: "7 days" },
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
          marginBottom: 4,
        }}
      >
        {t.freeToSpend}
      </p>
      <p
        style={{
          fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
          fontWeight: 300,
          letterSpacing: "-0.03em",
          margin: 0,
          lineHeight: 1,
          color: "var(--color-black)",
        }}
      >
        € 4.280
      </p>

      {/* Divider */}
      <div
        style={{
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
          margin: "16px 0",
        }}
      />

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {t.stats.map((s) => (
          <div key={s.label}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                opacity: 0.3,
                margin: 0,
                marginBottom: 4,
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: 0,
                color: "var(--color-black)",
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Upcoming invoices preview */}
      <div
        style={{
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
          marginTop: 16,
          paddingTop: 12,
        }}
      >
        <p
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            opacity: 0.3,
            margin: 0,
            marginBottom: 8,
          }}
        >
          {t.upcoming}
        </p>
        {t.invoices.map((inv) => (
          <div
            key={inv.client}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 0",
              fontSize: 13,
              opacity: 0.6,
            }}
          >
            <span>{inv.client}</span>
            <span style={{ display: "flex", gap: 16 }}>
              <span style={{ opacity: 0.5, fontSize: 11 }}>{inv.days}</span>
              <span style={{ fontWeight: 500, opacity: 1 }}>{inv.amount}</span>
            </span>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

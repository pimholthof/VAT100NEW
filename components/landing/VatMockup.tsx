"use client";

import BrowserFrame from "./BrowserFrame";

const text = {
  nl: {
    title: "BTW-OVERZICHT 2024",
    headers: ["", "OMZET", "BTW AFDRACHT", "BTW AFTREK", "NETTO"],
    quarters: [
      { q: "Q1", revenue: "€ 12.400", vatOwed: "€ 2.604", vatDeductible: "€ 480", net: "€ 2.124", done: true },
      { q: "Q2", revenue: "€ 15.800", vatOwed: "€ 3.318", vatDeductible: "€ 620", net: "€ 2.698", done: true },
      { q: "Q3", revenue: "€ 9.200", vatOwed: "€ 1.932", vatDeductible: "€ 310", net: "€ 1.622", done: true },
      { q: "Q4", revenue: "—", vatOwed: "—", vatDeductible: "—", net: "—", done: false },
    ],
    total: "Totaal",
    totalRevenue: "€ 37.400",
    totalOwed: "€ 7.854",
    totalDeductible: "€ 1.410",
    totalNet: "€ 6.444",
  },
  en: {
    title: "VAT OVERVIEW 2024",
    headers: ["", "REVENUE", "VAT OWED", "VAT DEDUCT.", "NET"],
    quarters: [
      { q: "Q1", revenue: "€ 12,400", vatOwed: "€ 2,604", vatDeductible: "€ 480", net: "€ 2,124", done: true },
      { q: "Q2", revenue: "€ 15,800", vatOwed: "€ 3,318", vatDeductible: "€ 620", net: "€ 2,698", done: true },
      { q: "Q3", revenue: "€ 9,200", vatOwed: "€ 1,932", vatDeductible: "€ 310", net: "€ 1,622", done: true },
      { q: "Q4", revenue: "—", vatOwed: "—", vatDeductible: "—", net: "—", done: false },
    ],
    total: "Total",
    totalRevenue: "€ 37,400",
    totalOwed: "€ 7,854",
    totalDeductible: "€ 1,410",
    totalNet: "€ 6,444",
  },
};

export default function VatMockup({ locale = "nl" }: { locale?: "nl" | "en" }) {
  const t = text[locale];

  return (
    <BrowserFrame>
      {/* Title */}
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

      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.4fr 1fr 1fr 1fr 1fr",
          gap: 8,
          paddingBottom: 10,
          borderBottom: "0.5px solid rgba(0,0,0,0.08)",
        }}
      >
        {t.headers.map((h, i) => (
          <p
            key={`h-${i}`}
            style={{
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: "0.12em",
              opacity: 0.3,
              margin: 0,
              textAlign: i === 0 ? "left" : "right",
            }}
          >
            {h}
          </p>
        ))}
      </div>

      {/* Quarter rows */}
      {t.quarters.map((row) => (
        <div
          key={row.q}
          style={{
            display: "grid",
            gridTemplateColumns: "0.4fr 1fr 1fr 1fr 1fr",
            gap: 8,
            padding: "10px 0",
            borderBottom: "0.5px solid rgba(0,0,0,0.04)",
            fontSize: 13,
            opacity: row.done ? 1 : 0.25,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 12 }}>{row.q}</span>
          <span style={{ textAlign: "right", opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{row.revenue}</span>
          <span style={{ textAlign: "right", opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{row.vatOwed}</span>
          <span style={{ textAlign: "right", color: row.done ? "#1a7a3a" : "inherit", fontVariantNumeric: "tabular-nums" }}>{row.vatDeductible}</span>
          <span style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row.net}</span>
        </div>
      ))}

      {/* Total row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.4fr 1fr 1fr 1fr 1fr",
          gap: 8,
          padding: "10px 0",
          borderTop: "1px solid var(--color-black)",
          fontSize: 13,
          marginTop: 2,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12 }}>{t.total}</span>
        <span style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{t.totalRevenue}</span>
        <span style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{t.totalOwed}</span>
        <span style={{ textAlign: "right", fontWeight: 500, color: "#1a7a3a", fontVariantNumeric: "tabular-nums" }}>{t.totalDeductible}</span>
        <span style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t.totalNet}</span>
      </div>
    </BrowserFrame>
  );
}

"use client";

import BrowserFrame from "./BrowserFrame";

const quarters = [
  { q: "Q1", revenue: "€ 12.400", vatOwed: "€ 2.604", vatDeductible: "€ 480", net: "€ 2.124" },
  { q: "Q2", revenue: "€ 15.800", vatOwed: "€ 3.318", vatDeductible: "€ 620", net: "€ 2.698" },
  { q: "Q3", revenue: "€ 9.200", vatOwed: "€ 1.932", vatDeductible: "€ 310", net: "€ 1.622" },
  { q: "Q4", revenue: "—", vatOwed: "—", vatDeductible: "—", net: "—" },
];

const headers = ["", "OMZET", "BTW AF TE DRAGEN", "BTW AFTREKBAAR", "NETTO BTW"];

export default function VatMockup() {
  return (
    <BrowserFrame>
      {/* Title */}
      <p
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          opacity: 0.3,
          margin: 0,
          marginBottom: 12,
        }}
      >
        BTW-OVERZICHT 2024
      </p>

      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.4fr 1fr 1fr 1fr 1fr",
          gap: 8,
          paddingBottom: 8,
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          marginBottom: 4,
        }}
      >
        {headers.map((h) => (
          <p
            key={h}
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.15em",
              opacity: 0.3,
              margin: 0,
              textAlign: h === "" ? "left" : "right",
            }}
          >
            {h}
          </p>
        ))}
      </div>

      {/* Quarter rows */}
      {quarters.map((row) => (
        <div
          key={row.q}
          style={{
            display: "grid",
            gridTemplateColumns: "0.4fr 1fr 1fr 1fr 1fr",
            gap: 8,
            padding: "8px 0",
            borderBottom: "0.5px solid rgba(0,0,0,0.03)",
            fontSize: 13,
            opacity: row.q === "Q4" ? 0.3 : 1,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 12 }}>{row.q}</span>
          <span style={{ textAlign: "right", opacity: 0.7 }}>{row.revenue}</span>
          <span style={{ textAlign: "right", opacity: 0.7 }}>{row.vatOwed}</span>
          <span style={{ textAlign: "right", color: "#1a7a3a", opacity: 0.8 }}>{row.vatDeductible}</span>
          <span style={{ textAlign: "right", fontWeight: 500 }}>{row.net}</span>
        </div>
      ))}
    </BrowserFrame>
  );
}

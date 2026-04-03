"use client";

import BrowserFrame from "./BrowserFrame";

const text = {
  nl: {
    to: "Aan:",
    nr: "Factuurnummer",
    date: "Datum",
    dueDate: "Vervaldatum",
    rate: "Tarief",
    amount: "Bedrag",
    lines: [
      { desc: "Merkidentiteit", qty: "1 stuk", rate: "€ 2.400,00", amount: "€ 2.400,00" },
      { desc: "Webdesign", qty: "12 uren", rate: "€ 95,00", amount: "€ 1.140,00" },
    ],
    subtotal: "Subtotaal ex BTW",
    vat: "BTW 21%",
    total: "Totaal",
    subtotalVal: "€ 3.540,00",
    vatVal: "€ 743,40",
    totalVal: "€ 4.283,40",
    footer: "IBAN NL00 ABNA •••• •••• 42  ·  Betaaltermijn: 30 netto",
  },
  en: {
    to: "To:",
    nr: "Invoice number",
    date: "Date",
    dueDate: "Due date",
    rate: "Rate",
    amount: "Amount",
    lines: [
      { desc: "Brand identity", qty: "1 piece", rate: "€ 2,400.00", amount: "€ 2,400.00" },
      { desc: "Web design", qty: "12 hours", rate: "€ 95.00", amount: "€ 1,140.00" },
    ],
    subtotal: "Subtotal ex VAT",
    vat: "VAT 21%",
    total: "Total",
    subtotalVal: "€ 3,540.00",
    vatVal: "€ 743.40",
    totalVal: "€ 4,283.40",
    footer: "IBAN NL00 ABNA •••• •••• 42  ·  Payment terms: 30 net",
  },
};

export default function PosterMockup({ locale = "nl" }: { locale?: "nl" | "en" }) {
  const t = text[locale];

  return (
    <BrowserFrame>
      {/* A4-proportioned inner document */}
      <div
        style={{
          aspectRatio: "595 / 842",
          padding: "16px 20px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* VAT100 — signature poster logo */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 0.82,
            marginBottom: 14,
            color: "var(--color-black)",
          }}
        >
          VAT100
        </div>

        {/* Sender left + Meta right */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, marginBottom: 2 }}>Studio Formaat</div>
            <div style={{ fontSize: 7, opacity: 0.5, lineHeight: 1.6 }}>KVK 12345678</div>
            <div style={{ fontSize: 7, opacity: 0.5, lineHeight: 1.6 }}>BTW NL001234567B01</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 7, opacity: 0.5, lineHeight: 1.6 }}>
              {t.nr} <span style={{ fontWeight: 600, opacity: 1 }}>2024-042</span>
            </div>
            <div style={{ fontSize: 7, opacity: 0.5, lineHeight: 1.6 }}>
              {t.date} <span style={{ fontWeight: 600, opacity: 1 }}>15-03-2024</span>
            </div>
            <div style={{ fontSize: 7, opacity: 0.5, lineHeight: 1.6 }}>
              {t.dueDate} <span style={{ fontWeight: 600, opacity: 1 }}>14-04-2024</span>
            </div>
          </div>
        </div>

        {/* Recipient */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 7, opacity: 0.4, marginBottom: 2 }}>{t.to}</div>
          <div style={{ fontSize: 8, fontWeight: 700 }}>Ace & Partners</div>
          <div style={{ fontSize: 7, opacity: 0.5, lineHeight: 1.6 }}>Herengracht 182</div>
          <div style={{ fontSize: 7, opacity: 0.5, lineHeight: 1.6 }}>1016 BR Amsterdam</div>
        </div>

        {/* Line items table */}
        <div>
          {/* Header */}
          <div
            style={{
              display: "flex",
              borderBottom: "0.5px solid rgba(0,0,0,0.15)",
              paddingBottom: 4,
              marginBottom: 2,
            }}
          >
            <span style={{ flex: "1 1 44%", fontSize: 6, opacity: 0.35 }}></span>
            <span style={{ flex: "0 0 18%", fontSize: 6, opacity: 0.35 }}></span>
            <span style={{ flex: "0 0 19%", fontSize: 6, opacity: 0.35, textAlign: "right" }}>{t.rate}</span>
            <span style={{ flex: "0 0 19%", fontSize: 6, opacity: 0.35, textAlign: "right" }}>{t.amount}</span>
          </div>

          {/* Rows */}
          {t.lines.map((l) => (
            <div
              key={l.desc}
              style={{
                display: "flex",
                padding: "4px 0",
                alignItems: "baseline",
              }}
            >
              <span style={{ flex: "1 1 44%", fontSize: 7 }}>{l.desc}</span>
              <span style={{ flex: "0 0 18%", fontSize: 7, opacity: 0.5 }}>{l.qty}</span>
              <span style={{ flex: "0 0 19%", fontSize: 7, textAlign: "right", opacity: 0.7 }}>{l.rate}</span>
              <span style={{ flex: "0 0 19%", fontSize: 7, textAlign: "right" }}>{l.amount}</span>
            </div>
          ))}

          {/* Subtotal */}
          <div
            style={{
              display: "flex",
              padding: "4px 0",
              borderTop: "0.5px solid rgba(0,0,0,0.15)",
              marginTop: 4,
            }}
          >
            <span style={{ flex: "1 1 44%", fontSize: 7 }}>{t.subtotal}</span>
            <span style={{ flex: "0 0 18%" }}></span>
            <span style={{ flex: "0 0 19%" }}></span>
            <span style={{ flex: "0 0 19%", fontSize: 7, textAlign: "right" }}>{t.subtotalVal}</span>
          </div>

          {/* VAT */}
          <div style={{ display: "flex", padding: "4px 0" }}>
            <span style={{ flex: "1 1 44%", fontSize: 7 }}>{t.vat}</span>
            <span style={{ flex: "0 0 18%" }}></span>
            <span style={{ flex: "0 0 19%" }}></span>
            <span style={{ flex: "0 0 19%", fontSize: 7, textAlign: "right" }}>{t.vatVal}</span>
          </div>

          {/* Total */}
          <div
            style={{
              display: "flex",
              padding: "4px 0",
              borderTop: "1px solid var(--color-black)",
            }}
          >
            <span style={{ flex: "1 1 44%", fontSize: 7, fontWeight: 700 }}>{t.total}</span>
            <span style={{ flex: "0 0 18%" }}></span>
            <span style={{ flex: "0 0 19%" }}></span>
            <span style={{ flex: "0 0 19%", fontSize: 7, fontWeight: 700, textAlign: "right" }}>{t.totalVal}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 20,
            right: 20,
            fontSize: 5.5,
            opacity: 0.25,
            lineHeight: 1.6,
          }}
        >
          {t.footer}
        </div>
      </div>
    </BrowserFrame>
  );
}

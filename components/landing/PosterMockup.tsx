"use client";

import BrowserFrame from "./BrowserFrame";

const text = {
  nl: {
    to: "Aan",
    nr: "Factuurnummer",
    date: "Datum",
    dueDate: "Vervaldatum",
    rate: "Tarief",
    amount: "Bedrag",
    lines: [
      { desc: "Merkidentiteit", qty: "1 stuk", rate: "€ 2.400,00", amount: "€ 2.400,00" },
      { desc: "Webdesign", qty: "12 uren", rate: "€ 95,00", amount: "€ 1.140,00" },
    ],
    subtotal: "Subtotaal",
    vat: "BTW 21%",
    total: "Totaal",
    subtotalVal: "€ 3.540,00",
    vatVal: "€ 743,40",
    totalVal: "€ 4.283,40",
    footer: "NL00 ABNA •••• •••• 42  ·  Betaaltermijn 30 dagen netto",
  },
  en: {
    to: "To",
    nr: "Invoice number",
    date: "Date",
    dueDate: "Due date",
    rate: "Rate",
    amount: "Amount",
    lines: [
      { desc: "Brand identity", qty: "1 piece", rate: "€ 2,400.00", amount: "€ 2,400.00" },
      { desc: "Web design", qty: "12 hours", rate: "€ 95.00", amount: "€ 1,140.00" },
    ],
    subtotal: "Subtotal",
    vat: "VAT 21%",
    total: "Total",
    subtotalVal: "€ 3,540.00",
    vatVal: "€ 743.40",
    totalVal: "€ 4,283.40",
    footer: "NL00 ABNA •••• •••• 42  ·  Payment terms 30 days net",
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
          padding: "20px 24px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 0.85,
            marginBottom: 18,
            color: "var(--color-black)",
          }}
        >
          VAT100
        </div>

        {/* Sender + Meta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, marginBottom: 3 }}>Studio Formaat</div>
            <div style={{ fontSize: 7, opacity: 0.4, lineHeight: 1.7 }}>KVK 12345678</div>
            <div style={{ fontSize: 7, opacity: 0.4, lineHeight: 1.7 }}>BTW NL001234567B01</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 7, opacity: 0.4, lineHeight: 1.7 }}>
              {t.nr} <span style={{ fontWeight: 600, opacity: 1, color: "var(--color-black)" }}>2024-042</span>
            </div>
            <div style={{ fontSize: 7, opacity: 0.4, lineHeight: 1.7 }}>
              {t.date} <span style={{ fontWeight: 600, opacity: 1, color: "var(--color-black)" }}>15-03-2024</span>
            </div>
            <div style={{ fontSize: 7, opacity: 0.4, lineHeight: 1.7 }}>
              {t.dueDate} <span style={{ fontWeight: 600, opacity: 1, color: "var(--color-black)" }}>14-04-2024</span>
            </div>
          </div>
        </div>

        {/* Recipient */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 7, opacity: 0.35, marginBottom: 3, letterSpacing: "0.05em" }}>{t.to}</div>
          <div style={{ fontSize: 8, fontWeight: 700 }}>Ace & Partners</div>
          <div style={{ fontSize: 7, opacity: 0.4, lineHeight: 1.7 }}>Herengracht 182</div>
          <div style={{ fontSize: 7, opacity: 0.4, lineHeight: 1.7 }}>1016 BR Amsterdam</div>
        </div>

        {/* Line items */}
        <div>
          {/* Header */}
          <div
            style={{
              display: "flex",
              borderBottom: "0.5px solid rgba(0,0,0,0.12)",
              paddingBottom: 5,
              marginBottom: 3,
            }}
          >
            <span style={{ flex: "1 1 44%", fontSize: 6, opacity: 0.3, letterSpacing: "0.08em" }}></span>
            <span style={{ flex: "0 0 18%", fontSize: 6, opacity: 0.3 }}></span>
            <span style={{ flex: "0 0 19%", fontSize: 6, opacity: 0.3, textAlign: "right", letterSpacing: "0.08em" }}>{t.rate}</span>
            <span style={{ flex: "0 0 19%", fontSize: 6, opacity: 0.3, textAlign: "right", letterSpacing: "0.08em" }}>{t.amount}</span>
          </div>

          {/* Rows */}
          {t.lines.map((l) => (
            <div
              key={l.desc}
              style={{
                display: "flex",
                padding: "5px 0",
                alignItems: "baseline",
              }}
            >
              <span style={{ flex: "1 1 44%", fontSize: 7, fontWeight: 500 }}>{l.desc}</span>
              <span style={{ flex: "0 0 18%", fontSize: 7, opacity: 0.4 }}>{l.qty}</span>
              <span style={{ flex: "0 0 19%", fontSize: 7, textAlign: "right", opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{l.rate}</span>
              <span style={{ flex: "0 0 19%", fontSize: 7, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{l.amount}</span>
            </div>
          ))}

          {/* Subtotal */}
          <div
            style={{
              display: "flex",
              padding: "5px 0",
              borderTop: "0.5px solid rgba(0,0,0,0.12)",
              marginTop: 6,
            }}
          >
            <span style={{ flex: "1 1 81%", fontSize: 7, opacity: 0.5 }}>{t.subtotal}</span>
            <span style={{ flex: "0 0 19%", fontSize: 7, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{t.subtotalVal}</span>
          </div>

          {/* VAT */}
          <div style={{ display: "flex", padding: "5px 0" }}>
            <span style={{ flex: "1 1 81%", fontSize: 7, opacity: 0.5 }}>{t.vat}</span>
            <span style={{ flex: "0 0 19%", fontSize: 7, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{t.vatVal}</span>
          </div>

          {/* Total */}
          <div
            style={{
              display: "flex",
              padding: "6px 0",
              borderTop: "1px solid var(--color-black)",
              marginTop: 2,
            }}
          >
            <span style={{ flex: "1 1 81%", fontSize: 7, fontWeight: 700 }}>{t.total}</span>
            <span style={{ flex: "0 0 19%", fontSize: 7, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{t.totalVal}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 24,
            right: 24,
            fontSize: 5.5,
            opacity: 0.2,
            lineHeight: 1.6,
            letterSpacing: "0.02em",
          }}
        >
          {t.footer}
        </div>
      </div>
    </BrowserFrame>
  );
}

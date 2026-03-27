import type { Metadata } from "next";
import { WaitlistForm } from "./waitlist-form";

export const metadata: Metadata = {
  title: "VAT100 — Boekhouding zonder gedoe",
  description:
    "De mooiste facturatie-app voor creatieve freelancers in Nederland. Schrijf je in voor de wachtlijst.",
};

const features = [
  "Facturen versturen in seconden",
  "BTW-aangifte automatisch voorbereid",
  "Ontworpen voor creatieve freelancers",
];

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "1fr",
        alignItems: "center",
        justifyItems: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background watermark */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -60,
          right: -40,
          fontSize: "min(20rem, 35vw)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          lineHeight: 0.85,
          color: "var(--color-black)",
          opacity: 0.02,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        VAT100
      </div>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Hero */}
        <h1
          style={{
            fontSize: "clamp(4rem, 12vw, 8rem)",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 0.85,
            margin: 0,
            color: "var(--color-black)",
          }}
        >
          VAT
          <br />
          100
        </h1>

        {/* Tagline */}
        <p
          className="label"
          style={{
            marginTop: 20,
            marginBottom: 48,
            opacity: 0.3,
          }}
        >
          Boekhouding zonder gedoe
        </p>

        {/* Value propositions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginBottom: 48,
          }}
        >
          {features.map((feature, i) => (
            <div
              key={i}
              style={{
                padding: "14px 0",
                borderTop: "0.5px solid rgba(0,0,0,0.06)",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.02em",
                color: "var(--color-black)",
                opacity: 0.5,
              }}
            >
              {feature}
            </div>
          ))}
          <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
        </div>

        {/* Waitlist signup */}
        <div
          className="glass"
          style={{
            padding: "32px",
          }}
        >
          <p
            className="label"
            style={{
              margin: 0,
              marginBottom: 8,
              opacity: 0.35,
            }}
          >
            Schrijf je in voor de wachtlijst
          </p>

          <WaitlistForm />
        </div>

        {/* Footer */}
        <p
          className="label"
          style={{
            marginTop: 32,
            opacity: 0.2,
          }}
        >
          Binnenkort beschikbaar. Geen spam, beloofd.
        </p>
      </div>
    </div>
  );
}

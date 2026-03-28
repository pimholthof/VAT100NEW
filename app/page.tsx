"use client";

import { useState } from "react";
import Link from "next/link";
import { joinWaitlist } from "@/features/waitlist/actions";

/* ─── Inline style helpers ─── */
const inputStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 400,
  padding: "14px 0",
  border: "none",
  borderBottom: "0.5px solid rgba(0,0,0,0.1)",
  background: "transparent",
  color: "var(--color-black)",
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s ease",
};

/* ─── Data ─── */
const features = [
  {
    title: "Facturen",
    description:
      "Maak professionele facturen in seconden. Automatische BTW-berekening, factuurnummering en directe verzending per e-mail.",
  },
  {
    title: "BTW-aangifte",
    description:
      "Realtime BTW-overzicht per kwartaal. Je weet altijd precies wat je moet reserveren en wanneer de deadline is.",
  },
  {
    title: "Bonnen scannen",
    description:
      "Fotografeer je bonnen — AI herkent automatisch het bedrag, de datum en de leverancier. Geen handmatig invoeren meer.",
  },
  {
    title: "Klantenbeheer",
    description:
      "Alle klantgegevens op één plek. KVK-nummer, BTW-id, contactpersoon en factuurhistorie per klant.",
  },
  {
    title: "Cashflow",
    description:
      "Maandelijks overzicht van inkomsten en uitgaven. Zie trends, vergelijk periodes en weet wat je veilig kunt uitgeven.",
  },
  {
    title: "Offertes",
    description:
      "Stuur offertes die met één klik omgezet worden naar facturen. Geen dubbel werk, geen fouten.",
  },
];

const pricingPlans = [
  {
    id: "basis",
    name: "Basis",
    price: "29",
    period: "per maand",
    description: "Voor actieve freelancers",
    features: [
      "Onbeperkt facturen & creditnota's",
      "BTW-overzicht",
      "Bonnen scannen (handmatig)",
      "Offertes",
      "Klantenbeheer",
      "Betaallinks (Mollie)",
      "E-mail herinneringen",
      "CSV export",
    ],
    cta: "Aan de slag",
    highlighted: false,
  },
  {
    id: "compleet",
    name: "Compleet",
    price: "59",
    period: "per maand",
    description: "Voor groeiende studio's",
    features: [
      "Alles van Basis",
      "AI bonnen scannen",
      "AI boekhouder chat",
      "Bankrekening koppeling",
      "Automatische reconciliatie",
      "Jaarrekening PDF export",
      "Cashflow-analyse",
      "Prioriteit support",
    ],
    cta: "Meest compleet",
    highlighted: true,
  },
];

export default function LandingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await joinWaitlist(formData);

    if (result.error) {
      setError(result.error);
      setPending(false);
    } else {
      setPosition(result.data?.position ?? null);
      setSubmitted(true);
      setPending(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        position: "relative",
        overflow: "hidden",
        background: "var(--background)",
      }}
    >
      {/* Background watermark */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: -80,
          right: -60,
          fontSize: "min(28rem, 45vw)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          lineHeight: 0.85,
          color: "var(--color-black)",
          opacity: 0.015,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        VAT100
      </div>

      {/* ─── Header ─── */}
      <header
        style={{
          padding: "32px clamp(24px, 4vw, 64px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "var(--glass-border)",
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.02)",
        }}
      >
        <span
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            color: "var(--color-black)",
          }}
        >
          VAT100
        </span>
        <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a
            href="#functies"
            className="label"
            style={{
              textDecoration: "none",
              color: "var(--color-black)",
              opacity: 0.5,
            }}
          >
            Functies
          </a>
          <a
            href="#prijzen"
            className="label"
            style={{
              textDecoration: "none",
              color: "var(--color-black)",
              opacity: 0.5,
            }}
          >
            Prijzen
          </a>
          <Link
            href="/login"
            className="label-strong"
            style={{
              textDecoration: "none",
              color: "var(--color-black)",
              padding: "10px 20px",
              border: "0.5px solid rgba(0,0,0,0.15)",
              borderRadius: "var(--radius-sm)",
              transition: "border-color 0.15s ease",
            }}
          >
            Inloggen
          </Link>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section
        style={{
          padding: "clamp(80px, 12vw, 160px) clamp(24px, 4vw, 64px) clamp(60px, 8vw, 120px)",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(3.5rem, 10vw, 8rem)",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 0.88,
            margin: 0,
            color: "var(--color-black)",
          }}
        >
          VAT100
        </h1>
        <p
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
            fontWeight: 300,
            lineHeight: 1.5,
            marginTop: 32,
            maxWidth: 520,
            color: "var(--color-black)",
            opacity: 0.6,
          }}
        >
          De fiscale engine voor Nederlandse creatieve freelancers. Factureren,
          BTW-aangifte en boekhouding — ontdaan van alle ruis.
        </p>
        <div style={{ marginTop: 48, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a
            href="#wachtlijst"
            className="btn-primary"
            style={{
              padding: "18px 36px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Vroege toegang
          </a>
          <a
            href="#functies"
            className="btn-secondary"
            style={{
              padding: "18px 36px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Ontdek meer
          </a>
        </div>
      </section>

      {/* ─── Concept ─── */}
      <section
        style={{
          padding: "clamp(60px, 8vw, 120px) clamp(24px, 4vw, 64px)",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
            gap: "clamp(32px, 4vw, 64px)",
            alignItems: "start",
          }}
        >
          <div>
            <p className="label" style={{ marginBottom: 16 }}>
              Het idee
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Minder software,
              <br />
              meer helderheid.
            </h2>
          </div>
          <div>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.8,
                margin: 0,
                opacity: 0.6,
              }}
            >
              Als creatieve freelancer wil je maken, niet administreren. VAT100 reduceert
              je boekhouding tot de essentie: bedrag + ontvanger. Geen overbodige menu&apos;s,
              geen complexe workflows. Het systeem anticipeert op je fiscale deadlines en
              stelt acties voor met één klik. Zo heb je altijd grip op je BTW, je cashflow
              en je facturen — zonder dat het je creatieve flow onderbreekt.
            </p>
            <div
              style={{
                marginTop: 32,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              {[
                { value: "< 30s", label: "Per factuur" },
                { value: "100%", label: "BTW-inzicht" },
                { value: "0", label: "Handmatig werk" },
                { value: "24/7", label: "Overzicht" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p
                    style={{
                      fontSize: "clamp(1.5rem, 3vw, 2rem)",
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      margin: 0,
                    }}
                  >
                    {stat.value}
                  </p>
                  <p className="label" style={{ marginTop: 4 }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 clamp(24px, 4vw, 64px)",
        }}
      >
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
      </div>

      {/* ─── Features ─── */}
      <section
        id="functies"
        style={{
          padding: "clamp(60px, 8vw, 120px) clamp(24px, 4vw, 64px)",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <p className="label" style={{ marginBottom: 16 }}>
          Functies
        </p>
        <h2
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: 0,
            marginBottom: "clamp(40px, 6vw, 80px)",
          }}
        >
          Alles wat je nodig hebt.
          <br />
          Niets wat je niet nodig hebt.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 1,
          }}
        >
          {features.map((feature, i) => (
            <div
              key={i}
              className="feature-card"
              style={{
                padding: "32px 28px",
                border: "0.5px solid rgba(0,0,0,0.06)",
                borderRadius: "var(--radius)",
              }}
            >
              <p
                className="label-strong"
                style={{ marginBottom: 12, fontSize: 11 }}
              >
                {feature.title}
              </p>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  margin: 0,
                  opacity: 0.5,
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 clamp(24px, 4vw, 64px)",
        }}
      >
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
      </div>

      {/* ─── Pricing ─── */}
      <section
        id="prijzen"
        style={{
          padding: "clamp(60px, 8vw, 120px) clamp(24px, 4vw, 64px)",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <p className="label" style={{ marginBottom: 16 }}>
          Prijzen
        </p>
        <h2
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: 0,
            marginBottom: "clamp(40px, 6vw, 80px)",
          }}
        >
          Eerlijk en transparant.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 1,
          }}
        >
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              style={{
                padding: "36px 28px",
                border: plan.highlighted
                  ? "1px solid var(--color-black)"
                  : "0.5px solid rgba(0,0,0,0.08)",
                borderRadius: "var(--radius)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {plan.highlighted && (
                <div
                  className="label-strong"
                  style={{
                    position: "absolute",
                    top: -1,
                    left: 28,
                    right: 28,
                    textAlign: "center",
                    background: "var(--color-black)",
                    color: "var(--background)",
                    padding: "6px 12px",
                    borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                    fontSize: 9,
                  }}
                >
                  {plan.cta}
                </div>
              )}

              <p
                className="label-strong"
                style={{ marginBottom: 4, fontSize: 11 }}
              >
                {plan.name}
              </p>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                  }}
                >
                  &euro;{plan.price}
                </span>
                <span className="label">{plan.period}</span>
              </div>

              <p
                style={{
                  fontSize: 13,
                  opacity: 0.5,
                  margin: 0,
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}
              >
                {plan.description}
              </p>

              <div
                style={{
                  borderTop: "0.5px solid rgba(0,0,0,0.06)",
                  paddingTop: 20,
                  flex: 1,
                }}
              >
                {plan.features.map((f) => (
                  <p
                    key={f}
                    style={{
                      fontSize: 13,
                      margin: 0,
                      padding: "6px 0",
                      opacity: 0.6,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ opacity: 0.3, fontSize: 10 }}>&#x2713;</span>
                    {f}
                  </p>
                ))}
              </div>

              <a
                href={`/register?plan=${plan.id}`}
                className={plan.highlighted ? "btn-primary" : "btn-secondary"}
                style={{
                  marginTop: 28,
                  padding: "14px 24px",
                  textDecoration: "none",
                  textAlign: "center",
                  display: "block",
                }}
              >
                {plan.highlighted ? "Aan de slag" : "Kies " + plan.name}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 clamp(24px, 4vw, 64px)",
        }}
      >
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
      </div>

      {/* ─── Waitlist ─── */}
      <section
        id="wachtlijst"
        style={{
          padding: "clamp(60px, 8vw, 120px) clamp(24px, 4vw, 64px)",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          {submitted ? (
            <div
              style={{
                padding: "32px",
                border: "0.5px solid rgba(0,0,0,0.08)",
                borderRadius: "var(--radius)",
              }}
            >
              <p
                className="label-strong"
                style={{ marginBottom: 8, fontSize: 13 }}
              >
                Je staat op de wachtlijst
              </p>
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.5,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {position ? `Je bent nummer ${position}. ` : ""}
                We sturen je een e-mail zodra je toegang krijgt.
              </p>
            </div>
          ) : (
            <div>
              <p className="label" style={{ marginBottom: 16 }}>
                Vroege toegang
              </p>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  margin: 0,
                  marginBottom: 32,
                }}
              >
                Schrijf je in.
              </h2>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label
                      htmlFor="name"
                      className="label"
                      style={{ opacity: 0.35, display: "block", marginBottom: 4 }}
                    >
                      Naam
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Je volledige naam"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label
                      htmlFor="email"
                      className="label"
                      style={{ opacity: 0.35, display: "block", marginBottom: 4 }}
                    >
                      E-mail
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="je@studio.nl"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    style={{
                      padding: "12px 16px",
                      background: "rgba(165, 28, 48, 0.04)",
                      borderLeft: "2px solid var(--color-accent)",
                      fontSize: "12px",
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary"
                  style={{
                    padding: "18px 32px",
                    alignSelf: "flex-start",
                  }}
                >
                  {pending ? "Even wachten..." : "Op de wachtlijst"}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          padding: "32px clamp(24px, 4vw, 64px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span className="label" style={{ opacity: 0.2 }}>
          &copy; {new Date().getFullYear()} VAT100
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link
            href="/login"
            className="label"
            style={{
              opacity: 0.2,
              textDecoration: "none",
              color: "var(--color-black)",
            }}
          >
            Inloggen
          </Link>
          <Link
            href="/register"
            className="label"
            style={{
              opacity: 0.2,
              textDecoration: "none",
              color: "var(--color-black)",
            }}
          >
            Registreren
          </Link>
        </div>
      </footer>
    </div>
  );
}

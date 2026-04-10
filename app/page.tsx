import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, getLocaleFromCookie } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";
import DashboardMockup from "@/components/landing/DashboardMockup";
import InvoiceMockup from "@/components/landing/InvoiceMockup";
import VatMockup from "@/components/landing/VatMockup";
import PosterMockup from "@/components/landing/PosterMockup";
import LocaleSwitcher from "@/components/landing/LocaleSwitcher";
import FaqAccordion from "@/components/landing/FaqAccordion";
import WaitlistForm from "@/components/landing/WaitlistForm";

const sectionPadding: React.CSSProperties = {
  padding: "clamp(60px, 8vw, 120px) clamp(24px, 4vw, 64px)",
  maxWidth: 960,
  margin: "0 auto",
};

function Divider() {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "0 clamp(24px, 4vw, 64px)",
      }}
    >
      <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
    </div>
  );
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale: Locale = localeCookie === "en" ? "en" : "nl";
  const t = getDictionary(locale);

  const features = [
    { title: t.landing.featureInvoices, description: t.landing.featureInvoicesDesc },
    { title: t.landing.featureVat, description: t.landing.featureVatDesc },
    { title: t.landing.featureReceipts, description: t.landing.featureReceiptsDesc },
    { title: t.landing.featureClients, description: t.landing.featureClientsDesc },
    { title: t.landing.featureCashflow, description: t.landing.featureCashflowDesc },
    { title: t.landing.featureQuotes, description: t.landing.featureQuotesDesc },
    { title: t.landing.featureIncomeTax, description: t.landing.featureIncomeTaxDesc },
  ];

  const pricingPlans = [
    {
      id: "basis",
      name: t.landing.basis,
      price: "29",
      period: t.landing.perMonth,
      description: t.landing.basisDesc,
      features: [
        t.landing.unlimitedInvoices,
        t.landing.vatOverview,
        t.landing.quotes,
        t.landing.clientManagement,
        t.landing.csvExport,
      ],
      cta: t.landing.basisCta,
      highlighted: false,
    },
    {
      id: "studio",
      name: t.landing.studio,
      price: "39",
      period: t.landing.perMonth,
      description: t.landing.studioDesc,
      features: [
        t.landing.allFromBasis,
        t.landing.manualReceipts,
        t.landing.bankConnection,
        t.landing.aiClassificationApproval,
        t.landing.paymentLinks,
        t.landing.emailReminders,
        t.landing.cashflowAnalysis,
        t.landing.incomeTaxInsight,
      ],
      cta: t.landing.studioCta,
      highlighted: true,
    },
    {
      id: "compleet",
      name: t.landing.compleet,
      price: "59",
      period: t.landing.perMonth,
      description: t.landing.compleetDesc,
      features: [
        t.landing.allFromStudio,
        t.landing.aiReceipts,
        t.landing.aiChat,
        t.landing.aiAutoBooking,
        t.landing.autoReconciliation,
        t.landing.annualReport,
        t.landing.prioritySupport,
      ],
      cta: t.landing.compleetCta,
      highlighted: false,
    },
  ];

  const personas = [
    { name: t.landing.persona1Name, type: t.landing.persona1Type, quote: t.landing.persona1Quote },
    { name: t.landing.persona2Name, type: t.landing.persona2Type, quote: t.landing.persona2Quote },
    { name: t.landing.persona3Name, type: t.landing.persona3Type, quote: t.landing.persona3Quote },
  ];

  const faqs = [
    { q: t.landing.faq1Q, a: t.landing.faq1A },
    { q: t.landing.faq2Q, a: t.landing.faq2A },
    { q: t.landing.faq3Q, a: t.landing.faq3A },
    { q: t.landing.faq4Q, a: t.landing.faq4A },
    { q: t.landing.faq5Q, a: t.landing.faq5A },
  ];

  const primaryPlanId = pricingPlans.find((plan) => plan.highlighted)?.id ?? pricingPlans[0]?.id ?? "basis";

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
          background: "rgba(250, 249, 246, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
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
            {t.landing.features}
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
            {t.landing.pricing}
          </a>
          <LocaleSwitcher />
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
            {t.landing.login}
          </Link>
          <Link
            href={`/register?plan=${primaryPlanId}`}
            className="btn-primary label-strong"
            style={{
              textDecoration: "none",
              padding: "10px 20px",
              fontSize: 11,
            }}
          >
            {t.landing.headerCta}
          </Link>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section
        style={{
          padding: "clamp(60px, 10vw, 140px) clamp(24px, 4vw, 64px) clamp(40px, 6vw, 80px)",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: "clamp(32px, 5vw, 64px)",
            alignItems: "center",
          }}
        >
          {/* Copy */}
          <div>
            <p
              className="label-strong"
              style={{ marginBottom: 16, fontSize: 11 }}
            >
              {t.landing.heroLabel}
            </p>
            <h1
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                margin: 0,
                color: "var(--color-black)",
                whiteSpace: "pre-line",
              }}
            >
              {t.landing.heroHeadline}
            </h1>
            <p
              style={{
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                fontWeight: 300,
                lineHeight: 1.6,
                marginTop: 24,
                maxWidth: 440,
                color: "var(--color-black)",
                opacity: 0.55,
              }}
            >
              {t.landing.heroSubtitleNew}
            </p>
            <div style={{ marginTop: 40, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link
                href={`/register?plan=${primaryPlanId}`}
                className="btn-primary"
                style={{
                  padding: "18px 36px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                {t.landing.heroCta}
              </Link>
              <a
                href="#product"
                className="btn-secondary"
                style={{
                  padding: "18px 36px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                {t.landing.heroCtaSecondary}
              </a>
            </div>
            <p
              style={{
                marginTop: 20,
                fontSize: 12,
                opacity: 0.4,
                letterSpacing: "0.02em",
              }}
            >
              {t.landing.heroSocialProof}
            </p>
          </div>

          {/* Product mockup */}
          <div>
            <DashboardMockup locale={locale} />
          </div>
        </div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <section
        style={{
          padding: "clamp(40px, 6vw, 80px) clamp(24px, 4vw, 64px)",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "clamp(24px, 4vw, 48px)",
            textAlign: "center",
          }}
        >
          {[
            { value: t.landing.proofSpeed, label: t.landing.proofSpeedLabel },
            { value: t.landing.proofVat, label: t.landing.proofVatLabel },
            { value: t.landing.proofSteps, label: t.landing.proofStepsLabel },
            { value: t.landing.proofEncrypted, label: t.landing.proofEncryptedLabel },
          ].map((stat) => (
            <div key={stat.label}>
              <p
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  margin: 0,
                  color: "var(--color-black)",
                }}
              >
                {stat.value}
              </p>
              <p className="label" style={{ marginTop: 6, opacity: 0.4 }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ─── Pain Points ─── */}
      <section style={sectionPadding}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
            gap: "clamp(32px, 4vw, 64px)",
            alignItems: "start",
          }}
        >
          <div>
            <p className="label-strong" style={{ marginBottom: 16, fontSize: 11 }}>
              {t.landing.painLabel}
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: 0,
                whiteSpace: "pre-line",
              }}
            >
              {t.landing.painHeadline}
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gap: 1,
            }}
          >
            {[
              { title: t.landing.pain1Title, desc: t.landing.pain1Desc },
              { title: t.landing.pain2Title, desc: t.landing.pain2Desc },
              { title: t.landing.pain3Title, desc: t.landing.pain3Desc },
            ].map((pain) => (
              <div
                key={pain.title}
                style={{
                  padding: "28px 24px",
                  border: "0.5px solid rgba(0,0,0,0.06)",
                  borderRadius: "var(--radius)",
                }}
              >
                <p
                  className="label-strong"
                  style={{ marginBottom: 8, fontSize: 11 }}
                >
                  {pain.title}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    margin: 0,
                    opacity: 0.55,
                  }}
                >
                  {pain.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ─── Product Showcase ─── */}
      <section
        id="product"
        style={sectionPadding}
      >
        <p className="label" style={{ marginBottom: 16 }}>
          {t.landing.showcaseLabel}
        </p>

        {/* Feature 1: Invoices — copy left, mockup right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: "clamp(32px, 4vw, 64px)",
            alignItems: "center",
            marginBottom: "clamp(60px, 8vw, 100px)",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                margin: 0,
                marginBottom: 16,
                whiteSpace: "pre-line",
              }}
            >
              {t.landing.showcaseInvoicesTitle}
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.8,
                margin: 0,
                opacity: 0.55,
              }}
            >
              {t.landing.showcaseInvoicesDesc}
            </p>
          </div>
          <InvoiceMockup locale={locale} />
        </div>

        {/* Feature 2: VAT — mockup left, copy right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "clamp(32px, 4vw, 64px)",
            alignItems: "center",
          }}
        >
          <VatMockup locale={locale} />
          <div>
            <h3
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                margin: 0,
                marginBottom: 16,
                whiteSpace: "pre-line",
              }}
            >
              {t.landing.showcaseVatTitle}
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.8,
                margin: 0,
                opacity: 0.55,
              }}
            >
              {t.landing.showcaseVatDesc}
            </p>
          </div>
        </div>

        {/* Feature 3: Poster invoice — copy left, mockup right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: "clamp(32px, 4vw, 64px)",
            alignItems: "center",
            marginTop: "clamp(60px, 8vw, 100px)",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                margin: 0,
                marginBottom: 16,
                whiteSpace: "pre-line",
              }}
            >
              {t.landing.showcasePosterTitle}
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.8,
                margin: 0,
                opacity: 0.55,
              }}
            >
              {t.landing.showcasePosterDesc}
            </p>
          </div>
          <PosterMockup locale={locale} />
        </div>
      </section>

      <Divider />

      {/* ─── Concept ─── */}
      <section style={sectionPadding}>
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
              {t.landing.theIdea}
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
              {t.landing.lessSoftware}
              <br />
              {t.landing.moreClarity}
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
              {t.landing.ideaDescription}
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
                { value: "< 30s", label: t.landing.perInvoice },
                { value: "100%", label: t.landing.vatInsight },
                { value: "0", label: t.landing.manualWork },
                { value: "24/7", label: t.landing.overview },
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

      <Divider />

      {/* ─── Features ─── */}
      <section
        id="functies"
        style={sectionPadding}
      >
        <p className="label" style={{ marginBottom: 16 }}>
          {t.landing.features}
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
          {t.landing.featuresTitle}
          <br />
          {t.landing.featuresSubtitle}
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

      <Divider />

      {/* ─── Pricing ─── */}
      <section
        id="prijzen"
        style={sectionPadding}
      >
        <p className="label" style={{ marginBottom: 16 }}>
          {t.landing.pricing}
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
          {t.landing.pricingTitle}
        </h2>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.8,
            margin: 0,
            marginBottom: "clamp(32px, 5vw, 56px)",
            maxWidth: 620,
            opacity: 0.55,
          }}
        >
          {t.landing.pricingSubtitle}
        </p>

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

              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  margin: 0,
                  marginBottom: 8,
                  color: "var(--color-success)",
                  letterSpacing: "0.02em",
                }}
              >
                {t.landing.trialText}
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
                {plan.highlighted ? t.landing.getStarted : t.landing.choose + plan.name + " gratis"}
              </a>
              <p
                className="label"
                style={{
                  marginTop: 12,
                  textAlign: "center",
                  opacity: 0.35,
                  fontSize: 10,
                }}
              >
                {t.landing.noCreditCard}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ─── Built for ─── */}
      <section style={sectionPadding}>
        <p className="label" style={{ marginBottom: 16 }}>
          {t.landing.personaTitle}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 1,
          }}
        >
          {personas.map((p) => (
            <div
              key={p.name}
              style={{
                padding: "32px 28px",
                border: "0.5px solid rgba(0,0,0,0.06)",
                borderRadius: "var(--radius)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <p
                className="label-strong"
                style={{ marginBottom: 4, fontSize: 13 }}
              >
                {p.name}
              </p>
              <p
                className="label"
                style={{ marginBottom: 16, opacity: 0.35 }}
              >
                {p.type}
              </p>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  margin: 0,
                  opacity: 0.55,
                }}
              >
                {p.quote}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ─── FAQ ─── */}
      <section style={sectionPadding}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
            gap: "clamp(32px, 4vw, 64px)",
            alignItems: "start",
          }}
        >
          <div>
            <p className="label-strong" style={{ marginBottom: 16, fontSize: 11 }}>
              {t.landing.faqLabel}
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
              {t.landing.faqTitle}
            </h2>
          </div>
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      <Divider />

      {/* ─── Closing CTA ─── */}
      <section
        style={{
          ...sectionPadding,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 auto",
            maxWidth: 560,
            whiteSpace: "pre-line",
          }}
        >
          {t.landing.closingHeadline}
        </h2>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.8,
            margin: "24px auto 0",
            maxWidth: 480,
            opacity: 0.55,
          }}
        >
          {t.landing.closingSubtitle}
        </p>
        <div style={{ marginTop: 40 }}>
          <Link
            href={`/register?plan=${primaryPlanId}`}
            className="btn-primary"
            style={{
              padding: "18px 48px",
              textDecoration: "none",
              display: "inline-block",
              fontSize: 15,
            }}
          >
            {t.landing.closingCta}
          </Link>
          <p
            className="label"
            style={{
              marginTop: 16,
              opacity: 0.35,
              fontSize: 10,
            }}
          >
            {t.landing.closingReassurance}
          </p>
        </div>
      </section>

      <Divider />

      {/* ─── Waitlist ─── */}
      <section style={sectionPadding}>
        <div style={{ maxWidth: 560 }}>
          <WaitlistForm
            labels={{
              waitlistLabel: t.landing.waitlistLabel,
              waitlistTitle: t.landing.waitlistTitle,
              waitlistDescription: t.landing.waitlistDescription,
              waitlistName: t.landing.waitlistName,
              waitlistNamePlaceholder: t.landing.waitlistNamePlaceholder,
              waitlistEmail: t.landing.waitlistEmail,
              waitlistEmailPlaceholder: t.landing.waitlistEmailPlaceholder,
              waitlistButton: t.landing.waitlistButton,
              waitlistSuccess: t.landing.waitlistSuccess,
              waitlistPosition: t.landing.waitlistPosition,
              waitlistConfirm: t.landing.waitlistConfirm,
              waiting: t.common.waiting,
            }}
          />
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
            href="/privacy"
            className="label"
            style={{
              opacity: 0.45,
              textDecoration: "none",
              color: "var(--color-black)",
            }}
          >
            Privacy
          </Link>
          <Link
            href="/voorwaarden"
            className="label"
            style={{
              opacity: 0.45,
              textDecoration: "none",
              color: "var(--color-black)",
            }}
          >
            Voorwaarden
          </Link>
          <Link
            href="/login"
            className="label"
            style={{
              opacity: 0.45,
              textDecoration: "none",
              color: "var(--color-black)",
            }}
          >
            {t.landing.login}
          </Link>
          <Link
            href="/register"
            className="label"
            style={{
              opacity: 0.45,
              textDecoration: "none",
              color: "var(--color-black)",
            }}
          >
            {t.landing.register}
          </Link>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { joinWaitlist } from "@/features/waitlist/actions";
import { useLocale } from "@/lib/i18n/context";
import DashboardMockup from "@/components/landing/DashboardMockup";
import InvoiceMockup from "@/components/landing/InvoiceMockup";
import VatMockup from "@/components/landing/VatMockup";
import PosterMockup from "@/components/landing/PosterMockup";
import styles from "./page.module.css";

export default function LandingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { locale, t, setLocale } = useLocale();

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
    { type: t.landing.persona1Type, quote: t.landing.persona1Quote },
    { type: t.landing.persona2Type, quote: t.landing.persona2Quote },
    { type: t.landing.persona3Type, quote: t.landing.persona3Quote },
  ];

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

  const primaryPlanId = pricingPlans.find((plan) => plan.highlighted)?.id ?? pricingPlans[0]?.id ?? "basis";

  return (
    <div className={styles.page}>
      {/* Background watermark */}
      <div aria-hidden="true" className={styles.watermark}>
        VAT100
      </div>

      {/* ─── Header ─── */}
      <header className={styles.header}>
        <span className={styles.logo}>VAT100</span>
        <nav className={styles.nav}>
          <a href="#functies" className={styles.navLink}>
            {t.landing.features}
          </a>
          <a href="#prijzen" className={styles.navLink}>
            {t.landing.pricing}
          </a>
          <button
            onClick={() => setLocale(locale === "nl" ? "en" : "nl")}
            className={styles.langButton}
          >
            {locale === "nl" ? "EN" : "NL"}
          </button>
          <Link href="/login" className={styles.loginButton}>
            {t.landing.login}
          </Link>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className={`${styles.section} ${styles.sectionHero}`}>
        <div className={styles.heroGrid}>
          {/* Copy */}
          <div>
            <p className={styles.heroLabel}>{t.landing.heroLabel}</p>
            <h1 className={styles.heroTitle}>{t.landing.heroHeadline}</h1>
            <p className={styles.heroSubtitle}>{t.landing.heroSubtitleNew}
            </p>
            <div className={styles.heroActions}>
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
                href="#prijzen"
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
          </div>

          {/* Product mockup */}
          <div>
            <DashboardMockup locale={locale} />
          </div>
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <section className={`${styles.section} ${styles.sectionCompact}`}>
        <div className={styles.trustBar}>
          {[
            t.landing.trustBuiltFor,
            t.landing.trustTaxReady,
            t.landing.trustSecure,
            t.landing.trustNoKnowledge,
          ].map((signal, i) => (
            <span key={i} className={styles.trustItem}>
              {i > 0 && <span className={styles.trustDivider}>·</span>}
              {signal}
            </span>
          ))}
        </div>
        <p className={styles.trustReassurance}>{t.landing.ctaReassurance}</p>
      </section>

      <div className={styles.divider}><div className={styles.dividerLine} /></div>

      {/* ─── Product Showcase ─── */}
      <section
        id="product"
        className={styles.section}
      >
        <p className={styles.sectionLabel}>{t.landing.showcaseLabel}</p>

        {/* Feature 1: Invoices — copy left, mockup right */}
        <div className={styles.showcaseGrid}>
          <div>
            <h3 className={styles.showcaseTitle}>{t.landing.showcaseInvoicesTitle}</h3>
            <p className={styles.showcaseDescription}>{t.landing.showcaseInvoicesDesc}</p>
          </div>
          <InvoiceMockup locale={locale} />
        </div>

        {/* Feature 2: VAT — mockup left, copy right */}
        <div className={`${styles.showcaseGrid} ${styles.showcaseGridReverse}`}>
          <VatMockup locale={locale} />
          <div>
            <h3 className={styles.showcaseTitle}>{t.landing.showcaseVatTitle}</h3>
            <p className={styles.showcaseDescription}>{t.landing.showcaseVatDesc}</p>
          </div>
        </div>

        {/* Feature 3: Poster invoice — copy left, mockup right */}
        <div className={styles.showcaseGrid} style={{ marginTop: "clamp(60px, 8vw, 100px)" }}>
          <div>
            <h3 className={styles.showcaseTitle}>{t.landing.showcasePosterTitle}</h3>
            <p className={styles.showcaseDescription}>{t.landing.showcasePosterDesc}</p>
          </div>
          <PosterMockup locale={locale} />
        </div>
      </section>

      <div className={styles.divider}><div className={styles.dividerLine} /></div>

      {/* ─── Concept ─── */}
      <section className={styles.section}>
        <div className={styles.conceptGrid}>
          <div>
            <p className={styles.sectionLabel}>{t.landing.theIdea}</p>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              {t.landing.lessSoftware}
              <br />
              {t.landing.moreClarity}
            </h2>
          </div>
          <div>
            <p className={styles.conceptDescription}>{t.landing.ideaDescription}</p>
            <div className={styles.statsGrid}>
              {[
                { value: "< 30s", label: t.landing.perInvoice },
                { value: "100%", label: t.landing.vatInsight },
                { value: "0", label: t.landing.manualWork },
                { value: "24/7", label: t.landing.overview },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className={styles.statValue}>{stat.value}</p>
                  <p className={styles.statLabel}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.divider}><div className={styles.dividerLine} /></div>

      {/* ─── Features ─── */}
      <section id="functies" className={styles.section}>
        <p className={styles.sectionLabel}>{t.landing.features}</p>
        <h2 className={styles.sectionTitle}>
          {t.landing.featuresTitle}
          <br />
          {t.landing.featuresSubtitle}
        </h2>

        <div className={styles.featuresGrid}>
          {features.map((feature, i) => (
            <div key={i} className={styles.featureCard}>
              <p className={styles.featureTitle}>{feature.title}</p>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.divider}><div className={styles.dividerLine} /></div>

      {/* ─── Pricing ─── */}
      <section id="prijzen" className={styles.section}>
        <p className={styles.sectionLabel}>{t.landing.pricing}</p>
        <h2 className={styles.sectionTitle}>{t.landing.pricingTitle}</h2>
        <p className={styles.sectionSubtitle}>{t.landing.pricingSubtitle}</p>

        <div className={styles.pricingGrid}>
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`${styles.pricingCard} ${plan.highlighted ? styles.pricingCardHighlighted : ""}`}
            >
              {plan.highlighted && <div className={styles.pricingBadge}>{plan.cta}</div>}

              <p className={styles.pricingName}>{plan.name}</p>

              <div className={styles.pricingPrice}>
                <span className={styles.pricingAmount}>&euro;{plan.price}</span>
                <span className={styles.pricingPeriod}>{plan.period}</span>
              </div>

              <p className={styles.pricingDescription}>{plan.description}</p>

              <div className={styles.pricingFeatures}>
                {plan.features.map((f) => (
                  <p key={f} className={styles.pricingFeature}>
                    <span className={styles.pricingCheck}>&#x2713;</span>
                    {f}
                  </p>
                ))}
              </div>

              <a
                href={`/register?plan=${plan.id}`}
                className={`${styles.pricingCta} ${plan.highlighted ? styles.pricingCtaPrimary : styles.pricingCtaSecondary}`}
              >
                {plan.highlighted ? t.landing.getStarted : t.landing.choose + plan.name}
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.divider}><div className={styles.dividerLine} /></div>

      {/* ─── Persona Quotes ─── */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>{t.landing.personaTitle}</p>
        <div className={styles.personasGrid}>
          {personas.map((p) => (
            <div key={p.type} className={styles.personaCard}>
              <p className={styles.personaType}>{p.type}</p>
              <p className={styles.personaQuote}>&ldquo;{p.quote}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.divider}><div className={styles.dividerLine} /></div>

      {/* ─── Waitlist ─── */}
      <section id="wachtlijst" className={styles.section}>
        <div className={styles.waitlistContainer}>
          {submitted ? (
            <div className={styles.waitlistSuccess}>
              <p className={styles.waitlistSuccessTitle}>{t.landing.onWaitlist}</p>
              <p className={styles.waitlistSuccessText}>
                {position ? t.landing.waitlistPosition.replace("{position}", String(position)) : ""}
                {t.landing.waitlistConfirm}
              </p>
            </div>
          ) : (
            <div>
              <p className={styles.sectionLabel}>{t.landing.earlyAccess}</p>
              <h2 className={styles.sectionTitle}>{t.landing.waitlistTitle}</h2>
              <p className={styles.sectionSubtitle}>{t.landing.waitlistDescription}</p>

              <form onSubmit={handleSubmit} className={styles.waitlistForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.formLabel}>{t.landing.name}</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder={t.landing.namePlaceholder}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={`${styles.formGroup} ${styles.formGroupLarge}`}>
                    <label htmlFor="email" className={styles.formLabel}>{t.landing.email}</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder={t.landing.emailPlaceholder}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                {error && <div role="alert" className={styles.formError}>{error}</div>}

                <button type="submit" disabled={pending} className={`btn-primary ${styles.formSubmit}`}>
                  {pending ? t.common.waiting : t.landing.waitlistButton}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className={styles.footer}>
        <span className={styles.footerCopyright}>&copy; {new Date().getFullYear()} VAT100</span>
        <div className={styles.footerLinks}>
          <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
          <Link href="/voorwaarden" className={styles.footerLink}>Voorwaarden</Link>
          <Link href="/login" className={styles.footerLink}>{t.landing.login}</Link>
          <Link href="/register" className={styles.footerLink}>{t.landing.register}</Link>
        </div>
      </footer>
    </div>
  );
}

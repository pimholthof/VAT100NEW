"use client";

import { useState } from "react";
import Link from "next/link";
import { joinWaitlist } from "@/features/waitlist/actions";
import { useLocale } from "@/lib/i18n/context";
import DashboardMockup from "@/components/landing/DashboardMockup";
import InvoiceMockup from "@/components/landing/InvoiceMockup";
import VatMockup from "@/components/landing/VatMockup";
import PosterMockup from "@/components/landing/PosterMockup";
import FaqAccordion from "@/components/landing/FaqAccordion";
import styles from "./page.module.css";

export default function LandingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { locale, t, setLocale } = useLocale();

  const features = [
    { title: t.landing.featureInvoices, description: t.landing.featureInvoicesDesc },
    { title: t.landing.featureVat, description: t.landing.featureVatDesc },
    { title: t.landing.featureReceipts, description: t.landing.featureReceiptsDesc },
    { title: t.landing.featureCashflow, description: t.landing.featureCashflowDesc },
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
      highlighted: true,
    },
    {
      id: "compleet",
      name: t.landing.compleet,
      price: "79",
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
      highlighted: false,
    },
    {
      id: "plus",
      name: "Plus",
      price: "149",
      period: t.landing.perMonth,
      description: "Volledige fiscale infrastructuur — aangifte rechtstreeks bij de Belastingdienst.",
      features: [
        "Alles van Complete",
        "Directe Digipoort BTW-aangifte",
        "IB-aangifte via SBR",
        "Onbeperkt bonnen scannen",
        "Onbeperkt AI-chat",
        "Accountant-review jaarrekening",
        "Dedicated support",
        "White-label facturen",
      ],
      highlighted: false,
    },
  ];

  const faqs = [
    { q: t.landing.faq1Q, a: t.landing.faq1A },
    { q: t.landing.faq2Q, a: t.landing.faq2A },
    { q: t.landing.faq3Q, a: t.landing.faq3A },
    { q: t.landing.faq4Q, a: t.landing.faq4A },
    { q: t.landing.faq5Q, a: t.landing.faq5A },
  ];

  const primaryPlanId = pricingPlans.find((plan) => plan.highlighted)?.id ?? pricingPlans[0]?.id ?? "basis";

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
    <div className={styles.page}>
      <div aria-hidden="true" className={styles.watermark}>
        VAT100
      </div>

      {/* ─── Header ─── */}
      <header className={styles.header}>
        <span className={styles.logo}>VAT100</span>
        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}>
          <a href="#functies" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            {t.landing.features}
          </a>
          <a href="#prijzen" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            {t.landing.pricing}
          </a>
          <button
            onClick={() => setLocale(locale === "nl" ? "en" : "nl")}
            className={styles.langButton}
          >
            {locale === "nl" ? "EN" : "NL"}
          </button>
          <Link href="/login" className={styles.loginButton} onClick={() => setMenuOpen(false)}>
            {t.landing.login}
          </Link>
        </nav>
        <button
          className={styles.menuToggle}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
          aria-expanded={menuOpen}
        >
          <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarOpen : ""}`} />
        </button>
      </header>

      {/* ─── Hero ─── */}
      <section className={`${styles.section} ${styles.sectionHero}`}>
        <div className={styles.heroGrid}>
          <div>
            <h1 className={styles.heroTitle}>{t.landing.heroHeadline}</h1>
            <p className={styles.heroSubtitle}>{t.landing.heroSubtitleNew}</p>
            <div className={styles.heroActions}>
              <Link
                href={`/register?plan=${primaryPlanId}`}
                className={`btn-primary ${styles.btnPrimary}`}
              >
                {t.landing.heroCta}
              </Link>
              <a
                href="#prijzen"
                className={`btn-secondary ${styles.btnSecondary}`}
              >
                {t.landing.heroCtaSecondary}
              </a>
            </div>
            <p className={styles.heroReassurance}>{t.landing.heroReassurance}</p>
          </div>

          <div>
            <DashboardMockup locale={locale} />
          </div>
        </div>
      </section>

      {/* ─── Product Showcase ─── */}
      <section id="product" className={styles.section}>
        {/* Invoices — text left, mockup right */}
        <div className={styles.showcaseGrid}>
          <div>
            <h3 className={styles.showcaseTitle}>{t.landing.showcaseInvoicesTitle}</h3>
            <p className={styles.showcaseDescription}>{t.landing.showcaseInvoicesDesc}</p>
          </div>
          <InvoiceMockup locale={locale} />
        </div>

        {/* VAT — mockup left, text right */}
        <div className={`${styles.showcaseGrid} ${styles.showcaseGridReverse}`}>
          <VatMockup locale={locale} />
          <div>
            <h3 className={styles.showcaseTitle}>{t.landing.showcaseVatTitle}</h3>
            <p className={styles.showcaseDescription}>{t.landing.showcaseVatDesc}</p>
          </div>
        </div>

        {/* Invoice design — text left, mockup right */}
        <div className={styles.showcaseGrid}>
          <div>
            <h3 className={styles.showcaseTitle}>{t.landing.showcasePosterTitle}</h3>
            <p className={styles.showcaseDescription}>{t.landing.showcasePosterDesc}</p>
          </div>
          <PosterMockup locale={locale} />
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="functies" className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.landing.featuresTitle}</h2>
        <div className={styles.featuresGrid}>
          {features.map((feature, i) => (
            <div key={i} className={styles.featureCard}>
              <p className={styles.featureTitle}>{feature.title}</p>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="prijzen" className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.landing.pricingTitle}</h2>
        <div className={styles.pricingGrid}>
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`${styles.pricingCard} ${plan.highlighted ? styles.pricingCardHighlighted : ""}`}
            >
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
                {t.landing.pricingCta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.landing.faqSectionTitle}</h2>
        <div className={styles.faqContainer}>
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      {/* ─── Waitlist ─── */}
      <section id="wachtlijst" className={styles.section}>
        <div className={styles.waitlistContainer}>
          {submitted ? (
            <div className={styles.waitlistSuccess}>
              <p className={styles.waitlistSuccessTitle}>{t.landing.waitlistSuccess}</p>
              <p className={styles.waitlistSuccessText}>
                {position ? t.landing.waitlistPosition.replace("{position}", String(position)) : ""}
                {t.landing.waitlistConfirm}
              </p>
            </div>
          ) : (
            <div>
              <h2 className={styles.sectionTitle}>{t.landing.waitlistTitle}</h2>

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
                  {pending ? "..." : t.landing.waitlistButton}
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

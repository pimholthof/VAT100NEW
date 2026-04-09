import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacybeleid — VAT100",
  description: "Hoe VAT100 jouw gegevens beschermt en verwerkt.",
};

export default function PrivacyPage() {
  const updated = "4 april 2026";

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(48px, 6vw, 96px) clamp(24px, 4vw, 64px)",
      }}
    >
      <Link
        href="/"
        className="label"
        style={{ opacity: 0.3, textDecoration: "none", color: "var(--color-black)" }}
      >
        &larr; Terug
      </Link>

      <h1
        style={{
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginTop: 32,
          marginBottom: 8,
        }}
      >
        Privacybeleid
      </h1>
      <p className="label" style={{ opacity: 0.4, marginBottom: 48 }}>
        Laatst bijgewerkt: {updated}
      </p>

      <div style={{ fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
        <Section title="1. Wie zijn wij?">
          <p>
            VAT100 is een fiscale administratietool voor zelfstandigen en kleine ondernemers in Nederland. De dienst wordt
            aangeboden door VAT100 (KvK: 63172313), gevestigd te Amsterdam. Voor vragen
            over privacy kun je contact opnemen via <strong>privacy@vat100.nl</strong>.
          </p>
        </Section>

        <Section title="2. Welke gegevens verwerken wij?">
          <ul>
            <li><strong>Accountgegevens:</strong> naam, e-mailadres, studio-naam, KvK-nummer, BTW-nummer, IBAN, adresgegevens.</li>
            <li><strong>Factuur- en financiële gegevens:</strong> facturen, bonnen, transacties, urendeclaraties, ritten — alles wat je zelf invoert.</li>
            <li><strong>Bankgegevens:</strong> via Tink (Open Banking) ontvangen wij transactie-informatie. Wij slaan geen bankwachtwoorden op.</li>
            <li><strong>Gebruiksgegevens:</strong> IP-adres, browser, apparaattype, paginabezoeken (via Sentry voor foutopsporing).</li>
            <li><strong>Betalingsgegevens:</strong> betalingen lopen via Mollie. Wij slaan geen creditcard- of IBAN-gegevens op van betalingen.</li>
          </ul>
        </Section>

        <Section title="3. Waarom verwerken wij deze gegevens?">
          <ul>
            <li><strong>Uitvoering overeenkomst (Art. 6.1.b AVG):</strong> het leveren van de dienst — factureren, BTW-overzicht, bankreconciliatie.</li>
            <li><strong>Wettelijke verplichting (Art. 6.1.c AVG):</strong> fiscale bewaarplicht van 7 jaar.</li>
            <li><strong>Gerechtvaardigd belang (Art. 6.1.f AVG):</strong> beveiliging, foutopsporing, en productverbetering.</li>
          </ul>
        </Section>

        <Section title="4. Delen met derden">
          <p>Wij delen gegevens alleen met partijen die noodzakelijk zijn voor de dienstverlening:</p>
          <ul>
            <li><strong>Supabase</strong> (EU) — database en authenticatie</li>
            <li><strong>Mollie</strong> (NL) — betalingsverwerking</li>
            <li><strong>Tink / GoCardless</strong> (EU) — Open Banking verbinding</li>
            <li><strong>Resend</strong> — e-mailverzending</li>
            <li><strong>Anthropic</strong> (VS) — AI-bonherkenning (alleen bij Compleet-plan, afbeeldingen worden niet opgeslagen door Anthropic)</li>
            <li><strong>Sentry</strong> — foutmonitoring (geen persoonlijke data, alleen technische foutmeldingen)</li>
          </ul>
          <p>
            Met elke verwerker is een verwerkersovereenkomst (DPA) gesloten. Gegevens buiten de EU (Anthropic, Sentry) vallen onder
            de EU Standard Contractual Clauses.
          </p>
        </Section>

        <Section title="5. Bewaartermijnen">
          <ul>
            <li><strong>Accountgegevens:</strong> zolang je account actief is, plus 30 dagen na opzegging.</li>
            <li><strong>Financiële documenten:</strong> 7 jaar na het boekjaar (wettelijke bewaarplicht).</li>
            <li><strong>Logbestanden:</strong> maximaal 90 dagen.</li>
          </ul>
        </Section>

        <Section title="6. Jouw rechten">
          <p>Op grond van de AVG heb je recht op:</p>
          <ul>
            <li><strong>Inzage</strong> — welke gegevens hebben wij van jou?</li>
            <li><strong>Correctie</strong> — onjuiste gegevens laten aanpassen.</li>
            <li><strong>Verwijdering</strong> — gegevens laten wissen (met inachtneming van de bewaarplicht).</li>
            <li><strong>Overdraagbaarheid</strong> — je gegevens exporteren (CSV-export in de app).</li>
            <li><strong>Bezwaar</strong> — tegen verwerking op basis van gerechtvaardigd belang.</li>
            <li><strong>Klacht</strong> — bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).</li>
          </ul>
          <p>Verzoeken kun je richten aan <strong>privacy@vat100.nl</strong>. Wij reageren binnen 30 dagen.</p>
        </Section>

        <Section title="7. Beveiliging">
          <p>
            Wij nemen passende technische en organisatorische maatregelen: versleutelde verbindingen (TLS),
            Row-Level Security op databaseniveau, rate limiting, security headers, en regelmatige audits.
            Toegang tot productiedata is beperkt tot geautoriseerde beheerders.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            VAT100 gebruikt alleen strikt noodzakelijke cookies voor authenticatie (Supabase session).
            Wij gebruiken geen tracking-, analytics- of advertentiecookies. Er is daarom geen cookiebanner nodig.
          </p>
        </Section>

        <Section title="9. Wijzigingen">
          <p>
            Wij kunnen dit privacybeleid aanpassen. Bij substantiële wijzigingen informeren wij je per e-mail.
            De laatste versie is altijd beschikbaar op deze pagina.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          marginBottom: 12,
          opacity: 1,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

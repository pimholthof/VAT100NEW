import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacybeleid — VAT100",
  description: "Privacybeleid van VAT100. Hoe wij omgaan met uw persoonsgegevens.",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 48,
};

const h2Style: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 16,
  letterSpacing: "-0.01em",
};

const pStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.7,
  opacity: 0.7,
  marginBottom: 12,
};

const ulStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.7,
  opacity: 0.7,
  paddingLeft: 20,
  marginBottom: 12,
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "clamp(60px, 8vw, 120px) clamp(24px, 4vw, 64px)",
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: 13,
          opacity: 0.3,
          textDecoration: "none",
          color: "var(--color-black)",
        }}
      >
        &larr; Terug
      </Link>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          marginTop: 32,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        Privacybeleid
      </h1>

      <p style={{ ...pStyle, marginBottom: 48 }}>
        Laatst bijgewerkt: 3 april 2026
      </p>

      {/* 1. Inleiding */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Wie zijn wij</h2>
        <p style={pStyle}>
          VAT100 is een online boekhoud- en facturatieplatform voor Nederlandse
          creatieve freelancers (ZZP&apos;ers). Wij verwerken persoonsgegevens
          in overeenstemming met de Algemene Verordening Gegevensbescherming
          (AVG).
        </p>
      </section>

      {/* 2. Welke gegevens */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>2. Welke gegevens verzamelen wij</h2>
        <ul style={ulStyle}>
          <li>
            <strong>Accountgegevens:</strong> naam, e-mailadres, bedrijfsnaam,
            KVK-nummer, BTW-nummer.
          </li>
          <li>
            <strong>Financiële gegevens:</strong> facturen, bonnen, urendeclaraties,
            kilometerregistratie, activa.
          </li>
          <li>
            <strong>Bankgegevens:</strong> bij gebruik van de bankkoppeling worden
            transactiegegevens, IBAN en rekeninghouder opgehaald via Tink.
          </li>
          <li>
            <strong>Betalingsgegevens:</strong> bij abonnementsbetalingen worden
            gegevens verwerkt via Mollie (wij slaan geen creditcard- of
            bankpasnummers op).
          </li>
          <li>
            <strong>Technische gegevens:</strong> IP-adres, browser en apparaat
            (alleen voor foutopsporing via Sentry).
          </li>
        </ul>
      </section>

      {/* 3. Waarvoor */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>3. Waarvoor gebruiken wij uw gegevens</h2>
        <ul style={ulStyle}>
          <li>Het leveren en verbeteren van onze dienst.</li>
          <li>Het verwerken van facturen en betalingen.</li>
          <li>Het bieden van inzicht in uw financiële administratie.</li>
          <li>Het voldoen aan wettelijke (fiscale) verplichtingen.</li>
          <li>Het opsporen en oplossen van technische fouten.</li>
        </ul>
      </section>

      {/* 4. Derde partijen */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>4. Derde partijen</h2>
        <p style={pStyle}>
          Wij delen uw gegevens uitsluitend met partijen die noodzakelijk zijn
          voor de dienstverlening:
        </p>
        <ul style={ulStyle}>
          <li>
            <strong>Tink (Visa):</strong> bankkoppeling en transactiegegevens
            (Open Banking).
          </li>
          <li>
            <strong>Mollie:</strong> betalingsverwerking voor abonnementen en
            factuurbetalingen.
          </li>
          <li>
            <strong>Supabase:</strong> database en authenticatie (servers in de
            EU).
          </li>
          <li>
            <strong>Sentry:</strong> foutmonitoring en -rapportage.
          </li>
          <li>
            <strong>Resend:</strong> transactionele e-mails (facturen,
            wachtwoord reset).
          </li>
        </ul>
      </section>

      {/* 5. Bewaartermijn */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>5. Bewaartermijn</h2>
        <p style={pStyle}>
          Financiële gegevens bewaren wij conform de fiscale bewaarplicht van 7
          jaar. Overige persoonsgegevens worden verwijderd zodra uw account wordt
          opgeheven, tenzij wettelijke verplichtingen anders vereisen.
        </p>
      </section>

      {/* 6. Beveiliging */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>6. Beveiliging</h2>
        <p style={pStyle}>
          Wij nemen passende technische en organisatorische maatregelen om uw
          gegevens te beschermen, waaronder versleuteling van dataverkeer
          (TLS/HTTPS), row-level security op databaseniveau, en OAuth 2.0 voor
          bankkoppelingen.
        </p>
      </section>

      {/* 7. Uw rechten */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>7. Uw rechten</h2>
        <p style={pStyle}>
          Op grond van de AVG heeft u het recht op:
        </p>
        <ul style={ulStyle}>
          <li>Inzage in uw persoonsgegevens.</li>
          <li>Correctie van onjuiste gegevens.</li>
          <li>Verwijdering van uw gegevens (&ldquo;recht op vergetelheid&rdquo;).</li>
          <li>Dataportabiliteit (overdracht van uw gegevens).</li>
          <li>Bezwaar tegen verwerking.</li>
          <li>
            Het indienen van een klacht bij de Autoriteit Persoonsgegevens.
          </li>
        </ul>
      </section>

      {/* 8. Cookies */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>8. Cookies</h2>
        <p style={pStyle}>
          VAT100 gebruikt uitsluitend functionele cookies die noodzakelijk zijn
          voor de werking van de dienst: een taalvoorkeur-cookie en
          authenticatiecookies. Wij gebruiken geen tracking- of
          advertentiecookies.
        </p>
      </section>

      {/* 9. Contact */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>9. Contact</h2>
        <p style={pStyle}>
          Voor vragen over dit privacybeleid of om uw rechten uit te oefenen
          kunt u contact opnemen via{" "}
          <a
            href="mailto:privacy@vat100.nl"
            style={{ color: "var(--color-black)", textDecoration: "underline" }}
          >
            privacy@vat100.nl
          </a>
          .
        </p>
      </section>

      {/* 10. Wijzigingen */}
      <section>
        <h2 style={h2Style}>10. Wijzigingen</h2>
        <p style={pStyle}>
          Wij behouden ons het recht voor dit privacybeleid te wijzigen. De
          meest actuele versie is altijd beschikbaar op deze pagina.
        </p>
      </section>
    </main>
  );
}

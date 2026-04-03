import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden — VAT100",
  description: "Algemene voorwaarden van VAT100 voor het gebruik van onze dienst.",
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

export default function VoorwaardenPage() {
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
        Algemene Voorwaarden
      </h1>

      <p style={{ ...pStyle, marginBottom: 48 }}>
        Laatst bijgewerkt: 3 april 2026
      </p>

      {/* 1. Definities */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Definities</h2>
        <ul style={ulStyle}>
          <li>
            <strong>VAT100:</strong> het online boekhoud- en facturatieplatform,
            aangeboden als Software as a Service (SaaS).
          </li>
          <li>
            <strong>Gebruiker:</strong> de natuurlijke of rechtspersoon die een
            account aanmaakt en gebruik maakt van de dienst.
          </li>
          <li>
            <strong>Dienst:</strong> alle functionaliteiten die VAT100 biedt,
            waaronder facturatie, boekhouding, bankkoppeling en
            BTW-aangifte-ondersteuning.
          </li>
          <li>
            <strong>Abonnement:</strong> de overeenkomst op basis waarvan de
            gebruiker toegang heeft tot de dienst.
          </li>
        </ul>
      </section>

      {/* 2. Toepasselijkheid */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>2. Toepasselijkheid</h2>
        <p style={pStyle}>
          Deze algemene voorwaarden zijn van toepassing op ieder gebruik van
          VAT100 en op iedere overeenkomst tussen VAT100 en de gebruiker. Door
          een account aan te maken of de dienst te gebruiken, gaat u akkoord met
          deze voorwaarden.
        </p>
      </section>

      {/* 3. De dienst */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>3. De dienst</h2>
        <p style={pStyle}>
          VAT100 biedt een platform voor financiële administratie, specifiek
          gericht op Nederlandse creatieve freelancers (ZZP&apos;ers). De dienst
          omvat onder andere:
        </p>
        <ul style={ulStyle}>
          <li>Het opstellen en verzenden van facturen en offertes.</li>
          <li>Het registreren van bonnen, uren, kilometers en activa.</li>
          <li>Bankkoppeling via Open Banking (Tink) voor automatische transactie-import.</li>
          <li>Inzicht in BTW-aangifte en financieel overzicht.</li>
        </ul>
      </section>

      {/* 4. Account */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>4. Account</h2>
        <p style={pStyle}>
          U bent verantwoordelijk voor het geheim houden van uw
          inloggegevens. Alle activiteiten die plaatsvinden onder uw account
          vallen onder uw verantwoordelijkheid. Bij vermoeden van ongeautoriseerd
          gebruik dient u ons direct te informeren.
        </p>
      </section>

      {/* 5. Abonnementen en betaling */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>5. Abonnementen en betaling</h2>
        <p style={pStyle}>
          VAT100 biedt verschillende abonnementsvormen aan. Betalingen worden
          verwerkt via Mollie. Bij het afsluiten van een abonnement machtigt u
          VAT100 om maandelijks het abonnementsbedrag te incasseren via
          automatische incasso (SEPA Direct Debit) of andere beschikbare
          betaalmethoden.
        </p>
        <p style={pStyle}>
          U kunt uw abonnement op elk moment opzeggen. Na opzegging behoudt u
          toegang tot het einde van de lopende betaalperiode.
        </p>
      </section>

      {/* 6. Intellectueel eigendom */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>6. Intellectueel eigendom</h2>
        <p style={pStyle}>
          Alle intellectuele eigendomsrechten op de dienst, software en
          documentatie berusten bij VAT100. U behoudt alle rechten op de
          gegevens die u invoert. VAT100 claimt geen eigendom over uw
          financiële data.
        </p>
      </section>

      {/* 7. Aansprakelijkheid */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>7. Aansprakelijkheid</h2>
        <p style={pStyle}>
          VAT100 is een hulpmiddel voor uw administratie en vervangt geen
          professioneel fiscaal of boekhoudkundig advies. Wij zijn niet
          aansprakelijk voor schade die voortvloeit uit onjuiste aangiften,
          berekeningen of beslissingen op basis van informatie in de dienst.
        </p>
        <p style={pStyle}>
          Onze aansprakelijkheid is in alle gevallen beperkt tot het bedrag dat
          u in de afgelopen 12 maanden aan abonnementskosten heeft betaald.
        </p>
      </section>

      {/* 8. Beschikbaarheid */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>8. Beschikbaarheid</h2>
        <p style={pStyle}>
          Wij streven naar een hoge beschikbaarheid van de dienst, maar
          garanderen geen ononderbroken toegang. Onderhoud, updates of
          overmacht kunnen leiden tot tijdelijke onbeschikbaarheid.
        </p>
      </section>

      {/* 9. Beëindiging */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>9. Beëindiging</h2>
        <p style={pStyle}>
          U kunt uw account op elk moment opzeggen via de instellingen in de
          dienst. Na beëindiging kunt u uw gegevens exporteren gedurende een
          periode van 30 dagen. Daarna worden uw gegevens verwijderd,
          met uitzondering van gegevens die wij op grond van wettelijke
          verplichtingen dienen te bewaren.
        </p>
        <p style={pStyle}>
          VAT100 behoudt zich het recht voor een account op te schorten of te
          beëindigen bij schending van deze voorwaarden.
        </p>
      </section>

      {/* 10. Toepasselijk recht */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>10. Toepasselijk recht</h2>
        <p style={pStyle}>
          Op deze voorwaarden is Nederlands recht van toepassing. Geschillen
          worden voorgelegd aan de bevoegde rechter in Nederland.
        </p>
      </section>

      {/* 11. Contact */}
      <section>
        <h2 style={h2Style}>11. Contact</h2>
        <p style={pStyle}>
          Voor vragen over deze voorwaarden kunt u contact opnemen via{" "}
          <a
            href="mailto:info@vat100.nl"
            style={{ color: "var(--color-black)", textDecoration: "underline" }}
          >
            info@vat100.nl
          </a>
          .
        </p>
      </section>
    </main>
  );
}

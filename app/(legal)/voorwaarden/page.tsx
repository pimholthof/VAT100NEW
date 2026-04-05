import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden — VAT100",
  description: "De algemene voorwaarden van VAT100.",
};

export default function VoorwaardenPage() {
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
        Algemene Voorwaarden
      </h1>
      <p className="label" style={{ opacity: 0.4, marginBottom: 48 }}>
        Laatst bijgewerkt: {updated}
      </p>

      <div style={{ fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
        <Section title="1. Definities">
          <ul>
            <li><strong>VAT100:</strong> de aanbieder van de SaaS-dienst, ingeschreven bij de KvK onder nummer [invullen].</li>
            <li><strong>Gebruiker:</strong> de natuurlijke of rechtspersoon die een account aanmaakt en de dienst afneemt.</li>
            <li><strong>Dienst:</strong> de online fiscale administratietool, beschikbaar via vat100.nl.</li>
            <li><strong>Abonnement:</strong> de overeenkomst tussen VAT100 en Gebruiker voor toegang tot de Dienst.</li>
          </ul>
        </Section>

        <Section title="2. Toepasselijkheid">
          <p>
            Deze voorwaarden zijn van toepassing op elk gebruik van de Dienst. Door een account aan te maken
            en/of een abonnement af te sluiten, ga je akkoord met deze voorwaarden.
          </p>
        </Section>

        <Section title="3. Dienstverlening">
          <ul>
            <li>VAT100 biedt een hulpmiddel voor fiscale administratie. VAT100 is <strong>geen boekhouder of belastingadviseur</strong>.</li>
            <li>Gebruiker is zelf verantwoordelijk voor de juistheid van ingevoerde gegevens en de correctheid van aangiften.</li>
            <li>VAT100 streeft naar 99,9% uptime maar garandeert geen ononderbroken beschikbaarheid.</li>
          </ul>
        </Section>

        <Section title="4. Abonnementen en betaling">
          <ul>
            <li>Abonnementen worden maandelijks gefactureerd via automatische incasso (Mollie/SEPA).</li>
            <li>Prijzen zijn exclusief BTW, tenzij anders aangegeven.</li>
            <li><strong>Basis:</strong> €29/maand — kerninvoicing en BTW-overzicht.</li>
            <li><strong>Compleet:</strong> €59/maand — alles van Basis plus AI-functies, bankkoppeling en jaarrekening.</li>
            <li>VAT100 mag tarieven aanpassen met 30 dagen vooraankondiging per e-mail.</li>
          </ul>
        </Section>

        <Section title="5. Opzegging">
          <ul>
            <li>Je kunt je abonnement op elk moment opzeggen via de instellingen in je account.</li>
            <li>Na opzegging behoud je toegang tot het einde van de lopende betaalperiode.</li>
            <li>Na afloop kun je je gegevens exporteren (CSV). Na 30 dagen worden accountgegevens verwijderd, met uitzondering van de fiscale bewaarplicht (7 jaar).</li>
          </ul>
        </Section>

        <Section title="6. Intellectueel eigendom">
          <p>
            Alle rechten op de Dienst (software, ontwerp, teksten) berusten bij VAT100. Gebruiker behoudt
            alle rechten op eigen ingevoerde gegevens.
          </p>
        </Section>

        <Section title="7. Aansprakelijkheid">
          <ul>
            <li>VAT100 is niet aansprakelijk voor schade als gevolg van onjuiste invoer door Gebruiker.</li>
            <li>De aansprakelijkheid van VAT100 is beperkt tot het bedrag dat Gebruiker in de laatste 3 maanden aan abonnementskosten heeft betaald.</li>
            <li>VAT100 is niet aansprakelijk voor indirecte schade, gevolgschade, of gederfde winst.</li>
          </ul>
        </Section>

        <Section title="8. Privacy">
          <p>
            Op de verwerking van persoonsgegevens is ons{" "}
            <Link href="/privacy" style={{ color: "inherit", fontWeight: 700 }}>
              Privacybeleid
            </Link>{" "}
            van toepassing.
          </p>
        </Section>

        <Section title="9. Wijzigingen">
          <p>
            VAT100 mag deze voorwaarden wijzigen. Bij substantiële wijzigingen word je minimaal 14 dagen
            van tevoren per e-mail geïnformeerd. Voortgezet gebruik na de wijzigingsdatum geldt als
            acceptatie.
          </p>
        </Section>

        <Section title="10. Toepasselijk recht">
          <p>
            Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de
            bevoegde rechter te Amsterdam.
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

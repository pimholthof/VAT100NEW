import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fiscaal Disclaimer — VAT100",
  description:
    "Wat VAT100 wel en niet doet bij je belastingaangifte. Geen fiscaal advies.",
};

export default function DisclaimerPage() {
  const updated = "16 april 2026";

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
        Fiscaal Disclaimer
      </h1>
      <p className="label" style={{ opacity: 0.4, marginBottom: 48 }}>
        Laatst bijgewerkt: {updated}
      </p>

      <div style={{ fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
        <Section title="1. Wat VAT100 doet">
          <ul>
            <li>
              VAT100 is een <strong>fiscaal voorbereidingshulpmiddel</strong>: we
              berekenen je BTW-overzicht, inkomstenbelasting-prognose,
              zelfstandigenaftrek, MKB-vrijstelling, KIA en investeringen op
              basis van wat jij invoert.
            </li>
            <li>
              We genereren een <strong>concept-aangifte</strong> die je
              vervolgens zelf indient via Mijn Belastingdienst (of via je
              accountant).
            </li>
            <li>
              We bewaken kwartaal- en jaardeadlines en sturen je tijdig een
              herinnering.
            </li>
          </ul>
        </Section>

        <Section title="2. Wat VAT100 niet doet">
          <ul>
            <li>
              VAT100 is <strong>geen belastingadviseur, accountant of
              register-belastingadviseur</strong>. We geven geen persoonlijk
              fiscaal advies.
            </li>
            <li>
              VAT100 dient <strong>geen aangifte voor je in</strong> bij de
              Belastingdienst. Indiening blijft jouw verantwoordelijkheid (of
              die van je accountant).
            </li>
            <li>
              VAT100 controleert niet of jouw onderneming voldoet aan het
              urencriterium (1.225 uur), de aanvullende voorwaarden voor
              startersaftrek, of complexe situaties zoals
              herinvesteringsreserve, fiscale eenheid of internationale
              structuren.
            </li>
          </ul>
        </Section>

        <Section title="3. Berekeningen op basis van jouw invoer">
          <p>
            Alle fiscale uitkomsten zijn een <strong>directe afgeleide van de
            data die jij invoert of laat inlezen</strong> (facturen, bonnen,
            banktransacties, OCR-resultaten). VAT100 controleert niet of:
          </p>
          <ul>
            <li>de gekozen BTW-categorie (21%, 9%, 0%, verlegd) klopt voor
              jouw specifieke dienst of product;</li>
            <li>een bon of factuur fiscaal aftrekbaar is volgens de
              zakelijkheidsnorm;</li>
            <li>het zakelijke percentage van gemengde uitgaven (auto, telefoon,
              werkruimte) realistisch is;</li>
            <li>OCR-extracties uit ingelezen documenten foutloos zijn — bij een
              vertrouwensscore onder 85% vragen we expliciet om handmatige
              controle.</li>
          </ul>
          <p>
            <strong>Controleer altijd de concept-aangifte</strong> voordat je
            indient. Twijfel je? Schakel een belastingadviseur in.
          </p>
        </Section>

        <Section title="4. Actualiteit van fiscale regels">
          <p>
            VAT100 implementeert de Nederlandse belastingwetgeving zoals die
            geldt op de datum van laatste update. Tarieven, schijven,
            zelfstandigenaftrek, MKB-vrijstelling, AHK, arbeidskorting en
            KIA-percentages kunnen door wetswijzigingen veranderen. We doen ons
            uiterste best om binnen 30 dagen na publicatie in de Staatscourant
            de nieuwe regels te verwerken, maar garanderen geen
            real-time-juistheid.
          </p>
        </Section>

        <Section title="5. KOR (Kleineondernemersregeling)">
          <p>
            Als je gebruikmaakt van de KOR, schakel dit dan expliciet aan in je
            instellingen. Het bewaken van de €20.000-omzetdrempel per
            kalenderjaar en het tijdig afmelden bij de Belastingdienst bij
            overschrijding is volledig jouw verantwoordelijkheid. VAT100
            biedt geen automatische drempelmonitor.
          </p>
        </Section>

        <Section title="6. Aansprakelijkheid">
          <p>
            VAT100 is niet aansprakelijk voor naheffingen, boetes,
            belastingrente of andere fiscale gevolgen die voortvloeien uit
            onjuiste invoer, onjuiste interpretatie van fiscale regels door de
            gebruiker, of het niet of te laat indienen van aangiften. Zie
            verder artikel 7 van onze{" "}
            <Link
              href="/voorwaarden"
              style={{ color: "inherit", fontWeight: 700 }}
            >
              Algemene Voorwaarden
            </Link>
            .
          </p>
        </Section>

        <Section title="7. Twijfel? Vraag het een professional">
          <p>
            Bij grote investeringen, internationale facturatie, fiscale
            optimalisatie, bedrijfsoverdracht of een controle door de
            Belastingdienst raden we sterk aan om een register-belastingadviseur
            of accountant te raadplegen. VAT100 vervangt deze expertise niet —
            we maken het wel makkelijker om de basisadministratie zelf te
            verzorgen.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

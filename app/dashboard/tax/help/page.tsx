import Link from "next/link";

export const metadata = {
  title: "Aangifte indienen — VAT100",
  description:
    "Hoe je de cijfers uit VAT100 overneemt op Mijn Belastingdienst Zakelijk.",
};

const sectionStyle: React.CSSProperties = {
  borderTop: "0.5px solid rgba(0,0,0,0.08)",
  paddingTop: 32,
  marginTop: 32,
};

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  margin: "0 0 12px",
};

const proseStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  opacity: 0.78,
  margin: "0 0 16px",
  maxWidth: 640,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  opacity: 0.45,
  margin: "0 0 8px",
};

export default function TaxHelpPage() {
  return (
    <div style={{ maxWidth: 720, paddingBottom: 96 }}>
      <div
        style={{
          borderBottom: "1px solid var(--color-black)",
          paddingBottom: 20,
          marginBottom: 32,
        }}
      >
        <p className="label" style={{ margin: "0 0 8px" }}>
          Hulpdocument
        </p>
        <h1 className="display-title">Hoe dien ik mijn aangifte in</h1>
      </div>

      <p style={{ ...proseStyle, fontSize: 16 }}>
        VAT100 berekent je BTW-aangifte tot op de cent, maar dient hem niet
        zelf in. Dat doe je op Mijn Belastingdienst Zakelijk — in de praktijk
        een kwestie van twee schermen overtypen. Hieronder leg ik uit hoe het
        gaat en wat je nodig hebt.
      </p>

      <section style={sectionStyle}>
        <p style={labelStyle}>Wat je hier voorbereidt</p>
        <h2 style={headingStyle}>De rubrieken zijn klaar</h2>
        <p style={proseStyle}>
          Op de Belasting-pagina zie je per kwartaal welke bedragen in welke
          rubriek thuishoren — 1a voor de meeste binnenlandse omzet, 2a voor
          ICP, 5b voor de voorbelasting die je terugvraagt. Vergrendel de
          aangifte zodra je hem hebt nagelopen; dan weet je zeker dat de
          cijfers niet meer schuiven nadat je ze hebt overgenomen. De knop{" "}
          <em>Overzicht</em> achter elk kwartaal geeft je een PDF met dezelfde
          getallen, handig om naast je tweede scherm te leggen.
        </p>
      </section>

      <section style={sectionStyle}>
        <p style={labelStyle}>De zes minuten op Mijn Belastingdienst</p>
        <h2 style={headingStyle}>De aangifte zelf invullen</h2>
        <p style={proseStyle}>
          Log in op{" "}
          <a
            href="https://www.belastingdienst.nl/wps/portal/ondernemers/login"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            Mijn Belastingdienst Zakelijk
          </a>{" "}
          met DigiD of eHerkenning. Onder <em>Btw-aangifte</em> vind je het
          juiste kwartaal. Het formulier loopt langs precies dezelfde
          rubrieken die je in VAT100 ziet — vul ze één voor één in. Op het
          eind verschijnt het bedrag dat je betaalt of terugkrijgt; controleer
          dat tegen de waarde in rubriek 5g op je VAT100-overzicht. Als ze
          afwijken, klopt er ergens iets niet — kom dan eerst terug naar
          VAT100 en kijk wat er verschoven is.
        </p>
        <p style={proseStyle}>
          Bevestig pas als beide kanten matchen. De Belastingdienst stuurt
          binnen een paar minuten een ontvangstbevestiging per e-mail.
        </p>
      </section>

      <section style={sectionStyle}>
        <p style={labelStyle}>Na het indienen</p>
        <h2 style={headingStyle}>Markeren in VAT100</h2>
        <p style={proseStyle}>
          Kom terug naar de Belasting-pagina en zet de status van het
          kwartaal op <em>Ingediend</em>. Dat is administratief — VAT100 mailt
          niets naar de Belastingdienst — maar het houdt je dashboard schoon
          en zorgt dat de deadline-herinnering verdwijnt. Het bedrag betaal
          je via de standaard betaalmogelijkheid in Mijn Belastingdienst, of
          met een eigen overschrijving onder vermelding van het
          betalingskenmerk dat in de bevestiging staat.
        </p>
      </section>

      <section style={sectionStyle}>
        <p style={labelStyle}>Vragen die vaak terugkomen</p>
        <h2 style={headingStyle}>Twijfelgevallen</h2>
        <p style={proseStyle}>
          <strong>Een klant in Duitsland zonder BTW-nummer.</strong> Dat is
          gewone binnenlandse BTW — rubriek 1a, geen ICP. Een geldig
          BTW-nummer is voorwaarde voor de verlegging.
        </p>
        <p style={proseStyle}>
          <strong>Een correctie op een eerder kwartaal.</strong> Tot €1.000
          mag je dat in het lopende kwartaal meenemen. Boven dat bedrag dien
          je een suppletie in via VAT100 — daar zit een aparte pagina voor.
        </p>
        <p style={proseStyle}>
          <strong>De KOR-vrijstelling.</strong> Als je onder €20.000 omzet
          per jaar blijft en je hebt je aangemeld voor de
          kleineondernemersregeling, hoef je geen BTW-aangifte te doen. VAT100
          merkt dat aan je profielinstellingen en verbergt de aangifte-flow.
        </p>
      </section>

      <div style={sectionStyle}>
        <Link
          href="/dashboard/tax"
          className="btn-secondary"
          style={{ display: "inline-block" }}
        >
          Terug naar Belasting
        </Link>
      </div>
    </div>
  );
}

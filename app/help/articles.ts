export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  category: "btw" | "inkomstenbelasting" | "factureren";
  updated: string;
  body: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "btw-rubrieken",
    title: "De BTW-rubrieken uitgelegd",
    description:
      "Welk bedrag hoort in welk vak van je kwartaalaangifte — met voorbeelden voor ZZP'ers.",
    category: "btw",
    updated: "16 april 2026",
    body: `
### Wat staat waar op je OB-aangifte?

De BTW-aangifte (Omzetbelasting of kortweg OB) heeft vijf hoofdrubrieken. VAT100 vult deze automatisch voor je in op basis van je facturen en bonnen. Hier lees je wat elk vak betekent.

#### Rubriek 1 — Leveringen en diensten belast in Nederland

- **1a** — 21% (hoog tarief). Standaard voor de meeste diensten en producten.
- **1b** — 9% (laag tarief). Bijvoorbeeld boeken, voedingsmiddelen, kappers, fietsenmakers.
- **1c** — 0% / vrijgesteld. Bijvoorbeeld verzekeringen of medische diensten (vaak niet van toepassing voor ZZP'ers).

#### Rubriek 2 — Verleggingsregelingen binnenland

- **2a** — BTW verlegd naar jou als afnemer. Zeldzaam bij creatieve freelancers.

#### Rubriek 3 — Prestaties naar of in het buitenland

- **3a** — Leveringen aan andere EU-landen (B2C). Minder relevant voor diensten.
- **3b** — Intracommunautaire prestaties (B2B binnen de EU). Je factureert 0% BTW met de vermelding "BTW verlegd" en geeft het bedrag hier aan. Ook dien je een ICP-opgave in.
- **3c** — Installatie/afstandsverkopen in andere EU-landen.

#### Rubriek 4 — Prestaties uit buitenland aan jou

- **4a** — Diensten afgenomen van buiten de EU waarbij de BTW naar jou is verlegd.
- **4b** — Diensten of leveringen vanuit andere EU-landen.

#### Rubriek 5 — Voorbelasting

- **5a** — Totale verschuldigde BTW uit rubriek 1 t/m 4.
- **5b** — BTW op inkoopfacturen en bonnen (voorbelasting) die je terugvordert.
- **5g** — Het saldo: 5a minus 5b. Positief betekent betalen, negatief betekent terugkrijgen.

### Tip
Twijfel je over een factuur? Check altijd of de klant binnen of buiten Nederland zit, en of het B2B of B2C is. VAT100 detecteert dit meestal zelf aan de hand van het BTW-nummer van je klant.
`.trim(),
  },
  {
    slug: "kor",
    title: "De Kleineondernemersregeling (KOR) — wanneer aanmelden?",
    description:
      "Vrijstelling van BTW tot €20.000 omzet per jaar. Voordelen, valkuilen en hoe je het aanzet in VAT100.",
    category: "btw",
    updated: "16 april 2026",
    body: `
### Wat is de KOR?

De Kleineondernemersregeling stelt je vrij van BTW heffen en aangifte doen als je omzet exclusief BTW onder €20.000 per kalenderjaar blijft. Je factureert zonder BTW en vordert ook geen voorbelasting terug.

### Voordelen

- Geen kwartaalaangifte meer.
- Factureren is simpeler: geen BTW-berekening op je tarief.
- Administratie is lichter.

### Nadelen

- Je kunt **geen BTW terugvorderen** op je zakelijke aankopen (laptop, software, werkruimte).
- Bij grote investeringen is de KOR vaak duurder dan gewone BTW-aangifte.
- Je moet minstens 3 jaar aan de KOR vasthouden als je eenmaal aangemeld bent.

### Voor wie is het wel/niet interessant?

- **Wel:** dienstverleners met weinig zakelijke uitgaven (coaches, schrijvers, vertalers met laag investeringsniveau).
- **Niet:** ontwerpers en fotografen die regelmatig dure apparatuur kopen, of iedereen die richting de €20k-grens gaat.

### Drempel bereiken

Als je de €20.000 overschrijdt in een kalenderjaar, ben je **per direct** BTW-plichtig over de transactie die de drempel passeert. Je moet je dan afmelden voor de KOR bij de Belastingdienst. VAT100 biedt geen automatische drempelmonitor — houd dit dus zelf in de gaten in je financieel overzicht.

### Aanzetten in VAT100

Ga naar **Instellingen → Fiscaal profiel** en vink "Ik gebruik de Kleineondernemersregeling" aan. VAT100 factureert voortaan zonder BTW en toont geen kwartaalaangifte meer.
`.trim(),
  },
  {
    slug: "kia",
    title: "De Kleinschaligheidsinvesteringsaftrek (KIA) optimaal benutten",
    description:
      "Extra aftrekpost voor investeringen boven €2.400. Rekenvoorbeeld en hoe VAT100 het berekent.",
    category: "inkomstenbelasting",
    updated: "16 april 2026",
    body: `
### Wat is de KIA?

De KIA is een aftrekpost op je belastbare winst voor zakelijke investeringen in een boekjaar. Een investering is een bedrijfsmiddel dat je langer dan een jaar gebruikt en dat minimaal €450 exclusief BTW kost.

### Schijven (2026)

- **€0 – €2.400:** geen KIA.
- **€2.401 – €71.683:** 28% KIA over het totaal.
- **€71.684 – €132.745:** vast bedrag van €20.072.
- **€132.746 – €398.239:** vast bedrag minus 7,56% over het meerdere boven €132.745.
- **€398.240 en hoger:** geen KIA.

### Rekenvoorbeeld

Je koopt in 2026 een camera van €5.000 en een laptop van €3.000. Totale investering: €8.000.

KIA = 28% × €8.000 = **€2.240 extra aftrekpost**. Bij een marginaal tarief van 37% scheelt dat ~€829 aan inkomstenbelasting.

### Wat telt als investering?

- Computers, camera's, instrumenten, meubilair voor je werkruimte, zakelijke auto (deels).
- **Niet:** voorraad, grondstoffen, of materialen die je doorverkoopt.

### KIA optimaliseren

Als je per december 2026 net onder de €2.400 zit, kan het lonen om een geplande investering **naar voren te halen** om over de drempel te komen. VAT100's deadline-monitor-agent wijst je hier proactief op.

### Kleine investeringen (<€450)

Aankopen onder €450 boek je direct af als kosten in het lopende jaar. Geen KIA, wel volledige aftrek op je belastbare winst.
`.trim(),
  },
  {
    slug: "urencriterium",
    title: "Het urencriterium: 1.225 uur per jaar",
    description:
      "Haal je de 1.225 uur, dan krijg je zelfstandigenaftrek (€1.200) en MKB-vrijstelling (12,7%). Hoe registreer je dat?",
    category: "inkomstenbelasting",
    updated: "16 april 2026",
    body: `
### Waarom 1.225 uur?

Het urencriterium is de drempel die bepaalt of je recht hebt op:

- **Zelfstandigenaftrek** (€1.200 in 2026).
- **Startersaftrek** (€2.123 bovenop zelfstandigenaftrek, eerste 3 jaar).
- **MKB-winstvrijstelling** (12,7% vrijstelling over je winst — geldt ook zonder 1.225 uur).
- **Oudedagsreserve** (opbouwen binnen je onderneming).

Zonder 1.225 uur ben je een "hobbyist" in de ogen van de Belastingdienst en loop je deze voordelen mis.

### Wat telt mee?

- Directe uren: werk aan klantopdrachten.
- Indirecte uren: administratie, acquisitie, cursussen, bedrijfswebsite bijhouden, reistijd naar klanten, netwerkborrels met zakelijk doel.
- Studie/ontwikkeling: als het direct raakt aan je vakgebied.

### Wat telt niet mee?

- Privé tijd (social media scrollen, huishouden).
- Tijd die je als werknemer werkt (loondienst).
- Reistijd die niet direct aan een opdracht gekoppeld is.

### Urenregistratie in VAT100

Ga naar **Uren** in het dashboard en log elke werkdag je uren met een korte omschrijving. Bij een controle moet je kunnen aantonen hoe je aan 1.225 uur kwam — een vage schatting achteraf accepteert de fiscus niet.

Ons **urencriterium-agent** monitort je voortgang en waarschuwt als je achterloopt ten opzichte van het pro-rata-schema (24 uur per week).

### Bijzondere regels

- In je **eerste startersjaar** geldt de 1.225 uur nog niet als je later in het jaar bent gestart (pro-rata).
- **Zwangerschap:** niet-gewerkte weken tellen wel mee als je zelfstandige blijft (max 16 weken).
- **Ziekte:** tijdelijke onderbreking stopt de klok niet zolang je onderneming actief blijft.
`.trim(),
  },
  {
    slug: "factuurvereisten",
    title: "Wettelijke factuurvereisten in Nederland",
    description:
      "Elf onderdelen die op een Nederlandse factuur moeten staan. Anders riskeer je afwijzing door je klant of een boete.",
    category: "factureren",
    updated: "16 april 2026",
    body: `
### Verplichte onderdelen

Een Nederlandse factuur moet aan artikel 35a Wet OB 1968 voldoen. De Belastingdienst verwacht deze elf onderdelen:

1. **Je eigen naam of handelsnaam** (zoals ingeschreven bij de KVK).
2. **Je adres** (vestigingsadres, geen postbus).
3. **Je BTW-identificatienummer** (NL + 9 cijfers + B + 2 cijfers).
4. **Je KVK-nummer**.
5. **Volledige naam en adres van de klant**.
6. **Factuurdatum** (de datum waarop je de factuur stuurt, niet wanneer het werk gedaan is).
7. **Uniek factuurnummer** — oplopend, zonder gaten (VAT100 doet dit automatisch).
8. **Datum of periode van de levering of dienst**.
9. **Omschrijving van de geleverde goederen of diensten** — specifiek genoeg dat een controleur kan vaststellen wat er geleverd is.
10. **Aantal, prijs per eenheid, BTW-tarief, BTW-bedrag, totaalbedrag excl. en incl. BTW**.
11. Bij **BTW-vrijstelling of verlegging**: expliciete vermelding waarom (bijv. "BTW verlegd" of "0% — intracommunautaire levering").

### Extra vermeldingen (afhankelijk van de situatie)

- **KOR**: "Kleineondernemersregeling — geen BTW in rekening gebracht".
- **Margeregeling** (tweedehandsgoederen): "Bijzondere regeling — winstmarge".
- **Vooruitbetaling**: duidelijk vermelden dat het een voorschotfactuur is.

### Creditnota's

- Verwijs naar het oorspronkelijke factuurnummer.
- Gebruik een eigen oplopende creditnota-nummering of een duidelijke prefix (bijv. "CR-2026-001").
- Negatieve bedragen.

### Bewaarplicht

Je moet facturen **7 jaar** bewaren (art. 52 AWR). Voor onroerend goed geldt 10 jaar. VAT100 bewaart alles versleuteld in een EU-datacenter zolang je account actief is.

### Veelvoorkomende fouten

- BTW-nummer vergeten bij EU-facturen met verlegging.
- Datum leveringsperiode niet vermeld (alleen factuurdatum).
- Omschrijving "dienstverlening april" is te vaag — beschrijf *wat* je gedaan hebt.
- Gat in factuurnummering — als je factuur 013 vergeet te sturen, levert dat vragen op bij controle.
`.trim(),
  },
];

export function getArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export const CATEGORY_LABELS: Record<HelpArticle["category"], string> = {
  btw: "BTW",
  inkomstenbelasting: "Inkomstenbelasting",
  factureren: "Factureren",
};

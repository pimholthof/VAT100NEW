export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  category:
    | "btw"
    | "inkomstenbelasting"
    | "factureren"
    | "internationaal"
    | "bedrijfskosten";
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
  {
    slug: "icp-opgave",
    title: "ICP-opgave: wat en wanneer?",
    description:
      "Leveringen en diensten aan BTW-plichtige afnemers in andere EU-landen apart melden. Samen met je kwartaalaangifte.",
    category: "internationaal",
    updated: "16 april 2026",
    body: `
### Wat is een ICP-opgave?

De Opgaaf Intracommunautaire Prestaties (ICP) is een extra melding naast je gewone BTW-aangifte. Hierin geef je per EU-afnemer aan voor welk bedrag je aan ze hebt gefactureerd onder de verleggingsregeling (rubriek 3b).

### Wanneer moet je een ICP indienen?

- Je factureert als BTW-ondernemer in Nederland.
- Aan een zakelijke afnemer (B2B) in een ander EU-land.
- Die afnemer heeft een geldig EU BTW-nummer.
- Je past de verleggingsregeling toe (0% BTW op de factuur, "BTW verlegd" vermelden).

Als je dit hebt gedaan in een kwartaal, moet je naast je BTW-aangifte ook een ICP indienen.

### Deadline

- **Kwartaal ICP** (de standaard): binnen een maand na afloop van het kwartaal. Gelijk met je BTW-aangifte.
- Bij een maandelijkse BTW-aangifte kan ook ICP per maand.

### Wat moet erin staan?

Per afnemer:

1. Het **volledige BTW-identificatienummer** van de klant (landcode + nummer, bijv. DE123456789).
2. Het **totaalbedrag** exclusief BTW in euro's voor het kwartaal.
3. Of het om **diensten** of **goederen** gaat.

### Boete bij te laat of incompleet

De Belastingdienst kan €136 per fout rekenen (2026). Ook bij mismatches tussen jouw opgave en die van je EU-klant (die VIES-lookups doet).

### In VAT100

VAT100 herkent EU-reverse-charge facturen automatisch en genereert de ICP-opgave samen met je BTW-concept. Gebruik **Belasting → ICP** om de opgaaf te exporteren in het formaat dat Mijn Belastingdienst Zakelijk accepteert.

### VIES-validatie

Controleer altijd het BTW-nummer van je EU-klant via de VIES-service van de Europese Commissie. VAT100 doet dit bij het aanmaken van een nieuwe klant met een EU BTW-nummer. Ongeldige nummers = geen recht op verleggingsregeling = alsnog 21% BTW verschuldigd.
`.trim(),
  },
  {
    slug: "suppletie",
    title: "Suppletie: foutje corrigeren in een eerdere aangifte",
    description:
      "Te veel of te weinig BTW aangegeven? Met een suppletie corrigeer je dat. Drempels, deadlines en rente.",
    category: "btw",
    updated: "16 april 2026",
    body: `
### Wat is een suppletie?

Een suppletie is een extra aangifte waarmee je een eerdere BTW-aangifte corrigeert. Je ontdekt bijvoorbeeld dat je een factuur vergeten bent, of dat je een kostenpost dubbel hebt geboekt.

### Wanneer verplicht?

- Je hebt een fout ontdekt in een BTW-aangifte die **je al hebt ingediend**.
- Het te corrigeren bedrag is **meer dan €1.000**.
- Binnen vijf jaar na afloop van het boekjaar waarop de aangifte betrekking heeft.

### Wanneer optioneel?

- Is het bedrag ≤ €1.000? Dan mag je het meenemen in je volgende reguliere aangifte. Geen aparte suppletie nodig.

### Hoe werkt het?

1. Je vult een suppletie-formulier in via Mijn Belastingdienst Zakelijk of via de Belastingdienst-brief.
2. Per gecorrigeerd tijdvak geef je de juiste bedragen op.
3. Het verschil betaal je bij, of krijg je terug.

### Belastingrente

Bij een suppletie waarbij je **moet bijbetalen** berekent de Belastingdienst belastingrente vanaf 6 maanden na afloop van het kalenderjaar. Tarief 2026: 8% voor de vennootschapsbelasting, 6% voor overige belastingen (wijzigt jaarlijks).

### Geen boete bij vrijwillige verbetering

Meld je de fout **voordat** de Belastingdienst deze zelf ontdekt? Dan is er in principe geen vergrijpboete. Wacht je tot een controle? Dan kan de boete 25-100% van het verschuldigde bedrag zijn.

### In VAT100

**Belasting → Suppletie** genereert het overzicht van je eigen correcties over de afgelopen jaren en suggereert de juiste indiening-structuur. Let op: indienen gebeurt altijd zelf via Mijn Belastingdienst.
`.trim(),
  },
  {
    slug: "auto-van-de-zaak",
    title: "Zakelijke auto versus privé-auto: wat is fiscaal slim?",
    description:
      "Vier opties voor je vervoer: zakelijke auto, privé-auto met kilometervergoeding, leasen, of geen auto. Plus de bijtelling in 2026.",
    category: "bedrijfskosten",
    updated: "16 april 2026",
    body: `
### De vier opties

#### 1. Zakelijke auto (op de balans)

De auto staat op je bedrijfsbalans. Alle kosten zijn aftrekbaar: afschrijving, brandstof, verzekering, onderhoud, motorrijtuigenbelasting.

**Nadeel:** privégebruik leidt tot **bijtelling** op je belastbare winst.

Bijtelling 2026:
- **Volledig elektrisch** ≤ €30.000 catalogusprijs: 17%.
- **Volledig elektrisch** > €30.000: 17% tot €30k, 22% daarboven.
- **Brandstof- of hybride**: 22%.

Geen privégebruik? Dan geen bijtelling, maar je moet een **verklaring geen privégebruik** aanvragen en een sluitende rittenadministratie bijhouden (elke zakelijke rit loggen).

#### 2. Privé-auto met kilometervergoeding

De auto is van jou privé. Voor elke zakelijke kilometer mag je **€0,23 per km** aftrekken van je belastbare winst (2026). Eenvoudig en zonder bijtelling.

**Ideaal** als je de auto meer privé dan zakelijk gebruikt.

#### 3. Lease (operational of financial)

Bij operational lease betaal je een maandelijks bedrag dat grotendeels aftrekbaar is als kosten. Bij financial lease staat de auto effectief op de balans met bijbehorende bijtelling-regels.

#### 4. Geen auto

Soms is OV + af en toe deelauto of taxi het fiscaal én praktisch voordeligst. Alle reiskosten zijn zakelijk aftrekbaar.

### Hoe kies je?

| Situatie                                  | Vaak beste keuze             |
| ----------------------------------------- | ---------------------------- |
| < 7.500 zakelijke km per jaar             | Privé-auto + €0,23/km        |
| 7.500–20.000 zakelijke km, veel privé     | Privé-auto + €0,23/km        |
| > 20.000 zakelijke km, weinig privé       | Zakelijke auto (elektrisch)  |
| Nieuwe EV, sterke milieu-focus            | Zakelijke EV (17% bijtelling)|

### In VAT100

Ga naar **Ritten** om zakelijke kilometers per dag te loggen. Bij keuze "privé-auto met vergoeding" berekent VAT100 automatisch de aftrekbare vergoeding in je IB-prognose.
`.trim(),
  },
  {
    slug: "werkruimte-thuis",
    title: "Werkruimte thuis aftrekken — de strikte voorwaarden",
    description:
      "De werkkamer in je huis is zelden aftrekbaar. Wat wel kan: zakelijk gedeelte van internet, telefoon en energie.",
    category: "bedrijfskosten",
    updated: "16 april 2026",
    body: `
### Het harde uitgangspunt

De Belastingdienst is streng over **werkkamer-aftrek**. In 2026 mag je de kosten van een werkruimte thuis **alleen aftrekken als de werkruimte een zelfstandige werkruimte is**. Dat betekent:

- Eigen opgang of eigen ingang.
- Eigen toilet en watervoorziening.
- De ruimte is verhuurbaar aan derden zonder de rest van de woning mee te verhuren.

Kort: een verbouwd souterrain of losstaand studiogebouw op je perceel kan voldoen. Een kamertje boven met een bureau ertussen **niet**.

### Wat is wél altijd aftrekbaar?

Ook zonder een "zelfstandige werkruimte" zijn de volgende zakelijke kosten aftrekbaar:

- **Internet**: zakelijke percentage van de abonnementskosten (meestal 50-80%).
- **Mobiele telefoon**: zakelijke percentage van het abonnement.
- **Drukwerk, kantoorartikelen, printerinkt**: volledig.
- **Zakelijke computerapparatuur** (meer dan €450: KIA-investering; minder: directe afboek).
- **Vakliteratuur, abonnementen, cursussen** specifiek voor je vak.

### Voorbeeld: realistisch zakelijk percentage

Je werkt 4 dagen per week thuis, hebt een gezin dat ook internet en telefoon gebruikt. Redelijke percentages:

- Internet: 40-60%
- Telefoon: 50-80%
- Printer/inkt: 80-100%

Documenteer je onderbouwing in VAT100 bij de bon (opmerkingenveld). Bij controle wil de inspecteur weten waarom jij 70% kiest.

### Energie- en huurkosten

Zonder zelfstandige werkruimte zijn deze **niet aftrekbaar**, hoe graag je het ook wilt. Ook een "evenredig deel" van de huur op basis van m² accepteert de fiscus niet.

### In VAT100

Bij elke bon kun je een **zakelijk percentage** instellen tussen 0 en 100. VAT100 past dit percentage toe op zowel de aftrekbare kosten als de voorbelasting (BTW).
`.trim(),
  },
  {
    slug: "btw-verlegd",
    title: "BTW verlegd: wanneer en hoe toepassen?",
    description:
      "Verleggingsregeling binnen Nederland en binnen de EU. De afnemer betaalt de BTW in plaats van jij. Voorkom dure fouten.",
    category: "internationaal",
    updated: "16 april 2026",
    body: `
### Wat is "BTW verlegd"?

Bij verlegde BTW vermeld je op je factuur géén BTW-bedrag, maar de zin "BTW verlegd" (of *reverse charge* in het Engels). Je afnemer verwerkt de BTW zelf op zijn eigen aangifte. Jij factureert 0% en draagt niks af.

### Wanneer toepassen?

#### 1. Binnenlandse verlegging (zeldzaam bij creatieven)

- **Onderaanneming in de bouw**: verplicht verleggen naar de hoofdaannemer.
- **Schoonmaakdiensten** aan een andere BTW-plichtige opdrachtgever in de sector.
- **Levering mobiele telefoons boven €10.000** aan een andere BTW-plichtige.

Voor de meeste creatieve diensten (ontwerp, fotografie, tekst) is binnenlandse verlegging **niet van toepassing**. Je factureert gewoon 21%.

#### 2. Intracommunautaire verlegging (B2B binnen de EU)

Lever je een dienst aan een zakelijke klant in een ander EU-land met geldig BTW-nummer? Dan verleg je de BTW. Op de factuur:

- 0% BTW.
- Vermelding: **"BTW verlegd - reverse charge - Art. 44 EU BTW-richtlijn"**.
- Je eigen BTW-nummer.
- Het BTW-nummer van de klant (geverifieerd via VIES).

Daarnaast: **ICP-opgave** indienen (zie het artikel daarover).

#### 3. Diensten aan klanten buiten de EU

Voor de meeste diensten geldt: géén Nederlandse BTW verschuldigd, want de dienst wordt in het land van de afnemer geconsumeerd. Op de factuur:

- 0% BTW.
- Vermelding: **"Niet-belastbaar in Nederland - plaats van dienst buiten EU"**.

Geen ICP nodig.

### Veelgemaakte fouten

- **Vergeten te verleggen** bij een Duitse of Belgische klant met BTW-nummer. Gevolg: je bent alsnog 21% Nederlandse BTW verschuldigd, maar kunt dat niet meer terughalen bij je klant.
- **Verleggen naar particuliere EU-klanten.** Dat mag niet — alleen B2B. Bij B2C gelden andere regels (OSS, drempels).
- **Geen VIES-validatie** vooraf. Als het nummer ongeldig is, is verlegging niet geldig.

### In VAT100

Zet bij het opstellen van de factuur **BTW-regeling: verlegd EU** of **export buiten EU**. VAT100 vult de juiste vermelding automatisch in op de PDF en neemt de factuur correct mee in rubriek 3b (EU) of 4a (export).
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
  internationaal: "Internationaal",
  bedrijfskosten: "Bedrijfskosten",
};

# VAT100 — Beta-analyse & plan

> Analyse en plan om VAT100 te smeden tot een perfect beta-product, voor de
> doelgroep **creatieve zzp'ers met €50–80k winst**. Geschreven in de stem van
> `docs/voice.md`: kalm, precies, zonder hype. Zie ook `docs/scope-minimaal.md`
> (uitgevoerde minimalisatie) en `docs/launch-stappenplan.md` (operationeel).

## 1. De kern in vijf zinnen

VAT100 is technisch verrassend **volwassen** (405/405 tests groen, een
inhoudelijk correcte fiscale engine, een sterke designtaal en kalme copy) maar
tegelijk **overbouwd voor een beta**: er zit een complete admin-console, een
agent/automation-laag, banking, Digipoort, referrals en een community-netwerk
in — veel meer dan de "fiscale kern" die het belooft te zijn. De recente
minimaliseringsbeweging gaat de goede kant op, maar is half af: er staan nog
dode pagina's, brutalist-resten en een tegenstrijdige landing in. De échte
opgave is niet *méér bouwen*, maar **scherpstellen**: één wig kiezen, de rest
verbergen of weglaten, en de drie kernflows (factuur, BTW, "wat kan ik
uitgeven") tot Apple-niveau afmaken. De fiscale inhoud klopt en is goed
uitgelegd; de winst zit in focus, niet in features.

## 2. Markt & doelgroep

### Het gat dat we claimen
"Tussen Moneybird en Exact" is een reëel gat, maar het is **niet leeg**. Onze
echte concurrent is **Moneybird**, niet Exact.

| Speler | Ordegrootte prijs/mnd | Positionering | Design |
|---|---|---|---|
| **Moneybird** | €12–18 | Breed, geliefd, net en simpel | Hoog (de NL-benchmark) |
| **e-Boekhouden / Acumulus** | €5–10 | Goedkoop, utilitair | Laag |
| **Jortt** | €15–22 | "Automatisch boekhouden", dient BTW direct in | Midden |
| **Tellow / Rompslomp** | €10–25 | App-first, zzp-gericht, vriendelijk | Midden-hoog |
| **Exact / SnelStart / Visma** | €30–70+ | MKB/accountant-grade | Laag, complex |
| **VAT100** | één all-in prijs (~€24) | Design-led, kalm, "fiscale cockpit" | Zeer hoog |

**Onderscheid:** niet "simpeler dan Exact" (te makkelijk), maar **"rustiger en
mooier dan Moneybird, met een inzichtlaag die Moneybird niet vooropstelt."**

### De doelgroep (€50–80k winst, creatief)
- **Gevestigd, geen starter.** Ze hebben al iets (Moneybird of een boekhouder).
  We vechten om een **switch**, niet om een eerste keuze. Switchkosten zijn de
  grootste vijand → een vlekkeloze importer is cruciaal.
- **Design is hun vak.** Ze gebruiken Notion, Linear, Things, Arc. Ze betalen
  een **design-premie** voor gereedschap dat goed voelt — mits de basis klopt.
- **De pijn is fiscaal-emotioneel.** Op €50–80k winst is de IB + Zvw fors. De
  killervraag is **"hoeveel kan ik écht uitgeven?"** — precies onze *Vrij te
  besteden* + *belastingreservering*. Dáár zit de wig, niet in factureren.
- **Velen houden hun boekhouder.** Positioneer als **cockpit naast de
  boekhouder**, niet als vervanger.

## 3. Levensvatbaarheid

**Sterk:** echt onderscheidende designtaal en stem; inhoudelijk juiste fiscale
engine (constanten 2026 geverifieerd, BTW-rubrieken correct, KIA→ondernemers­
aftrek→MKB-volgorde gecorrigeerd); een inzichtlaag die een echte wig is;
technisch gezond (tests groen, RLS breed, AVG-export/verwijdering aanwezig).

**Vijf risico's (aflopend in belang):**
1. **Prijs vs. markt.** Premie boven de incumbents; alleen verdedigbaar met een
   glasheldere belofte en vlekkeloze basis.
2. **Overbouw = beta-risico.** Groot oppervlak voor bugs/onderhoud; ondermijnt
   de "minimaal"-belofte zodra een gebruiker een rommelig hoekje ziet.
3. **Digipoort staat uit.** We *prepareren/exporteren* de BTW maar dienen niet
   in. De oude "Plus"-belofte "Directe Digipoort BTW-aangifte" is niet waar.
4. **Vertrouwen.** Nieuw fiscaal merk; laat een RB/fiscalist de constanten
   aftekenen vóór betaald (zie `docs/fiscal-constants-2026.md`).
5. **Switch-frictie.** "Binnen een uur over" vereist een écht goede importer.

**Verdict:** levensvatbaar als **gefocuste, design-led fiscale cockpit voor
creatieve zzp**, mits we verscherpen naar één wig, bewust prijzen, de basis
vlekkeloos maken en de fiscale beloftes de-risken. *Niet* levensvatbaar als
"mooie Exact-concurrent die alles doet".

## 4. Gekozen koers

**Positionering: design-premie, één all-in prijs (~€24/mnd).** Geen tiers, geen
feature-gating — alles inbegrepen, maximaal "minimaal/Apple", makkelijkst uit
te leggen, past het best bij de creatieve niche. Tijdens de beta is alles
gratis (`NEXT_PUBLIC_BETA_MODE=true`); de prijs verschijnt pas ná de beta.

> De €24 is een vertrekpunt binnen de bandbreedte €20–29. Bevestig het exacte
> bedrag vóór de overgang naar betaald, en zet één bijpassend plan in de DB
> (`public.plans`) klaar (zie het leken-stappenplan).

## 5. Wat schrappen, simpeler maken, of toevoegen

### Schrappen / uit de beta halen
| Item | Waarom |
|---|---|
| `app/dashboard/network` + `resources` | Groei-gated, nergens gelinkt, nog in oude brutalist-stijl — dode last in de bundle. |
| Agent/automation-laag (`lib/automation/agents/*`) | Autonome "agents" zijn beta-overkill. Behoud alleen OCR + bank-categorisatie. |
| Referrals + waitlist op de landing | Groei-extra's; de waitlist sprak de "meld je gratis aan"-CTA tegen. *(Waitlist is nu achter `!beta` gezet.)* |
| 4-tier pricing (29/39/79/149) + "Plus" | Vervangen door één all-in prijs. *(Uitgevoerd.)* |

### Simpeler maken (behouden, maar inklappen/conditioneel)
- **Belastingpagina** (`TaxContent.tsx`, 1065 r.) splitsen; de IB-detail­
  berekening (schijven, AHK, arbeidskorting, KIA-trajecten) achter "Toon
  berekening". Toon standaard alleen "Geschatte IB: € X" en "Reserveren: € Y".
- **Conditioneel tonen** i.p.v. altijd: afschrijvingstabel (alleen bij activa),
  ICP-opgave (alleen bij EU-klanten), suppletie, voorlopige aanslagen.
- **Onboarding stap 3** (fiscaal profiel) splitsen in "Snelle setup" (default:
  per kwartaal, huidig boekjaar) + "Geavanceerd".
- **Factuur-metadata** standaard inklappen. *(Uitgevoerd — desktop.)*

### Wat ontbreekt (en past bij de doelgroep)
1. **Echte importer** (Moneybird/CSV → klanten + facturen) als held van de
   onboarding.
2. **Concrete reserveer-actie**: niet alleen "reserveren: € X" tónen, maar een
   "zet opzij"-mechaniek.
3. **Korting-veld** op facturen (nu omweg via negatieve regel).
4. **OCR-vertrouwen tonen** ("herkend, controleer de gemarkeerde velden").
5. **Mobiel: Berichten + Instellingen** ontbreken in de bottom-nav.

## 6. UI/UX zo intuïtief mogelijk — met bijpassende copy

Acht principes; elk principe stuurt zowel het scherm als de woorden erop.

1. **Eén getal als held.** Het hele product draait om *Vrij te besteden — na de
   Belastingdienst*. Maak dat het grootste, rustigste element op het dashboard.
   Copy: `"Vrij te besteden"` + één regel context (`"Na BTW en je
   belastingreservering."`), nooit een uitroepteken.
2. **De volgende stap is altijd zichtbaar.** Eén primaire actie per scherm, de
   rest is secundair of weg. Copy benoemt de actie concreet:
   ✅ `"Maak je eerste factuur — bedrag, ontvanger, klaar."`
3. **Toon, verberg de berekening.** Geef het antwoord; stop de wiskunde achter
   "Toon berekening". Copy: ✅ `"Reserveer € 4.200 voor de BTW"` ❌ een tabel
   met negen rubrieken bovenaan.
4. **Auto vóór invoer.** BTW-schema, factuurnummer, datum, vervaltermijn:
   automatisch invullen, alleen tonen als samenvatting. De gebruiker corrigeert
   hooguit; hij vult niet in.
5. **Lege staten zijn uitnodigingen, geen gaten.** Elke lege lijst krijgt een
   rustige kaart die zegt wat de functie dóét. Copy:
   ✅ `"Koppel je bank om je cashflow te zien."` ❌ een lege tabel.
6. **Schuldvrije fouten.** Een fout vertelt wat te doen, niet wat fout ging.
   Copy: ✅ `"Controleer het BTW-nummer — formaat NL000000000B01."`
   ❌ `"Ongeldige invoer."`
7. **Nuchtere bevestiging.** Succes is kort en zonder feest. Copy:
   ✅ `"Verstuurd."` / `"Opgeslagen."` ❌ `"Gelukt! 🎉"`
8. **Eén stem, één woordenlijst.** Gebruik de termen van de Belastingdienst
   (aangifte, rubriek, voorbelasting, KOR, zelfstandigenaftrek) en leg ze één
   keer kort uit. Euro's als `€ 1.234,56`, procenten als `21%`.

**Algemene copy-regels (uit `docs/voice.md`):** Nederlands, je/jij; kalm en
zeker; precies boven gezellig; één idee per zin; geen hype-woorden
("geweldig", "supersnel", "revolutionair"). Bij fiscale cijfers altijd:
`"Indicatie op basis van de tarieven 2026. Geen belastingadvies."`

## 7. Design — verder verbeteren

1. **Maak de "Luminous Conceptualism"-migratie af.** `styles/globals.css` staat
   nog vol `.brutalist-*` klassen en "Editorial Brutalism"-comments; er is een
   ongebruikte serif (`Cormorant Garamond`); `network`/`resources` zijn nog
   letterlijk brutalist. Eén naam, één systeem, overal.
2. **Off-palette kleuren opruimen.** *(Landing-mockups gefixt: blauw `#2563eb`
   → token-info `#2D5A7B`; "Q2 2024" → dynamische periode.)* Loop de rest na.
3. **Eén accent, spaarzaam.** Karmijn `#A51C30` alleen voor te-laat/urgentie.
4. **Lege staten als ontwerpkans** (zie §6.5).
5. **Beweging budgetteren.** Houd de staggered fade-ins op het dashboard, niet
   op elke lijstpagina; respecteer `prefers-reduced-motion` (gebeurt al).

## 8. Het plan — zes fasen

- **Fase 0 — Wig & prijs vastleggen.** ✅ Gedaan: design-premie, één all-in prijs.
- **Fase 1 — Sloop & consolidatie.** Dode pagina's eruit; agent-laag stil op
  OCR/categorisatie; waitlist achter `!beta` (✅); pricing → één all-in (✅).
- **Fase 2 — Designcoherentie.** Brutalist-resten + ongebruikte serif uit
  `globals.css`; off-palette kleuren (mockups ✅); lege staten herontwerpen.
- **Fase 3 — Kernflow-helderheid.** `TaxContent.tsx` splitsen + IB-detail achter
  "Toon berekening"; conditioneel tonen; factuur-metadata inklappen (✅);
  onboarding stap 3 → snelle/geavanceerde setup; checklist auto-inklappen (✅).
- **Fase 4 — Vertrouwen & fiscale de-risking.** RB/fiscalist tekent constanten
  af; OCR-confidence zichtbaar; eerlijk "indienen"-verhaal; importer als held.
- **Fase 5 — Beta-ops.** Zie `docs/launch-stappenplan.md` (migraties, env-vars,
  DPA's, PITR, Sentry, rooktest, invite-codes).
- **Fase 6 — Feedback-lus & succesmaat.** Definieer vooraf: **activatie**
  (eerste factuur verstuurd), **aha** (vrij-besteedbaar bekeken), **retentie**
  (week-2 terug).

## 9. Reeds uitgevoerd in deze sessie (quick wins)

Veilig, build-gates groen (typecheck + lint + 405 tests):
1. Wachtlijst alleen buiten bèta — einde tegenstrijdige landing-CTA.
2. Pricing 4-tier → één all-in kaart (~€24), bijpassende copy.
3. Landing-mockups: off-palette blauw → token; stale "2024" → dynamische periode.
4. Factuur-metadata standaard ingeklapt (factuur = bedrag + ontvanger).
5. Onboarding-checklist klapt zichzelf in zodra de eerste stap klaar is.

## 10. Definitie van "perfecte beta"

1. Eén heldere wig op de landing en het dashboard (*Vrij te besteden*).
2. Drie vlekkeloze kernflows: factuur, BTW-overzicht, "wat kan ik uitgeven".
3. Geen dode/rommelige hoekjes zichtbaar (alles uit-flag of weg).
4. Eén designsysteem, één stem, overal.
5. Fiscale cijfers afgetekend door een RB; eerlijke disclaimers.
6. Werkende importer + rooktest groen (`docs/launch-stappenplan.md`).
7. `npm run build`, typecheck, lint en tests groen; CI groen.

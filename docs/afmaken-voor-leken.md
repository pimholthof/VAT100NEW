# VAT100 afmaken — stappenplan voor niet-technische makers

> Dit is het plan om VAT100 zelf naar een goede beta te brengen, **zonder dat je
> hoeft te programmeren**. In gewone taal. Voor de strategie erachter, zie
> `docs/beta-analyse-en-plan.md`. Voor de pure techniek-checklist, zie
> `docs/launch-stappenplan.md`.

## Waar staat VAT100 nu? (in mensentaal)

Goed nieuws: de bouw is grotendeels **klaar en gezond**. De rekenkern voor de
belasting klopt, de tests draaien groen, en het ontwerp is sterk. Het is geen
half product — het is een bijna-af product dat vooral **scherper en rustiger**
moet. Je hoeft dus niet "alles nog te bouwen". Je moet vooral **keuzes maken,
overbodige dingen wegzetten, en een paar partijen inschakelen** (een
ontwikkelaar voor de techniek, een fiscalist voor de cijfers).

Denk aan een bijna-klaar restaurant: de keuken werkt, de gerechten kloppen.
Wat rest is de eetzaal opruimen, het menu inkorten, en de vergunningen rond
krijgen.

## De drie rollen — wie doet wat

Je hebt drie petten nodig. Jij draagt er één; voor de andere twee huur je
iemand in (of doe je het samen met een technische partner).

| Rol | Wie | Doet |
|---|---|---|
| **Jij (de maker)** | jij | Keuzes maken (prijs, teksten, welke functies weg). Testen als gebruiker. Partijen aansturen. |
| **Een ontwikkelaar** | inhuur / partner | De technische klussen uit dit plan. Knoppen aanzetten (env-vars). Live zetten op Vercel. |
| **Een fiscalist / RB** | inhuur (eenmalig) | De belastingcijfers één keer aftekenen vóór je geld vraagt. |

> Je hebt **geen** team nodig. Eén goede freelance Next.js-ontwikkelaar (een
> paar dagen) en één fiscalist (een paar uur) volstaan voor de beta.

## Wat ik al voor je heb gedaan

Alles getest en op de werkbranch — typecheck, lint, **423 tests** én een
volledige `next build` staan groen.

**Zichtbaar netter:**
1. **Landing opgeruimd** — de wachtlijst verdwijnt tijdens de gratis beta, zodat
   bezoekers niet tegelijk "schrijf je in" én "wacht even" zien.
2. **Prijzen versimpeld** — van vier verwarrende pakketten naar **één all-in
   abonnement** (nu €24/maand). Tijdens de beta is alles nog gratis.
3. **Mockups gefixt** — verkeerde blauwtint → huiskleur; vast jaartal → past
   zich vanzelf aan.
4. **Factuur maken is rustiger** — nummer/datum/BTW staan ingeklapt. Je ziet:
   bedrag + ontvanger.
5. **Setup-checklist gedraagt zich** — vouwt zichzelf op zodra je begint.
6. **Belastingpagina rustiger** — bovenaan alleen "Geschatte IB" en "Te
   reserveren"; de hele berekening zit achter "Toon berekening".
7. **Onboarding korter** — de zware fiscale stap is nu een kalme intro met de
   fijn-instellingen achter "Geavanceerd". Overslaan kan.
8. **Dashboard-held** — "Vrij te besteden" is nu het grootste, rustigste getal
   op je dashboard. Precies je wig.

**Onder de motorkap:**
9. **Importer afgemaakt** — je kunt nu je **klanten** importeren (de hoeksteen
   om snel over te stappen), met herkenning van Moneybird- en Engelstalige
   kolommen en dedup zodat er geen dubbelen ontstaan. Vindbaar vanaf de
   klantenpagina en de lege staat ("Importeer uit Moneybird").
10. **Slimme kolomherkenning** — komt je bestand uit een onbekend systeem? Dan
    herkent de "Kolommen automatisch herkennen"-knop de kolommen voor je
    (Claude onder de motorkap), met terugval op handmatig.
11. **Opgeschoond** — ongebruikt lettertype uit de stijl; facturen-import neemt
    nu status en vervaldatum over; off-palette kleuren naar de huiskleuren.
12. **Laatste luide hoekjes weg** — de activatie- en abonnement-schermen stonden
    nog in een oude donkere, schreeuwerige stijl ("Oeps!", hoofdletters). Nu
    rustig, licht en in dezelfde stem als de rest.

Dit staat allemaal op de werkbranch, klaar om te bekijken.

## Stap-voor-stap: van nu naar een live beta

Werk van boven naar beneden. De ⏱️ is een ruwe inschatting.

### Deel A — Keuzes die alleen jij kunt maken (jij, ⏱️ 1–2 dagen)
1. **Bevestig de prijs.** Eén all-in bedrag tussen €20 en €29. (Staat nu op €24.)
   Dit telt pas ná de beta; je hebt dus tijd, maar leg het vast.
2. **Schrijf/keur de kernteksten.** De landing, de drie belangrijkste schermen
   (dashboard, factuur, BTW) en de foutmeldingen. Houd je aan de acht principes
   onderaan dit document. Eén stem, geen hype.
3. **Beslis wat weg mag.** Bevestig dat het "Netwerk" en de "Kennisbank"
   (community-onderdelen) uit de beta mogen, plus de oude AI-"agents". Dit
   houdt het product strak. (Zie `docs/beta-analyse-en-plan.md` §5.)

### Deel B — Technische klussen (ontwikkelaar, ⏱️ 3–6 dagen)
Geef je ontwikkelaar `docs/beta-analyse-en-plan.md` §8 en deze lijst:
4. **Dode hoekjes weg.** Verwijder/verberg de community-pagina's (`network`,
   `resources`) zodat ze niet meer meeladen.
5. **Belastingpagina rustiger maken.** Toon standaard alleen "Geschatte
   inkomstenbelasting" en "Te reserveren bedrag"; stop de uitgebreide berekening
   achter een knop "Toon berekening". Verberg zeldzame onderdelen (ICP,
   suppletie, afschrijving) tenzij ze van toepassing zijn.
6. **Onboarding korter.** Splits de zware derde stap in een "snelle setup"
   (standaardkeuzes) en een optionele "geavanceerd".
7. **Importer als startpunt.** Maak het importeren vanuit Moneybird/CSV de
   eerste actie voor nieuwe gebruikers ("binnen een uur over").
8. **Designsysteem afmaken.** Ruim de laatste resten van de oude "brutalist"-
   stijl op zodat alles dezelfde rustige look heeft.

### Deel C — De cijfers laten kloppen (fiscalist, ⏱️ enkele uren)
9. **Laat een RB/fiscalist de constanten aftekenen** — de belastingschijven en
   aftrekposten 2026 (lijst in `docs/fiscal-constants-2026.md`). Eenmalig.

### Deel D — Live zetten (ontwikkelaar, ⏱️ 1 dag)
Dit staat al uitgeschreven in `docs/launch-stappenplan.md`. In het kort:
10. **Database klaarzetten** (Supabase, EU-regio, back-ups aan, migraties
    draaien).
11. **Knoppen aanzetten** (env-vars op Vercel: beta-modus aan, uitnodigingscode,
    de sleutels voor e-mail/betalingen/bon-scannen).
12. **Afspraken met leveranciers** (verwerkersovereenkomsten — `subverwerkers.md`).
13. **Live zetten en de rooktest doen** (zie hieronder).

### Deel E — Uitnodigen & luisteren (jij, doorlopend)
14. **Nodig een kleine groep uit** met de uitnodigingscode.
15. **Kijk naar drie cijfers:** maken mensen een eerste factuur (activatie),
    bekijken ze "vrij te besteden" (het aha-moment), komen ze in week 2 terug
    (retentie)? Daar stuur je op.

## Hoe je test of het werkt (rooktest in mensentaal)

Doe dit zelf, als gebruiker, na het live zetten. Werkt dit rijtje, dan klopt de
basis:
1. Registreer met de uitnodigingscode.
2. Vul je bedrijfsgegevens in (of sla over).
3. Maak één factuur: kies een klant, vul een bedrag in, verstuur.
4. Scan één bon (foto/PDF) en kijk of bedrag en datum herkend worden.
5. Open het BTW-overzicht: zie je een bedrag om te reserveren?
6. Klik op de feedback-knop en stuur jezelf een testbericht.

Loopt dit zonder hobbels? Dan is je beta technisch klaar om te delen.

## De acht principes voor intuïtieve schermen + teksten

Gebruik deze als meetlat voor élk scherm. (Uitgebreid in
`docs/beta-analyse-en-plan.md` §6.)

1. **Eén getal is de held** — "Vrij te besteden" is het grootste, rustigste
   element. Eén regel context eronder, nooit een uitroepteken.
2. **De volgende stap is altijd zichtbaar** — één hoofdactie per scherm.
   ✅ "Maak je eerste factuur — bedrag, ontvanger, klaar."
3. **Toon het antwoord, verberg de berekening** — ✅ "Reserveer € 4.200 voor de
   BTW", niet een tabel met negen rubrieken.
4. **Automatisch vóór invullen** — nummer, datum, BTW vult het systeem; de
   gebruiker corrigeert hooguit.
5. **Lege schermen zijn uitnodigingen** — ✅ "Koppel je bank om je cashflow te
   zien", niet een leeg vlak.
6. **Fouten zonder schuld** — ✅ "Controleer het BTW-nummer — formaat
   NL000000000B01", niet "Ongeldige invoer".
7. **Nuchtere bevestiging** — ✅ "Verstuurd.", niet "Gelukt! 🎉".
8. **Eén stem, één woordenlijst** — gebruik de woorden van de Belastingdienst,
   leg ze één keer uit. Euro's als `€ 1.234,56`, procenten als `21%`. Bij elk
   fiscaal getal: "Indicatie op basis van de tarieven 2026. Geen belastingadvies."

## Ruwe inschatting

| Onderdeel | Wie | Tijd | Kosten (indicatie) |
|---|---|---|---|
| Keuzes + teksten | jij | 1–2 dagen | je eigen tijd |
| Technische klussen (B + D) | ontwikkelaar | 4–7 dagen | freelance dagtarief × dagen |
| Cijfers aftekenen | fiscalist/RB | paar uur | eenmalig uurtarief |
| Leveranciers-afspraken | jij + ontwikkelaar | verspreid | meestal gratis/standaard |

> Dit is een **beta**, geen eindproduct. Het doel is: een kleine groep echte
> gebruikers, een vlekkeloze kern, en een feedback-lus. Alles wat niet bijdraagt
> aan de eerste factuur of het "wat kan ik uitgeven"-moment kan wachten.

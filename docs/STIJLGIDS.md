# VAT100 — Stijlgids

---

## I. Manifest

Dit is boekhoudsoftware die eruitziet als een typografisch affiche.
Elk scherm is een gedrukte pagina. Elk cijfer is gezet, niet getypt.
Hiërarchie ontstaat door schaal en gewicht — nooit door kleur.
Witruimte is geen leegte. Het is stilte tussen de woorden.

---

## II. Raster

```
┌──────────────────────────────────────────────────────────────┐
│  80px  │  12 kolommen × 8px baseline  │  80px               │
│  marge │  max-breedte: 1200px         │  marge              │
└──────────────────────────────────────────────────────────────┘
```

**Baseline-eenheid:** 8px (`--u: 8px`). Alle verticale maten zijn veelvouden hiervan.

**12 kolommen.** Niet altijd gelijk verdeeld. De moodboards dicteren asymmetrie:

| Layout        | Kolommen   | Toepassing                              |
|---------------|------------|-----------------------------------------|
| Volledig      | 12         | Hero-secties, lege staten               |
| Tweederde     | 8 + 4      | Tabel + zijpaneel, content + metadata   |
| Asymmetrisch  | 3 + 9      | Label links, data rechts (factuurstijl) |
| Drieluik      | 4 + 4 + 4  | Statistiekkaarten, dashboardoverzicht   |

**Marges:**

| Context        | Waarde | Token              |
|----------------|--------|--------------------|
| Zijmarge       | 80px   | padding in `.dashboard-content` |
| Zijmarge mobiel| 24px   | `@media (max-width: 768px)`     |
| Kolomgap       | 24px   | `--space-element`  |

**Max-breedte:** 1200px. Alles daarbuiten is lucht. De content zweeft in het midden van het scherm — zoals een poster op een muur.

---

## III. Typografie

Drie families. Drie rollen. Geen uitzonderingen.

### De families

**Barlow Condensed 900** — het display-lettertype.
Titels, het logo, grote cijfers in statistiekkaarten. Gecondenseerd en zwaar, vult de breedte, dwingt aandacht af. Zoals "VAT100" bovenaan de factuur: 120px hoog, onmogelijk te missen.

```
CSS-variabele:  --font-display
Gewicht:        900 (alleen)
Toepassing:     titels, logo, hero-cijfers, section headers, lege staten
```

**Barlow 300 / 400 / 500** — het tekstlettertype.
Namen, adressen, navigatie, formuliertekst. Rustig, leesbaar, onopvallend. Het draagt informatie zonder aandacht op te eisen.

```
CSS-variabele:  --font-body
Gewichten:      300 (lichaam), 400 (normaal), 500 (labels)
Toepassing:     lopende tekst, klantnamen, navigatie-items, formuliervelden
```

**JetBrains Mono 300 / 400** — het datalettertype.
Bedragen, datums, factuurnummers, KVK-nummers, IBAN, BTW-nummers. Monospace omdat cijfers feiten zijn — ze moeten uitlijnen, vergelijkbaar zijn, onbetwistbaar.

```
CSS-variabele:  --font-mono
Gewichten:      300 (grote bedragen), 400 (tabeldata)
Toepassing:     alle numerieke data, alle referentienummers
Eigenschap:     font-variant-numeric: tabular-nums (altijd)
```

### De schaal

Van fluisteren tot schreeuwen. Geen tussenstappen.

```
DISPLAY                                          BODY              MONO
────────────────────────────────────────────     ──────────────    ──────────────
hero     12rem   Jaaromzet, paginatitel          lg   13px         lg   2rem
xl        6rem   Secundaire hero                 md   12px  ←─ basis   md   12px
lg      3.5rem   Paginakoppen                    sm   11px         sm   11px
md        2rem   Subkoppen, lege staten          xs    9px  ←─ labels
sm        1rem   Sectiekoppen
```

### Het label-systeem

De rode draad door het hele ontwerp. Overal waar classificatie nodig is:

```css
font-family:    var(--font-body)
font-size:      9px
font-weight:    500
letter-spacing: 0.08em
text-transform: uppercase
opacity:        0.4          /* standaard */
opacity:        0.6          /* .label-strong variant */
```

Tabelkoppen, formulierlabels, navigatie-items, kaartlabels, actieknoppen — allemaal dit systeem. Geen uitzondering.

### Letterspatiëring

| Token               | Waarde  | Gebruik                    |
|---------------------|---------|----------------------------|
| `--tracking-display`| 0.02em  | Display-koppen             |
| `--tracking-label`  | 0.08em  | Alle labels en micro-tekst |
| `--tracking-caps`   | 0.25em  | Volledig-kapitaal woorden  |

### Regelhoogte

| Context       | Waarde | Waarom                                      |
|---------------|--------|---------------------------------------------|
| Display hero  | 0.85   | Letters raken bijna — spanning, energie      |
| Display titel | 0.9    | Strak maar leesbaar                          |
| Sectiekop     | 1.0    | Eénregelig, geen ruimte nodig               |
| Lopende tekst | 1.5    | Ademruimte voor leesbaarheid                |
| Mono data     | 1.0    | Cijfers staan op één lijn                   |

---

## IV. Kleur

Twee kleuren. Punt.

```
Voorgrond:   #0D0D0B    var(--foreground)    bijna-zwart
Achtergrond: #FAFAF8    var(--background)    gebroken wit
```

Geen grijs. Geen blauw. Geen rood voor fouten. Geen groen voor succes.
Hiërarchie ontstaat uitsluitend door **opacity**:

```
1.0  ████████████  Primaire tekst, koppen, actieve elementen
0.6  ██████░░░░░░  Versterkte labels (.label-strong)
0.5  █████░░░░░░░  Focus-borders op invoervelden
0.4  ████░░░░░░░░  Standaard labels, navigatie
0.3  ███░░░░░░░░░  Tertiaire tekst, detail-labels
0.15 █░░░░░░░░░░░  Sectiescheidingen (border-rule)
0.12 █░░░░░░░░░░░  Standaard borders, invoerlijnen
0.08 ░░░░░░░░░░░░  Selectie-achtergrond, navigatieborder
0.012░░░░░░░░░░░░  Tabelrij-hover (nauwelijks zichtbaar)
```

**Selectie:** `rgba(13, 13, 11, 0.08)` — een vleugje inkt op het papier.

---

## V. Grenzen

Elke lijn in dit systeem volgt drie regels:

1. **Dikte: 0.5px** — haarlijn, zoals een liniaal op papier
2. **Kleur: altijd rgba** — nooit hex, nooit `solid`, nooit een named color
3. **Radius: 0px** — overal, zonder uitzondering, afgedwongen met `!important`

### Border-tokens

| Token                  | Definitie                              | Gebruik                     |
|------------------------|----------------------------------------|-----------------------------|
| `--border-light`       | `0.5px solid rgba(13,13,11, 0.12)`     | Standaard scheidingslijnen  |
| `--border-dark`        | `0.5px solid rgba(255,255,255, 0.10)`  | Op donkere achtergronden    |
| `--border-rule`        | `0.5px solid rgba(13,13,11, 0.15)`     | Editoriale scheidingslijnen |
| `--border-input`       | `0.5px solid rgba(13,13,11, 0.12)`     | Invoervelden (rust)         |
| `--border-input-focus` | `0.5px solid rgba(13,13,11, 0.5)`      | Invoervelden (focus)        |

### Toepassingspatronen

**Tabelrijen:** `0.5px solid rgba(13,13,11, 0.06)` — bijna onzichtbaar, net genoeg om rijen te scheiden.

**Tabelkoppen:** `0.5px solid rgba(13,13,11, 0.15)` — iets sterker, markeert de grens tussen kop en data.

**Formulieren:** Alleen een onderlijn (`border-bottom`). Geen kaders, geen zijlijnen. Het veld is een lijn waarop je schrijft — zoals een notitieboek.

**Navigatie:** `0.5px solid rgba(13,13,11, 0.08)` — fluisterdun, scheidt de nav van de content zonder op te vallen.

---

## VI. Witruimte

Witruimte is het krachtigste ontwerpmiddel in dit systeem. Waar andere apps elke pixel vullen, laat VAT100 bewust lucht. Zoals de AAWU-site: het getal 10.000+ staat in een zee van niets. Dat niets geeft het getal gewicht.

### Spacing-tokens

| Token             | Waarde | Rol                                      |
|-------------------|--------|------------------------------------------|
| `--space-hero`    | 120px  | Tussen paginasecties — de grote adem     |
| `--space-section` | 96px   | Tussen inhoudelijke blokken              |
| `--space-block`   | 48px   | Binnen secties, tussen groepen           |
| `--space-element` | 24px   | Tussen individuele componenten           |

### Verticaal ritme

```
┌─ Navigatie (72px hoog) ─────────────────────────┐
│                                                   │
├─ 80px padding-top ────────────────────────────────┤
│                                                   │
│  PAGINAKOP (display)                              │
│                                                   │
├─ 80px (page-header margin-bottom) ────────────────┤
│                                                   │
│  ┌─ Sectie ──────────────────────────────────┐    │
│  │  SECTIEKOP                                │    │
│  │  24px                                     │    │
│  │  [Content]                                │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
├─ 96px (--space-section) ──────────────────────────┤
│                                                   │
│  ┌─ Volgende sectie ────────────────────────┐     │
│  │  ...                                      │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
├─ 80px padding-bottom ─────────────────────────────┤
└───────────────────────────────────────────────────┘
```

---

## VII. Componenten

### Knoppen

Twee stijlen. Geen varianten, geen maten, geen kleurtjes.

**Primair** — voor de hoofdactie:
```
Achtergrond:     var(--foreground)        zwart
Tekst:           var(--background)        wit
Padding:         16px 32px
Typografie:      label-systeem (9px, uppercase, 500, 0.10em)
Border:          geen
Hover:           opacity 0.85
Disabled:        opacity 0.4
```

**Ghost** — voor secondaire acties:
```
Achtergrond:     transparant
Tekst:           var(--foreground)        zwart
Padding:         14px 28px
Typografie:      label-systeem (9px, uppercase, 500, 0.10em)
Border:          0.5px solid rgba(13,13,11, 0.25)
Hover:           opacity 0.85
Disabled:        opacity 0.4
```

### Formulieren

Invoervelden zijn lijnen, geen vakken. Zoals een formulier op papier: je schrijft op de lijn.

```
Padding:         14px 0
Border:          alleen border-bottom (--border-input)
Achtergrond:     transparant
Font:            var(--font-body), 13px, gewicht 300
Focus:           border-color rgba(13,13,11, 0.5)
Transitie:       border-color 0.2s ease
```

**Veldgroep:** Label (label-systeem) boven het veld, 8px tussenruimte, 16px margin-bottom.

### Tabellen

Geïnspireerd door de Saint-menukaart en de Lemaire-factuur: regels scheiden, niet omkaderen.

```
Koptekst:        label-systeem (9px uppercase), opacity 0.3
                 padding: 16px verticaal
                 border-bottom: 0.5px rgba(13,13,11, 0.15)

Datarij:         font-weight 300
                 padding: 16px verticaal
                 border-bottom: 0.5px rgba(13,13,11, 0.06)

Bedragen:        var(--font-mono), tabular-nums, rechts uitgelijnd

Rij-hover:       background rgba(13,13,11, 0.012)

Rij-acties:      label-systeem, opacity-transitie op hover
```

### Statistiekkaarten

De grote getallen uit de AAWU-site, vertaald naar een dashboardcontext:

```
Padding:         36px top, 28px bottom
Label:           label-systeem (opacity 0.4)
Waarde:          var(--font-mono), 2rem, gewicht 300, tabular-nums
Subtekst:        var(--font-body), 11px, opacity 0.3
Grid:            3 kolommen (desktop), 2 (tablet), 1 (mobiel)
Gap:             var(--space-element)
```

### Lege staten

Wanneer er geen data is, spreekt de typografie zacht:

```
Font:            var(--font-display), 2rem, gewicht 900
Opacity:         0.08
Padding:         var(--space-block) 0
```

Bijna onzichtbaar. Een fluistering die zegt: hier komt iets.

### Navigatie

Plakkerig, minimaal, een dunne lijn die de bovenkant van de pagina markeert:

```
Hoogte:          72px
Positie:         sticky top
Achtergrond:     var(--background)
Border-bottom:   0.5px solid rgba(13,13,11, 0.08)
Padding:         0 80px
Z-index:         1000

Links:           label-systeem, hover opacity 0.6
Actieve link:    border-bottom als markering
Ruimte:          36px tussen items
```

---

## VIII. Beweging

Subtiel. Functioneel. Nooit decoratief.

| Element          | Eigenschap         | Duur    | Easing |
|------------------|--------------------|---------|--------|
| Knoppen          | opacity            | 0.15s   | ease   |
| Invoervelden     | border-color       | 0.2s    | ease   |
| Tabelrijen       | background         | 0.15s   | ease   |
| Pagina-laden     | opacity + translateY(4px) | 0.3s | ease |
| Skeleton pulse   | opacity 0.08↔0.2  | 1.5s    | ease-in-out, infinite |

Geen transforms behalve de initiële fade-in. Geen spring-animaties. Geen parallax. De interface verschijnt en reageert — meer niet.

---

## IX. Responsief

Twee breekpunten. Niet meer.

### ≤ 1024px (tablet)
- Statistiekkaarten: 3 → 2 kolommen

### ≤ 768px (mobiel)
- Navigatie: links verborgen, hamburger zichtbaar
- Zijmarges: 80px → 24px
- Display hero: 12rem → 5rem
- Display titel: 3.5rem → 2.5rem
- Statistiekkaarten: 2 → 1 kolom
- BTW-banner: kolom-layout, gecentreerd

---

## X. Verboden

Dit is geen suggestie. Dit zijn absolute regels.

| Verbod                     | Waarom                                             |
|----------------------------|----------------------------------------------------|
| `border-radius` > 0       | Gedrukt materiaal heeft scherpe hoeken             |
| `box-shadow`               | Schaduwen bestaan niet op papier                   |
| `text-shadow`              | Inkt maakt geen schaduw                            |
| `gradient`                 | Eén kleur. Niet anderhalve                         |
| Kleuraccenten              | Hiërarchie door gewicht en transparantie           |
| Dark mode                  | Papier is licht. Altijd                            |
| Emoji in UI                | Typografie, geen pictogrammen                      |
| Font-weight 200/600/700/800| Alleen 300, 400, 500, 900                          |
| Grijstinten als hex        | Gebruik rgba van de voorgrondkleur                 |
| `solid` borderkleur        | Altijd rgba met opacity                            |
| Afgeronde afbeeldingen     | `border-radius: 0 !important` geldt overal         |

---

## XI. CSS Token-referentie

Alle tokens staan in `styles/globals.css`. Hier het volledige overzicht:

```css
/* Basis */
--u: 8px;
--col: 12;

/* Kleuren */
--color-black: #0D0D0B;
--color-white: #FAFAF8;
--foreground: var(--color-black);
--background: var(--color-white);

/* Borders */
--border-light: 0.5px solid rgba(13, 13, 11, 0.12);
--border-dark: 0.5px solid rgba(255, 255, 255, 0.10);
--border-rule: 0.5px solid rgba(13, 13, 11, 0.15);
--border-input: 0.5px solid rgba(13, 13, 11, 0.12);
--border-input-focus: 0.5px solid rgba(13, 13, 11, 0.5);

/* Display */
--text-display-hero: 12rem;
--text-display-xl: 6rem;
--text-display-lg: 3.5rem;
--text-display-md: 2rem;
--text-display-sm: 1rem;

/* Body */
--text-body-lg: 13px;
--text-body-md: 12px;
--text-body-sm: 11px;
--text-body-xs: 9px;

/* Mono */
--text-mono-lg: 2rem;
--text-mono-md: 12px;
--text-mono-sm: 11px;

/* Labels */
--text-label: 9px;

/* Spatiëring */
--tracking-display: 0.02em;
--tracking-label: 0.08em;
--tracking-caps: 0.25em;

/* Witruimte */
--space-hero: 120px;
--space-section: 96px;
--space-block: 48px;
--space-element: 24px;

/* Radius */
--radius: 0px;
```

---

*VAT100 — Gedrukt materiaal voor het scherm.*

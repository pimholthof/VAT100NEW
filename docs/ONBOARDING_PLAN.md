# VAT100 Onboarding Plan

> Een onboarding-ervaring die past bij het "Luminous Conceptualism" design systeem:
> minimaal, doelgericht, en met de precisie van een fiscaal instrument.

---

## 1. Analyse: Huidige Staat

### Wat er al is
| Onderdeel | Status | Locatie |
|-----------|--------|---------|
| Registratie (email + wachtwoord) | ✓ Actief | `/register` |
| 3-stappen setup (KVK, Adres, Bank) | ✓ Actief | `/onboarding` |
| Abonnementskeuze | ✓ Bestaat, los van flow | `/abonnement` |
| WelcomeBanner (3 taken) | ✓ Actief | Dashboard |
| Empty states per module | ✓ Actief | Diverse pagina's |

### Wat er mist
| Gap | Impact |
|-----|--------|
| Geen boekjaar/startdatum setup | Gebruiker weet niet wanneer data begint |
| Geen import vanuit ander boekhoudprogramma | Hoge drempel voor switchers |
| Geen bankconnectie in onboarding | Belangrijkste "aha-moment" wordt gemist |
| Geen factuuurtemplate keuze | Eerste factuur voelt generiek |
| Geen BTW-aangifte frequentie instelling | Systeem kan geen deadlines berekenen |
| Geen contextual tour/tooltips | Gebruiker moet zelf ontdekken |
| Geen progress tracking (persistent) | WelcomeBanner dismissed = weg |
| Abonnement niet geïntegreerd in flow | Gebruiker kan vastlopen |
| Geen "time to value" optimalisatie | Te veel stappen voor eerste succes |

---

## 2. Onboarding Filosofie

### Kernprincipe: "Eén factuur in 5 minuten"

De onboarding is geslaagd wanneer een nieuwe gebruiker binnen 5 minuten na registratie:
1. Zijn bedrijfsgegevens heeft ingevuld
2. Zijn eerste factuur heeft verstuurd

Alles wat dit pad vertraagt, wordt uitgesteld. Alles wat dit pad versnelt, wordt geprioriteerd.

### Drie pijlers

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   1. VERPLICHT MINIMUM                              │
│      Alleen wat nodig is om te starten              │
│      → KVK, BTW, Adres, IBAN                        │
│                                                     │
│   2. GUIDED FIRST ACTIONS                           │
│      Begeleid de eerste waarde-creërende acties      │
│      → Eerste klant + Eerste factuur                 │
│                                                     │
│   3. PROGRESSIEVE VERDIEPING                        │
│      Ontgrendel features wanneer relevant            │
│      → Bank, Bonnen, BTW, Import                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 3. De Nieuwe Onboarding Flow

### Fase 0: Registratie (bestaand, minimale aanpassing)

```
/register → Email + Wachtwoord + Naam + Studionaam
```

**Geen wijziging nodig.** De registratie is al minimaal en effectief.

---

### Fase 1: Bedrijfsprofiel Setup (herwerkt `/onboarding`)

**Doel:** Verzamel het minimum dat nodig is voor een geldige factuur.

#### Stap 1: Bedrijfsgegevens
```
┌──────────────────────────────────────┐
│  KVK-nummer        [________]        │
│  BTW-nummer         [________]       │
│                                      │
│  → Auto-fill via KVK API             │
│    (naam, adres, rechtsvorm)         │
└──────────────────────────────────────┘
```

**Verbetering:** KVK-nummer invoeren → automatisch bedrijfsnaam, adres, en rechtsvorm ophalen via de [KVK Handelsregister API](https://developers.kvk.nl/). Dit elimineert Stap 2 (adres) voor de meeste gebruikers.

#### Stap 2: Adres (alleen als KVK lookup faalt)
```
Als auto-fill mislukt → handmatig invullen
Straat + Nummer, Postcode, Plaats
```

#### Stap 3: Bankgegevens
```
┌──────────────────────────────────────┐
│  IBAN              [________________]│
│  BIC               [________]       │
│                                      │
│  ○ Of: Koppel je bank automatisch    │
│    → Tink open banking flow          │
│                                      │
│  [ Later instellen ]                 │
└──────────────────────────────────────┘
```

**Verbetering:** Bied directe Tink-connectie aan als alternatief voor handmatige IBAN-invoer. "Later instellen" link voor gebruikers die willen verkennen eerst.

#### Stap 4: Fiscaal profiel (NIEUW)
```
┌──────────────────────────────────────┐
│  BTW-aangifte frequentie:            │
│  ● Per kwartaal (meest voorkomend)   │
│  ○ Per maand                         │
│  ○ Per jaar                          │
│                                      │
│  Boekjaar start:                     │
│  [01] / [01] (dd/mm)                 │
│  → Default: 1 januari               │
│                                      │
│  Start met VAT100 vanaf:             │
│  ● Begin huidig boekjaar (2026)     │
│  ○ Vandaag                           │
│  ○ Aangepaste datum                  │
└──────────────────────────────────────┘
```

**Waarom:** Zonder BTW-frequentie kan het systeem geen deadlines berekenen. Zonder startdatum weet het systeem niet welke transacties relevant zijn.

---

### Fase 2: Abonnementskeuze (herpositionering)

```
/onboarding → /abonnement (na bedrijfsprofiel)
```

**Verplaats** abonnementskeuze direct na de bedrijfssetup, vóór het dashboard. Dit voorkomt dat gebruikers in een "limbo" terechtkomen.

**Toevoeging:** 14-dagen gratis proefperiode prominent tonen. Geen creditcard nodig om te starten.

---

### Fase 3: Eerste Waarde — "Quick Win" Flow (NIEUW)

Na het eerste inloggen op het dashboard verschijnt een **full-screen welkomstervaring** (niet een banner, maar een modale flow die de gebruiker door zijn eerste actie leidt).

#### Optie A: "Stuur je eerste factuur"
```
┌─────────────────────────────────────────────┐
│                                             │
│   Klaar om te factureren?                   │
│                                             │
│   VAT100 is gebouwd om factureren           │
│   zo eenvoudig mogelijk te maken.           │
│                                             │
│   [ Maak je eerste factuur → ]              │
│                                             │
│   ┈┈ of ┈┈                                  │
│                                             │
│   ○ Importeer data uit ander programma      │
│   ○ Ik wil eerst rondkijken                 │
│                                             │
└─────────────────────────────────────────────┘
```

Als de gebruiker "Maak je eerste factuur" kiest, start een **inline begeleide flow**:

```
Stap 1: Aan wie? → Simplified client form (alleen naam + email)
Stap 2: Waarvoor? → Eén regel: omschrijving + bedrag
Stap 3: Controleer → Preview met gekozen template
Stap 4: Verstuur → Email of download PDF
```

**Waarom dit werkt:** De gebruiker ervaart direct de kernwaarde van het product. In boekhoudprogramma's als FreshBooks en Wave is "eerste factuur versturen" de #1 indicator voor retentie.

#### Optie B: "Importeer je data"
Voor switchers van andere boekhoudsoftware:

```
┌─────────────────────────────────────────────┐
│                                             │
│   Importeer vanuit:                         │
│                                             │
│   [ ] Moneybird                             │
│   [ ] e-Boekhouden                          │
│   [ ] Excel / CSV                           │
│   [ ] Handmatig beginnen                    │
│                                             │
│   Wat wil je importeren?                    │
│   ☑ Klanten                                 │
│   ☑ Openstaande facturen                    │
│   ☐ Historische facturen                    │
│   ☐ Bonnen                                  │
│                                             │
└─────────────────────────────────────────────┘
```

#### Optie C: "Eerst rondkijken"
→ Ga direct naar dashboard met verbeterde WelcomeBanner (zie Fase 4).

---

### Fase 4: Progressieve Onboarding (Dashboard)

Vervang de huidige `WelcomeBanner` door een **persistent onboarding checklist** die:
- Niet te dismissen is tot minstens 3/6 taken voltooid
- Progress opslaat in de database (niet in lokale state)
- Contextueel relevant is (toont volgende logische stap)

#### Checklist items (6 stappen)

```
┌─────────────────────────────────────────────┐
│  Je VAT100 setup               3 van 6      │
│  ━━━━━━━━━━━━━━━━━━░░░░░░░░░░  50%         │
│                                             │
│  ✓ Bedrijfsgegevens ingevuld                │
│  ✓ Abonnement gekozen                       │
│  ✓ Eerste klant toegevoegd                  │
│  → Eerste factuur verstuurd                 │
│  ○ Bank gekoppeld                           │
│  ○ Eerste bon geüpload                      │
│                                             │
│  [ Volgende: Maak je eerste factuur → ]     │
│                                             │
└─────────────────────────────────────────────┘
```

**Technische implementatie:**
- Nieuw veld `onboarding_progress` (JSONB) in `profiles` tabel
- Server-side check bij elke dashboard load
- Automatische detectie van voltooide stappen (queries bestaande data)

---

## 4. Contextuele Begeleiding

### 4.1 Tooltips bij eerste bezoek

Bij het **eerste bezoek** aan elke module, toon een subtiele tooltip die de kernfunctie uitlegt:

| Module | Tooltip |
|--------|---------|
| Facturen | "Hier maak en verstuur je facturen. Tip: kies een template die bij je past." |
| Bonnen | "Upload een foto van je bon — VAT100 leest automatisch het bedrag en de BTW." |
| BTW | "Je BTW-deadlines en berekeningen op één plek. VAT100 herinnert je op tijd." |
| Bank | "Koppel je bankrekening om transacties automatisch te matchen." |
| Rapporten | "Overzichten voor je belastingaangifte, klaar voor je boekhouder." |

**Implementatie:** `first_visit_flags` (JSONB) in `profiles` — per module een boolean.

### 4.2 Empty State Verrijking

De bestaande `EmptyState` component uitbreiden met:

```tsx
// Huidige state:
<EmptyState title="Geen facturen" action="Nieuwe factuur" />

// Nieuwe state:
<EmptyState
  title="Geen facturen"
  action="Nieuwe factuur"
  tip="Je eerste factuur is in 2 minuten klaar"
  videoUrl="/guides/eerste-factuur"  // optioneel
  benefit="Factureren → sneller betaald worden"
/>
```

---

## 5. Re-engagement & Terugkerende Gebruikers

### 5.1 Inactieve gebruiker nudges

Na **7 dagen inactiviteit**, stuur een email:
```
Onderwerp: Je administratie wacht op je

Hey {naam},

Je hebt al {X} dagen geen bonnen geüpload.
Tip: fotografeer bonnen direct na aankoop — 
VAT100 verwerkt ze automatisch.

[Open VAT100 →]
```

### 5.2 Fiscale deadline reminders

Proactieve meldingen vóór BTW-deadlines:
```
┌─────────────────────────────────────────────┐
│  ⚡ BTW-deadline over 14 dagen              │
│                                             │
│  Q1 2026: €2.340 af te dragen              │
│  Nog 3 bonnen niet gecategoriseerd          │
│                                             │
│  [ Bereid aangifte voor → ]                 │
└─────────────────────────────────────────────┘
```

---

## 6. Technisch Implementatieplan

### Database wijzigingen

```sql
-- Onboarding progress tracking
ALTER TABLE profiles ADD COLUMN onboarding_progress JSONB DEFAULT '{
  "company_setup": false,
  "subscription_chosen": false,
  "first_client": false,
  "first_invoice": false,
  "bank_connected": false,
  "first_receipt": false
}'::jsonb;

-- First-visit tooltips tracking
ALTER TABLE profiles ADD COLUMN first_visit_flags JSONB DEFAULT '{
  "dashboard": false,
  "invoices": false,
  "receipts": false,
  "tax": false,
  "bank": false,
  "reports": false
}'::jsonb;

-- Onboarding started/completed timestamps
ALTER TABLE profiles ADD COLUMN onboarding_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- BTW frequency (needed for deadline calculations)
ALTER TABLE profiles ADD COLUMN vat_frequency TEXT DEFAULT 'quarterly'
  CHECK (vat_frequency IN ('monthly', 'quarterly', 'yearly'));

-- Fiscal year start
ALTER TABLE profiles ADD COLUMN fiscal_year_start_month INT DEFAULT 1;
ALTER TABLE profiles ADD COLUMN bookkeeping_start_date DATE;
```

### Nieuwe componenten

```
features/onboarding/
├── components/
│   ├── OnboardingChecklist.tsx      # Persistent dashboard checklist
│   ├── QuickWinModal.tsx            # Eerste-factuur flow
│   ├── ImportWizard.tsx             # Data import vanuit andere software
│   ├── FiscalProfileStep.tsx        # BTW-frequentie + boekjaar setup
│   ├── KvkLookup.tsx               # KVK API auto-fill
│   └── FirstVisitTooltip.tsx        # Contextuele tooltips
├── actions.ts                       # Server actions voor onboarding state
├── hooks/
│   └── useOnboardingProgress.ts     # Client-side progress hook
└── lib/
    └── kvk-api.ts                   # KVK Handelsregister integratie
```

### Prioriteit & Fasering

#### Sprint 1: Fundament (Week 1-2)
| # | Taak | Complexiteit |
|---|------|-------------|
| 1 | `onboarding_progress` JSONB + migration | Laag |
| 2 | `OnboardingChecklist` component (vervangt WelcomeBanner) | Middel |
| 3 | Persistent progress tracking (server-side) | Middel |
| 4 | Fiscaal profiel stap toevoegen aan `/onboarding` | Laag |

#### Sprint 2: Quick Win Flow (Week 3-4)
| # | Taak | Complexiteit |
|---|------|-------------|
| 5 | `QuickWinModal` — welkomst na eerste login | Middel |
| 6 | Simplified eerste-factuur flow (inline) | Hoog |
| 7 | Abonnement integreren in onboarding flow | Middel |
| 8 | Empty state verrijking met tips | Laag |

#### Sprint 3: Verdieping (Week 5-6)
| # | Taak | Complexiteit |
|---|------|-------------|
| 9 | KVK API integratie (auto-fill) | Middel |
| 10 | First-visit tooltips systeem | Middel |
| 11 | Import wizard (CSV/Excel basis) | Hoog |
| 12 | Tink bank-connectie in onboarding | Middel |

#### Sprint 4: Engagement (Week 7-8)
| # | Taak | Complexiteit |
|---|------|-------------|
| 13 | Inactiviteits-emails (Resend) | Middel |
| 14 | BTW-deadline onboarding nudges | Laag |
| 15 | Onboarding analytics (completion rates) | Middel |
| 16 | A/B test framework voor onboarding varianten | Hoog |

---

## 7. Metrics & Succes Criteria

### Primary KPIs
| Metric | Huidige staat | Doel |
|--------|--------------|------|
| Registratie → Eerste factuur | Onbekend | < 5 minuten |
| Onboarding completion rate | Onbekend | > 80% |
| Day-1 retention | Onbekend | > 60% |
| Day-7 retention | Onbekend | > 40% |
| Week-1 facturen verstuurd | Onbekend | > 1 per gebruiker |

### Tracking events
```typescript
// Te implementeren analytics events
'onboarding_started'
'onboarding_step_completed' // { step: string }
'onboarding_completed'      // { duration_seconds: number }
'onboarding_abandoned'      // { last_step: string }
'first_client_created'
'first_invoice_sent'
'first_receipt_uploaded'
'bank_connected'
'quick_win_flow_started'
'quick_win_flow_completed'
'import_wizard_started'
'import_wizard_completed'   // { source: string, records: number }
```

---

## 8. Design Principes (Luminous Conceptualism)

De onboarding moet het design-DNA van VAT100 weerspiegelen:

1. **Rams: "Zo weinig design als mogelijk"**
   - Geen decoratieve elementen in de onboarding
   - Elke stap heeft één duidelijke actie
   - Witruimte als primair design-element

2. **Ive: "Precision in every detail"**
   - Strakke 0.5px borders, subtiele animaties
   - Formulieren die "verdwijnen" als je ze invult (progressive disclosure)
   - Micro-interacties: checkmark animatie bij voltooide stap

3. **Judd: "Geometric clarity"**
   - Grid-gebaseerde layout, mathematische verhoudingen
   - Progress bar als architecturaal element
   - Checklist als visuele sculptuur

4. **Turrell: "Atmospheric light"**
   - Subtiel glaseffect op de checklist card
   - Lichtovergang van stap naar stap
   - Focus-state als "lichtbron" op het actieve veld

---

## 9. Samenvatting

```
REGISTRATIE ──→ BEDRIJFSPROFIEL ──→ ABONNEMENT ──→ DASHBOARD
                (KVK auto-fill)    (14d gratis)    │
                (Fiscaal profiel)                   │
                (Bank optioneel)                    ▼
                                              ┌──────────┐
                                              │ KEUZE:   │
                                              │          │
                                              │ A) Quick │
                                              │    Win   │
                                              │    Flow  │
                                              │          │
                                              │ B) Import│
                                              │    Data  │
                                              │          │
                                              │ C) Rond- │
                                              │    kijken│
                                              └────┬─────┘
                                                   │
                                                   ▼
                                         PROGRESSIEVE CHECKLIST
                                         (6 stappen, persistent)
                                                   │
                                                   ▼
                                         CONTEXTUELE TOOLTIPS
                                         (bij eerste module-bezoek)
                                                   │
                                                   ▼
                                         RE-ENGAGEMENT EMAILS
                                         (bij inactiviteit)
```

Dit plan transformeert de onboarding van een "formulier invullen" naar een **begeleid pad naar de eerste factuur** — de kernbelofte van VAT100.

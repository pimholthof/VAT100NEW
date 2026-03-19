# VAT100 — CLAUDE.md

## Wat is dit?
VAT100 is een boekhoudplatform dat de volledige boekhouding vervangt voor Nederlandse ZZP'ers met een eenmanszaak. Geen boekhoudkennis vereist. De gebruiker hoeft nooit een boekhoudterm te begrijpen — alleen de uitkomsten ervan.

Kernvraag die VAT100 elke dag beantwoordt:
"Hoeveel van het geld op mijn rekening is echt van mij?"

## Stack
* Framework: Next.js 15 (App Router, Server Components, Server Actions)
* UI: React 19, Tailwind CSS 4
* Database: Supabase (PostgreSQL + RLS + Auth)
* State: Zustand (client), TanStack Query v5 (server state)
* Validatie: Zod v4
* PDF: @react-pdf/renderer
* Email: Resend
* Banking: GoCardless (Open Banking) — toekomstige integratie
* AI: Anthropic SDK — voor bon-herkenning (receipts)
* Testing: Vitest + Playwright

## Design systeem: Editorial Brutalism

### Filosofie
Functie dicteert vorm. Elk UI-element lost een fiscaal probleem op of het bestaat niet. Geen decoratie, geen glasmorphism, geen ambient effecten.

### Typografie
* Interface: 'Syne', sans-serif — display, headings, navigatie
* Cijfers & data: 'JetBrains Mono', monospace — alle getallen, bedragen, datums, codes
* Body: 'Inter', sans-serif — beschrijvende tekst, labels

### Kleurpalet (CSS variabelen)
```
--color-ink:      #0A0A0A;
--color-paper:    #F2F0EB;
--color-surface:  #FFFFFF;
--color-border:   #0A0A0A;
--color-muted:    #6B6B6B;
--color-safe:     #1C4F1C;
--color-reserved: #8B1A1A;
--color-warning:  #7A5C00;
```

### Spacing & borders
* 8px base grid
* Borders: 0.5px solid var(--color-border)
* Geen border-radius tenzij expliciet anders gevraagd
* Micro-labels: 9px, uppercase, letter-spacing 0.12em

### Verboden
* Geen glasmorphism of backdrop-filter
* Geen framer-motion (verwijder de dependency volledig)
* Geen ambient geluiden
* Geen border-radius > 2px
* Geen gekleurde gradients
* Geen shadows anders dan flat/brutalist (1px 1px 0px var(--color-border))
* Geen Geist font

## Architectuur
```
app/
  (auth)/
    login/
    register/
    onboarding/
  (dashboard)/
    dashboard/
    facturen/
    kosten/
    reservering/
    aangifte/
    instellingen/
  api/
    invoice/[id]/pdf/
    webhooks/
    cron/

lib/
  actions/          Server Actions per module
  tax/              Belastingberekening (pure functies, getest)
  format.ts         Currency, datum, percentage
  types/            Gedeelde TypeScript types
  supabase/         Client + server instances
  validation/       Zod schemas

components/
  ui/               Primitives: Button, Input, Badge, Table, etc.
  facturen/
  kosten/
  dashboard/
  layout/
```

### Serverside-first
* Default: Server Components
* "use client" alleen voor interactieve forms en lokale state
* Server Actions in lib/actions/ — nooit inline in componenten
* Altijd Zod validatie in Server Actions voor DB-toegang

## Modules

### 1. Facturen
Aanmaken, versturen (Resend), PDF-output, betaalstatus bijhouden. Per factuur altijd zichtbaar: netto, BTW, belastingreservering, vrij te besteden. Statussen: draft → verzonden → betaald | te_laat

### 2. Kosten
Bon uploaden of handmatig. AI-herkenning via Anthropic. Vaste categorieën: Software, Hardware, Kantoor, Reizen, Marketing, Eten & Drinken, Overig. BTW op kosten = automatisch voorbelasting.

### 3. Reserveringspot
* BTW-pot: output-BTW − input-BTW per kwartaal
* IB-pot: opgebouwde belastingreservering
Altijd visueel gescheiden van vrij saldo.

### 4. Dashboard
Drie getallen: ontvangen, gereserveerd, vrij te besteden. Plus: openstaande facturen + volgende BTW-deadline.

### 5. Aangifte-export
Kwartaal: BTW-overzicht als PDF/Excel. Jaar: winst-en-verliesoverzicht voor IB-aangifte. Later: XML voor Belastingdienst.

## Belastingberekening (lib/tax/)

### IB-schijven 2025
```
€0       – €38.441   → 35,82%
€38.441  – €76.817   → 37,48%
€76.817+             → 49,50%
```

### Aftrekposten
* Zelfstandigenaftrek: €7.390 (aan/uit per gebruiker)
* MKB-winstvrijstelling: 13,31% van winst na zelfstandigenaftrek
* Heffingskorting: max €3.362 (afbouw boven €24.814)

### Prorata per factuur
```
belasting_reservering = (factuur_netto / jaar_netto) × geschatte_IB
kosten_aandeel        = (factuur_netto / jaar_netto) × jaarlijkse_kosten
vrij                  = factuur_netto − btw − belasting_reservering − kosten_aandeel
```

## Database

### Bestaande tabellen — NIET wijzigen
profiles, clients, invoices, invoice_lines, receipts

### Nieuwe migratie (015_rebuild_additions.sql)
```sql
-- Belastingprofiel op profiles
alter table profiles
  add column if not exists expected_annual_revenue numeric(10,2) default 60000,
  add column if not exists zelfstandigenaftrek boolean default true,
  add column if not exists monthly_fixed_costs numeric(10,2) default 0,
  add column if not exists btw_period text default 'kwartaal';

-- BTW-aangiftes
create table if not exists vat_returns (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  output_vat   numeric(10,2) not null default 0,
  input_vat    numeric(10,2) not null default 0,
  vat_due      numeric(10,2) not null default 0,
  status       text not null default 'concept'
               check (status in ('concept', 'ingediend', 'betaald')),
  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Belastingreserveringen per betaling
create table if not exists tax_reservations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  invoice_id   uuid references invoices(id) on delete set null,
  period       text not null,
  vat_reserved numeric(10,2) not null default 0,
  ib_reserved  numeric(10,2) not null default 0,
  created_at   timestamptz not null default now()
);

alter table vat_returns enable row level security;
alter table tax_reservations enable row level security;

create policy "eigen vat_returns" on vat_returns
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigen tax_reservations" on tax_reservations
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## Regels voor Claude Code
1. `npm run build` moet altijd slagen na elke wijziging
2. Alle UI-tekst in het Nederlands
3. Geen inline styles — Tailwind of CSS variabelen
4. Server Actions in lib/actions/ — nooit inline
5. Zod validatie in elke Server Action die DB aanraakt
6. Geen `any` types — strikte TypeScript
7. Geen nieuwe dependencies zonder expliciete goedkeuring
8. framer-motion volledig verwijderen
9. JetBrains Mono voor alle getallen: class `font-mono`
10. Micro-labels: `text-[9px] uppercase tracking-[0.12em]`

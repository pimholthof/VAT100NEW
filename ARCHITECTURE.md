# VAT100 — Systeemarchitectuur

> Dit document beschrijft het systeem, het veiligheidsmodel voor autonomie, de
> bekende fiscale divergenties (met de migraties die ze oplossen) en de
> roadmap. Doel: **toekomstbestendig en foutloos** — één bron van waarheid,
> begrensde autonomie, alles verifieerbaar.

## 1. Het product — twee kernen, één belofte

> **"Altijd weten wat van jou is."**

VAT100 doet twee dingen onverslaanbaar:

1. **Mooie facturen maken** — Essential Math: ontvanger + bedrag → een mooie
   factuur die betaald kan worden.
2. **Realtime weten hoeveel belasting je betaalt en wat van jou is** — elke
   factuur verandert direct je fiscale werkelijkheid.

Het zijn geen losse features maar **input en output van één beweging**: de
factuur is de input, "wat is van mij" de output.

## 2. Het systeem — De Drie Potten

Elke euro op je rekening staat in precies één van drie toestanden:

| Pot | Bron | Kleur |
|-----|------|-------|
| 🔵 **Van de Belastingdienst** | BTW die je bewaart (`estimatedVat`) | `--color-info` |
| 🟠 **Gereserveerd** | inkomstenbelasting (`estimatedIncomeTax`) | `--color-warning` |
| ⚫ **Van jou** | veilig te besteden (`safeToSpend`) | `--foreground` |

De gebruiker beheert dit nooit — het wordt live berekend. Surfaces:

- **Nu** (`/dashboard`) — het getal *Van jou*, de Drie Potten (`AllocationBar`),
  en **Nu doen** (Predictive Calm: de eerstvolgende dingen die ertoe doen).
- **Factureren** (`/dashboard/invoices`) — de factuur + het live waarheid-paneel
  (`InvoiceTruthPanel`).
- **Belasting** (`/dashboard/tax`) — de aangifte, met één-tap "BTW betalen".

Alles daarbuiten leeft in "Meer" en in de stille achtergrond-agents.

## 3. De autonome motor (zelf-draaiend)

```
SENSOREN        → bank (Tink), bonnen (OCR), facturen, mail
   ↓
CLASSIFICEREN   → regels eerst, AI bij twijfel
   ↓
VERTROUWENSPOORT→ hoog → handel autonoom · laag → één kaart in "Nu doen"
   ↓
CONTROLEREN     → continue invarianten (lib/logic/self-checks.ts)
   ↓
CORRIGEREN      → auto-fix waar veilig, anders 1-tik voorstel
   ↓
LEREN           → bevestigde correcties worden regels
```

De **controle-laag** (`lib/logic/self-checks.ts`, `runSelfChecks`) is het brein
van zelf-controle/-correctie: puur, deterministisch, getest. Voedt zowel "Nu
doen" (alleen bij twijfel/risico) als de admin-controletoren.

## 4. Veiligheidsmodel — zo werkt autonomie veilig

### 4.1 Autonomie schaalt omgekeerd met blast-radius
Elke geautomatiseerde actie krijgt een **tier**:

| Tier | Aard | Voorbeelden | Autonomie |
|------|------|-------------|-----------|
| **0** | Lezen/afleiden, geen side-effect | reserve, projectie, controles | Altijd autonoom |
| **1** | Omkeerbare interne staat | overdue markeren, betaling↔factuur matchen, *concept* aangifte | Autonoom + gelogd + undo |
| **2** | Naar buiten, herstelbaar | herinneringsmail, auto-categoriseren | Alleen bij hoge confidence + melding + undo, anders voorstel |
| **3** | Onomkeerbaar / hoge inzet | aangifte *indienen*, factuur *versturen*, belasting betalen/vastleggen, kaart belasten | **Nooit autonoom** — systeem bereidt voor, mens bevestigt |

**Regel:** het systeem doet alles tót de onomkeerbare stap en geeft de mens dan
één heldere beslissing.

### 4.2 Verdere principes
- **Confidence-poort** met expliciete drempels; nooit handelen op lage zekerheid.
- **Invarianten als vangrail:** `runSelfChecks` draait als pre- én post-conditie
  rond elke mutatie; breekt een invariant → blokkeren en escaleren.
- **Alles gelogd, toewijsbaar, omkeerbaar** (`audit_log`, `ledger`,
  `action_feed`): wie/wat/waarom/wanneer + undo-handle.
- **Schaduwmodus + noodstop + idempotentie** (feature-flags; exactly-once op
  stabiele ID's).
- **Faal veilig, nooit stil**; **nooit fiscale data verzinnen** (bv. geen
  betalingskenmerk fabriceren).
- **De mens blijft principaal** — begrensde bevoegdheid, altijd overrulebaar.

## 5. Één bron van fiscale waarheid

Foutloze autonomie kan alleen zo correct zijn als de wiskunde eronder. Daarom
geldt: **elk fiscaal getal heeft precies één implementatie.**

| Domein | Canonieke module |
|--------|------------------|
| Factuur-/regelbedragen, BTW, totaal | `lib/logic/invoice-calculations.ts` |
| Per-factuur waarheid (BTW / IB-reservering / van jou) | `lib/logic/fiscal-truth.ts` |
| BTW-rubrieken (officiële aangifte) | `lib/tax/btw-rubrieken.ts` |
| Aangifte-rij voor `vat_returns` | `lib/tax/vat-return-row.ts` (adapter op btw-rubrieken) |
| Inkomstenbelasting (Box 1, kortingen, KIA, afschrijving) | `lib/tax/dutch-tax-2026.ts` |
| Reservering / safe-to-spend | `lib/logic/reserve.ts` (`computeReserve`) — gedeeld door dashboard + recalculator |
| BTW per kwartaal (jaarrekening) | `lib/tax/quarter-vat-stats.ts` (op btw-rubrieken) |
| Eerstvolgende acties | `lib/logic/next-actions.ts` |
| Controles/invarianten | `lib/logic/self-checks.ts` |

**Afronding:** overal `Math.round(v * 100) / 100` (centniveau). De aangifte rondt
5a en 5b elk af op hele euro's vóór aftrek (`rubriek5gAfgerond`).

## 6. Bekende divergenties & vereiste migraties

> Deze lijst is bewust expliciet. Wat hier staat is gesignaleerd, ingeperkt of
> gepland — niet stilletjes "opgelost" met een onverifieerbare gok.

### 6.1 ✅ Opgelost — BTW-aangifte herleid tot één bron
`generateVatReturn` en `previewVatReturn` (`features/tax/vat-returns-actions.ts`)
herimplementeerden de rubriek-logica los van de canonieke
`calculateBtwRubrieken()`, met een bug: de preview-`totaalBtw` telde alleen
1a+1b+1c. Beide draaien nu via `lib/tax/vat-return-row.ts` (`computeVatReturnRow`).
De bug is weg; opgeslagen waarden zijn identiek (zie 6.1a).

#### 6.1a ⏳ Migratie nodig — kolommen 1e & 3a
De `vat_returns`-tabel mist kolommen voor rubriek **1e** (0%/onbelast) en **3a**
(uitvoer buiten EU). De adapter vouwt nu `1e → 1c` en `3a → 4b` om opgeslagen
gedrag exact te behouden. Fiscaal horen ze in 1e/3a.
**Vervolg:** migratie die `rubriek_1e_*` en `rubriek_3a_*` toevoegt + PDF-/
Digipoort-mapping bijwerkt, met **fiscalist-akkoord**. Pas dán de adapter
ontvouwen.

### 6.2 ✅ Opgelost — safe-to-spend geünificeerd
Eén pure `computeReserve(input)` (`lib/logic/reserve.ts`) wordt nu gedeeld door
de recalculator (snapshot) én de dashboard-fallback. De fallback haalt
werkelijke jaarkosten + investeringen op (geen nul-kosten-optimisme meer), en
de `taxShieldPotential` gebruikt het werkelijke marginale tarief i.p.v. een
hardgecodeerde 0,3575 (en een voorbeeldinvestering bóven de KIA-drempel — de
oude €1.000 gaf altijd 0).

### 6.3 ✅ Opgelost — jaarrekening-BTW via de canonieke bron
`getJaarrekeningData` berekende BTW per kwartaal los; dat loopt nu via
`lib/tax/quarter-vat-stats.ts` (op `calculateBtwRubrieken`) — exact dezelfde
cijfers als de aangifte, schema-bewust en met creditnota's afgetrokken. Tevens
de snapshot-drempelvariabele hernoemd (`fourHoursAgo` → `snapshotCutoff`).

## 7. Toekomstbestendigheid — jaar-parametrisering

Alle tarieven/grenzen staan in `lib/tax/dutch-tax-2026.ts` (`TAX_CONSTANTS`).
Het jaar wordt op de meeste plekken dynamisch bepaald (`getFullYear()`), maar de
constanten zelf zijn jaargebonden en de bestandsnaam bevat het jaar.

**Plan voor 2027+:** `lib/tax/constants/` met `tax-constants-2026.ts`,
`tax-constants-2027.ts` en een `taxConstantsForYear(year)`-selector. De
projectie accepteert al `huidigJaar`; voeg een constantenset-parameter toe zodat
oude concept-aangiftes met de juiste jaartarieven blijven rekenen. Eén
bestandswijziging per nieuw belastingjaar.

## 8. Teststrategie

- **Unit** — per pure module (constanten, randgevallen).
- **Reconciliatie** — surfaces die hetzelfde getal tonen, moeten gelijk zijn
  (bv. `vat-return-row` ↔ `btw-rubrieken`).
- **Invarianten** — `yours + ib + btw = clientPays`; `totaalBtw` = som van álle
  rubrieken; reserve ≥ 0; etc.
- **Regressie** — elke gevonden bug krijgt een test die hem zou hebben gevangen.

`npm run build` (check-env → typecheck → lint → next build) en `npm run test`
moeten groen zijn na elke wijziging.

## 9. Roadmap (fasering)

1. **Veiligheidsfundament** — ✅ kernel gebouwd: `lib/autonomy/dispatcher.ts`
   (`AutonomyTier`/`AgentAction`, `ACTION_TIERS`-beleid, `decideAction`) dwingt
   de tier-regels, confidence-drempels, noodstop, schaduwmodus en de
   invariant-gate af. **Volgende:** de bestaande autonome bits (overdue
   markeren, betaling-match, BTW voorbereiden) hier doorheen routeren + elke
   uitvoering loggen met undo-handle.
2. **Eén fiscale kern afronden** — safe-to-spend unificeren (§6.2),
   reconciliatie-tests uitbreiden.
3. **Schaduwmodus, noodstop, idempotentie + admin-controletoren** — laat zien
   wat de agents deden/zouden doen; admin wordt toezicht, niet werk.
4. **Jaar-parametrisering** (§7) + migratie 1e/3a (§6.1a).
5. **Bankkoppeling als rustige sensor** + "Zo werkt het"-uitleg.

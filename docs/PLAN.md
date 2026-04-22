# VAT100 — Dagplan tot compleet product

Dit document is de opvolg-planning voor de codebase-refactor. Het is **de
single source of truth** voor wat de volgende sessies moeten doen. Elke dag
pakt één tranche, één commit per substap, aan het eind push + vink af.

## Huidige staat (afgesloten vandaag)

- 17 golven gemerged naar `claude/review-codebase-optimizations-dTuDD`
- `npm run typecheck`, `npm run lint`, `npm run build` schoon
- **387 / 387** unit tests passing
- Security: cron timing-attack dicht, unsubscribe token-enum dicht,
  invoice/quote fetch `user_id`-scoped, cron endpoints rate-limited,
  email template XSS-escape, reconciliation race-guard
- Performance: refetch-storm getemperd, N+1 op `invoice_reminders` weg,
  useMemo-stabilisatie op hot paths
- A11y: focus-trap in dialogs, upload-zones zijn echte `<button>`s,
  SkeletonTable is `role="status"`, nav drawer heeft `aria-expanded`
- Coverage: 13 nieuwe test-bestanden, o.a. UBL generator, CSV export,
  financial-health, chart-of-accounts, date-helpers, invoice requirements

## Wat nog open staat

Grote items (vereisen design-keuzes, dáárom zijn ze uitgesteld):

1. **Money safety** — floats → integer cents op schema-niveau
2. **File splits** — 5 bestanden > 500 regels met mixed concerns
3. **Client→Server audit** — 162 `"use client"` files, deel kan server worden
4. **CSP nonces** — `'unsafe-inline'` weg uit script-src / style-src
5. **Impersonate audit trail** — who/when/IP tamper-proof loggen
6. **Resterende tests** — Zod schemas, receipt-matcher, retry-processor
7. **Select-column audit** — `select("*")` → expliciete kolommen
8. **Bundle analyzer pass** — client-chunks identificeren + splitsen
9. **README / CONTRIBUTING** — onboarding docs

## Dagelijkse routine

Voor elke sessie, in volgorde:

```bash
# 1. Sync
git fetch origin && git pull --rebase origin claude/review-codebase-optimizations-dTuDD

# 2. Baseline
npm install --no-audit --no-fund
npm run typecheck
npm run lint
npm test

# 3. Pak taak van vandaag uit dit document
# 4. Eén commit per substap, conventional message style
# 5. Na elke commit:
npm run typecheck && npm run lint && npm test
# en bij UI-werk:
npx next build

# 6. Push en vink af in dit document
git push
```

### Commit-stijl

- Prefix per aard: `security:`, `perf:`, `a11y:`, `refactor:`, `tests:`,
  `docs:`, `chore:`
- Imperatief: "add", "fix", "remove" — niet "added"
- Body legt de **waarom** uit, niet de wat (die staat in de diff)
- Stop nooit met een half-af feature in een commit

### Regels

- `npm run build` **moet** passen voor push
- Geen nieuwe `text-red-600` / `bg-green-50` (Luminous Conceptualism — tokens)
- UI-teksten NL
- Geen `dangerouslySetInnerHTML` tenzij expliciet voor sanitised content
- Geen force-push naar main

---

## Week 1 — Foundations

### Dag 1 (morgen) — Money safety audit + subscription cents-check

**Waarom eerst:** minste UI-impact, toetst aan bestaande Mollie-cents
conventie. Geen schema-migraties, wel hoekstenen.

**Tasks**

- [ ] Audit alle plekken die `total_inc_vat`, `vat_amount`,
      `subtotal_ex_vat`, `amount_cents`, `amount` lezen/schrijven.
      Rapporteer in `docs/MONEY_AUDIT.md`:
  - welke velden **al** in cents zijn (waarschijnlijk subscription_payments)
  - welke in decimale euro's (waarschijnlijk invoices, receipts)
  - waar `parseFloat(...)*100` + `Math.round` patronen staan
- [ ] Voeg tests toe voor `roundMoney` edge cases:
      `0.1 + 0.2`, `-0`, grote bedragen (> 1M), zeer kleine (< 0.005)
- [ ] Voeg een `lib/money.ts` helper toe met `toCents(euros)`,
      `fromCents(cents)`, `formatCents(cents)`. NIET gebruiken in
      bestaande paden — alleen als nieuwe API die geleidelijk overneemt.
- [ ] Test dekt: `toCents(0.1+0.2)` === 30 (niet 30.0000000000004).

**Acceptatie:** 10+ nieuwe tests, money-audit doc gepusht, geen
productie-code gewijzigd behalve `lib/money.ts` toegevoegd.

### Dag 2 — Split MobileDashboard.tsx (797 r.)

**Waarom:** grootste bestand met mixed concerns; maakt volgende
refactors makkelijker.

**Tasks**

- [ ] Extraheer in aparte files (zelfde map):
  - `MobileDashboardHero.tsx` (vrij-besteedbaar + btw-deadline blok)
  - `MobileQuickActions.tsx` (3-knops grid)
  - `MobileStatsStrip.tsx` (4-tegels)
  - `SwipeableInvoiceCard.tsx` (nu inline component)
  - `ScanReceiptSheet.tsx` (bottom sheet logic)
  - `MobileStatCard.tsx` (losse stat)
  - `QuickActionButton.tsx` (reeds bestaande helper)
  - `PullToRefreshIndicator.tsx` (custom indicator)
- [ ] MobileDashboard.tsx blijft max ~250 r. — alleen orchestratie + state.
- [ ] Geen gedragsverandering. Visuele regressie-check via `npx next dev`.
- [ ] Voeg smoketests toe als er geen client-side tests bestaan.

**Acceptatie:** MobileDashboard.tsx < 300 regels, 7-8 nieuwe files,
build schoon, geen useEffect-regressie (controle met `react-hooks`
lint).

### Dag 3 — Split features/banking/actions.ts (774 r.)

**Tasks**

- [ ] Splits op domein:
  - `features/banking/actions/connection.ts` — Tink connect/status/disconnect
  - `features/banking/actions/transactions.ts` — fetch/paginate/search
  - `features/banking/actions/categorization.ts` — auto-classify + manual
  - `features/banking/actions/reconciliation.ts` — match-to-invoice
- [ ] `features/banking/actions.ts` wordt barrel-export
- [ ] Check alle callers: zelfde imports, geen gedragsverandering
- [ ] Tests toevoegen per module als er geen unit-tests zijn

**Acceptatie:** 4 files < 250 r. elk, barrel werkt, build + lint schoon.

### Dag 4 — Split features/receipts/actions.ts (713 r.)

Zelfde patroon als Dag 3:

- [ ] `upload.ts` — uploadReceiptImage, scanReceiptWithAI
- [ ] `crud.ts` — create/update/delete/get
- [ ] `categorization.ts` — cost_code assignment, vat-rate detectie
- [ ] Barrel in `actions.ts`

### Dag 5 — Split features/invoices/actions.ts (598 r.)

- [ ] `lifecycle.ts` — create/update/status transitions
- [ ] `send.ts` — email + PDF triggering
- [ ] `recurring.ts` — recurring-invoice flow
- [ ] Barrel in `actions.ts`

---

## Week 2 — Hardening

### Dag 6 — Client → Server component audit (top 20)

**Strategie:** hoeveel van de 162 `"use client"` kunnen écht gewoon
server zijn? Criteria voor server:

- Geen `useState` / `useEffect` / `useRef` / event handlers
- Niet binnen een client boundary al (ouder is geen `"use client"`)
- Geen framer-motion / react-query op dit niveau

**Tasks**

- [ ] Script dat elk `"use client"` checkt op bovenstaande criteria en
      een kandidaten-lijst spuwt.
- [ ] Top 20 converteren. Verifieer per stuk dat SSR-output identiek is.
- [ ] Bundle-size voor/na meten (`next build` stats).

**Acceptatie:** minimaal 10 files daadwerkelijk naar server verschoven,
bundle first-load JS omlaag.

### Dag 7 — CSP nonces

**Huidige toestand:** `script-src 'self' 'unsafe-inline' https://js.mollie.com`
en `style-src 'self' 'unsafe-inline'`. Dit ondermijnt een groot deel
van de CSP-garanties.

**Tasks**

- [ ] Middleware nonce-generatie toevoegen (per-request random 128-bit).
- [ ] `next.config.ts` CSP naar `script-src 'self' 'nonce-{rand}'`.
- [ ] Alle inline `<style>` in UBL-mail templates / emailvoorkeuren
      pagina naar externe CSS of nonce-gebonden `<style nonce={n}>`.
- [ ] Mollie script blijft via `https://js.mollie.com` allowlist.
- [ ] Verifieer met DevTools CSP report, schrijf integratie-test.

**Acceptatie:** `'unsafe-inline'` weg uit zowel script-src als style-src.

### Dag 8 — Impersonate audit trail

**Huidige gat:** admin impersonation wordt via `action: "impersonation.start"`
gelogd, maar zonder IP, user-agent, of eind-tijdstip.

**Tasks**

- [ ] Migratie: tabel `impersonation_sessions` met `admin_id`,
      `impersonated_user_id`, `started_at`, `ended_at`, `ip_address`,
      `user_agent`, `reason_code`.
- [ ] Bij `/api/admin/impersonate/start`: insert + return session-token.
- [ ] Bij `/api/admin/impersonate/stop` of session-expiry: update
      `ended_at`.
- [ ] DB-trigger die `ended_at` nooit `NULL` overschrijft na een eerste
      waarde (tamper-guard).
- [ ] Admin UI: read-only sessies-tabel onder `/admin/audit-log/impersonation`.
- [ ] Tests: dubbele-stop is no-op, session-expiry vult automatisch.

**Acceptatie:** elke impersonate-sessie traceerbaar met IP + duur.

### Dag 9 — Select-column audit

**Tasks**

- [ ] Grep `supabase.from(...).select("*")` — maak lijst met aantal
      kolommen per tabel (schema check).
- [ ] Top 10 hot paths (invoices/lines, clients, receipts, transactions):
      vervang `*` door expliciete kolomlijst die past bij de UI-consument.
- [ ] Meet payload-size voor/na op één representatieve route.

**Acceptatie:** 10+ hot queries gemigreerd, meetbare payload-daling
op `/api/dashboard` of equivalent.

### Dag 10 — Zod-schema tests + rest-coverage

**Tasks**

- [ ] Test `lib/validation/index.ts` — elk schema: happy path,
      boundary, injection-poging.
- [ ] Test `lib/services/receipt-matcher.ts` — pure matching logica.
- [ ] Test `lib/webhooks/retry-processor.ts` — exponentiële backoff.
- [ ] Haal coverage naar 450+ tests.

**Acceptatie:** lib/ heeft < 5 untested modules, allemaal external-API-wrappers.

---

## Week 3 — Polish + release

### Dag 11 — Bundle-analyzer pass

- [ ] `@next/bundle-analyzer` installeren, rapporteren.
- [ ] Top 5 zwaarste client-chunks identificeren.
- [ ] `dynamic(() => import(...))` toepassen waar 1st-load onnodig.
- [ ] `framer-motion` - check of `LazyMotion` volledig wordt gebruikt.
- [ ] `lucide-react` - audit barrel-imports.

**Acceptatie:** First-load JS shared < 150 kB (nu 179 kB).

### Dag 12 — README + CONTRIBUTING

- [ ] Update `README.md`: scripts, env vars, architectuur-diagram
      van (user → middleware → server action → Supabase).
- [ ] `CONTRIBUTING.md`: commit-stijl, branch-policy, review-process.
- [ ] `docs/architecture.md`: Single Canvas / Predictive Calm / Essential
      Math principes met concrete code-voorbeelden.
- [ ] `docs/security.md`: auth flow, RLS policies, cron secret rotation.

### Dag 13 — Release kandidaat

- [ ] Volledige E2E-run (`npm run e2e`) tegen staging.
- [ ] Security audit (`npm run security:audit`).
- [ ] Perf-test (`npm run test:perf`).
- [ ] Merge alle branches naar `main` via squash-commits.
- [ ] Tag versie `v1.0.0`.

---

## Definitie van "af"

Het product is af wanneer:

1. `npm run build && npm run lint && npm run typecheck && npm test`
   allemaal slagen en CI is groen.
2. Er geen bestand in `app/` of `features/` is groter dan 500 regels
   (of een expliciete uitzondering met commentaar).
3. Elke publieke lib/-functie heeft JSDoc of een test (of beide).
4. CSP bevat geen `'unsafe-inline'`.
5. Admin impersonation heeft een volledig audit-spoor.
6. Bundle first-load JS < 150 kB shared.
7. README dekt setup, scripts, en architectuur.
8. Alle securty-findings van de initiële audit zijn afgehandeld of
   expliciet als WONTFIX gemarkeerd met reden.

---

## Hoe dit document gebruikt wordt

- Aan het begin van elke sessie: open dit document, pak de bovenste
  onvinkte dag.
- Vink subtaken af via een commit die dit document bijwerkt.
- Als een taak groter blijkt dan een dag: splits en voeg rijen toe
  onder de huidige dag. Schuif resterende dagen niet op — de volgorde
  is gekozen voor afhankelijkheden.
- Als een taak blijkt al gedaan of irrelevant: doorstreep met reden.

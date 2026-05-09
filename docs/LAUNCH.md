# VAT100 — Lanceringsplan juni 2026

Aanvulling op `docs/PLAN.md`. PLAN.md is de **code-quality** bron
(refactor-sprint), dit document is de **operationele** bron richting de
juni-lancering. Beide lopen parallel; één eigenaar.

## Lanceringsstrategie

**Closed beta → soft launch → hard launch.** Geen big-bang.

- **W3 (25 mei):** closed beta met 10-20 zzp'ers
- **W4 (1 juni):** soft launch, signups met cap van 100, waitlist drip 50/week
- **Hard launch:** week 15-20 juni, mits foutpercentage < 0,5% en
  signup→active conversie > 40%

## Scope-aanpassing: Digipoort

VAT100 doet **geen automatische aangifte-indiening** in v1. De aangifte
wordt voorbereid, gepresenteerd, en gedownload als XBRL/PDF. De gebruiker
logt zelf in op **Mijn Belastingdienst Zakelijk** en vult de nummers over.

**UI-implicaties (W1):**

- Knop "Aangifte indienen" → "Aangifte voorbereiden"
- Help-pagina met stappen + screenshots van Mijn Belastingdienst Zakelijk
- Marketing-copy benadrukt "berekent en presenteert", niet "dient in"
- `lib/digipoort/client.ts` blijft als scaffolding voor v2

## Billing

Mollie is geïmplementeerd (~1027 r. productie-code). Geen scaffolding meer
nodig, wel **productie-validatie** in W1.

- **Closed beta (W1-W3):** gratis, geen Mollie-prompt in UI
- **Soft launch (W4):** Mollie aan voor nieuwe signups
- **Beta-users:** krijgen 30 dagen gratis na soft launch als bedankje

## Week-voor-week

### Week 1 (9-16 mei) — Foundations

**Code (PLAN.md):**

- Dag 1: money-safety audit + `lib/money.ts`
- Dag 2: split `MobileDashboard.tsx`
- Dag 3: split `features/banking/actions.ts`

**Launch-ops:**

- [ ] UI/copy: "indienen" → "voorbereiden" overal
- [ ] Help-pagina "Hoe dien ik mijn aangifte in" met screenshots
- [ ] Mollie productie-validatie: live key, €1 testtransactie, refund-flow,
      webhook signature in prod, idempotentie
- [ ] Beta-pool: 10-20 zzp'ers werven via netwerk + waitlist
- [ ] Status page (UptimeRobot of statuspage.io freemium)

### Week 2 (16-23 mei) — Hardening + ops

**Code (PLAN.md):**

- Dag 4: split `features/receipts/actions.ts`
- Dag 5: split `features/invoices/actions.ts`
- Dag 6: client→server audit (top 20)
- Dag 7: CSP nonces

**Launch-ops:**

- [ ] AVG: DPA-template, sub-processors lijst
      (Supabase, Vercel, Mollie, Tink, Resend, Anthropic),
      retention-policy doc onder `app/(legal)/`
- [ ] Resend: domeinverificatie SPF/DKIM/DMARC op `vat100.nl`
- [ ] Support-inbox `support@vat100.nl` (Resend → forward)
- [ ] Backup-drill: Supabase PITR herstel testen op staging
- [ ] Beta-onboarding mail klaar (welkom, eerste-stap-gids,
      feedback-link)

### Week 3 (23-30 mei) — Closed beta

**Code (PLAN.md):**

- Dag 8: impersonate audit trail
- Dag 9: select-column audit
- Dag 10: Zod-schema tests + receipt-matcher tests

**Launch-ops:**

- [ ] **Maandag 25 mei: closed beta start** met 10 zzp'ers
- [ ] Q1 2026 aangifte-test met echte cijfers van een betatester
      (eigen Q1 mag)
- [ ] Daily check op feedback: top-3 punten per dag bijhouden
- [ ] Hotfix-cyclus: critical < 24u, high < 48u

### Week 4 (30 mei-6 juni) — Soft launch

**Code (PLAN.md):**

- Dag 11: bundle-analyzer (target first-load < 150 kB)
- Dag 12: README + CONTRIBUTING + `docs/architecture.md`
- Dag 13: release v1.0.0

**Launch-ops:**

- [ ] **Maandag 1 juni: soft launch** — Mollie aan, signups open
      met cap 100, waitlist drip 50/week
- [ ] Beta-users: 30d-gratis-code via mail
- [ ] Marketing: één LinkedIn-post + één blog "waarom VAT100"
- [ ] **Geen ProductHunt nog** — dat is voor hard launch
- [ ] Monitoring 24/7: Sentry alerts naar telefoon

### Buffer (6-13 juni) — Hotfix + hard-launch voorbereiding

- Geen nieuwe features, alleen bugfixes
- Beta-feedback verwerken
- Hard-launch checklist klaarzetten

### Hard launch (week 15-20 juni)

Voorwaarden:

- Foutpercentage < 0,5% over week 4
- Signup → active conversie > 40%
- Geen open critical of high bugs
- Status page laat 99,5%+ uptime zien over 30 dagen

## Definition of Launched

Bovenop PLAN.md punten 1-8:

9. 10+ betas hebben minstens één Q1 2026 aangifte volledig voorbereid
10. AVG-paginas dekken DPA, sub-processors, retention
11. Support-inbox monitored, status page live, on-call regeling helder
12. Mollie productie heeft 1+ echte transactie + 1 refund gevalideerd
13. UI laat duidelijk zien dat user zelf indient bij Belastingdienst

## Risico's en mitigaties

| Risico | Kans | Impact | Mitigatie |
|---|---|---|---|
| Beta vindt critical bug Q1-aangifte | M | H | W3 alleen kleine groep, hotfix-cyclus 24u |
| Mollie webhook in prod faalt op signature | L | H | W1 expliciete prod-validatie, niet alleen sandbox |
| AVG-vraag van eerste klant | H | M | DPA-template W2 klaar, niet ad hoc |
| Money-rounding bug op grote bonnen | L | H | Dag 1 audit + tests, `lib/money.ts` als nieuwe API |
| Beta-feedback overstijgt capaciteit | M | M | Cap op 20 betas, top-3 per dag, rest backlog |
| Sentry mist incident in prod | L | H | W4 alerts naar telefoon, status page als tweede laag |

## Niet in scope voor v1 (juni)

Expliciet uitgesteld naar v1.1 of later:

- Automatische Digipoort-indiening (vereist PKIoverheid-cert)
- Inkomstenbelasting-aangifte (alleen BTW in v1)
- Multi-user / team-accounts
- Mobile native app (PWA volstaat)
- Boekhouder-export naar Twinfield/Exact (alleen CSV/UBL in v1)
- Automatische bankreconciliatie-suggesties op AI-niveau
  (handmatige match werkt)

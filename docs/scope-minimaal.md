# VAT100 — Minimaliseringsplan

Doel: VAT100 terugbrengen tot de fiscale kern die een Nederlandse
creatieve ZZP'er écht nodig heeft. Simpeler en clean, conform de
`CLAUDE.md`-belofte *"If an element doesn't solve a fiscal problem, it
should not exist."*

## Status — uitgevoerd ✅

Alle fasen afgerond op branch `claude/brave-wozniak-rFwYh`; elke fase met
groene typecheck, lint, 405 unit-tests en `next build`.

- [x] **Fase 1** — expliciete AI verwijderd (`d060637`)
- [x] **Fase 2** — de-branding van AI onder de motorkap (`2b41db6`)
- [x] **Fase 3** — redundante routes geconsolideerd (`10240c9`)
- [x] **Fase 4** — groei-extra's achter `NEXT_PUBLIC_GROWTH_ENABLED` (`c038aba`)
- [x] **Fase 5** — admin-nav slank + resources verborgen (`e5085e2`)
- [x] Sluitstuk — abonnementskenmerken (DB `plan.features`) ge-de-brand (`a8a68ad`)

**Vóór deploy:** draai de migraties `20260602_001_remove_ai_quota.sql` en
`20260602_002_debrand_plan_features.sql` op Supabase.

## Uitgangspunten (vastgesteld)

1. **Slanke SaaS.** Auth, abonnementen (Mollie) en een *minimale* admin
   blijven. Het blijft een verkoopbaar product, geen single-user tool.
2. **Schrap geen goede dingen.** Goede-maar-rommelige functies worden
   **versimpeld** of **achter een flag verborgen** — niet verwijderd.
   De schaar gaat alleen in (a) échte redundantie/dode code en (b) de
   *expliciete* AI-laag.
3. **Feedback blijft.** Widget + admin-inbox blijven bestaan.
4. **AI: alleen expliciet weg.** De zichtbare AI-assistent, chat, quota,
   kosten-tracking en álle "AI"-teksten verdwijnen. OCR (bon/factuur) en
   bank-categorisatie blijven werken — **stil onder de motorkap**. De
   `@anthropic-ai/sdk`-dependency en `ANTHROPIC_API_KEY` blijven dus.
5. **Harde regels.** `npm run build` moet na elke fase slagen. Alle
   UI-teksten in het Nederlands. Eén commit per substap.

Legenda: **HOUDEN** · **SCHRAPPEN** (redundant/dood/expliciete AI) ·
**VERBERGEN** (achter flag, code blijft) · **DE-BRANDEN** (functie blijft,
"AI"-tekst weg).

---

## 1. De fiscale kern — HOUDEN

| Module | Reden |
|---|---|
| **Facturen** (+ terugkerend, credit) | Omzet vastleggen — kern. |
| **Klanten** | Ontvangers van facturen. |
| **Offertes** | Goede functie, hoort bij facturen. Houden (zie §6). |
| **Uitgaven → Bonnen** | Kosten + voorbelasting. |
| **Uitgaven → Bank** (Tink) | Transacties + reconciliatie. |
| **Uitgaven → Activa** | Afschrijving / activastaat. |
| **Uitgaven → Uren** | 1225-urencriterium. |
| **Uitgaven → Ritten** | Kilometervergoeding. |
| **Belasting → BTW-aangifte** | De reden dat het VAT100 heet. |
| **Belasting → IB-projectie** | Indicatie inkomstenbelasting. |
| **Belasting → ICP / jaarrekening / suppletie** | Goede fiscale functies — houden, eventueel visueel inklappen. |
| **Overzicht (dashboard)** | Deadlines, vrij besteedbaar, openstaand. |
| **Berichten** (`features/chat`) | Support-messaging — **géén AI**. Houden. |
| **Feedback** (widget + inbox) | Expliciet behouden. |
| **Onboarding** | Helpt nieuwe gebruikers. Houden, eventueel versimpelen. |
| **Auth + Abonnementen (Mollie)** | Spine van de slanke SaaS. |

> Let op: `features/chat` (Berichten) is **support-messaging**, niet de
> AI-assistent. Niet verwarren bij het schrappen. Verifieer tijdens
> uitvoering dat `getUnreadCount` (gebruikt in `app/dashboard/layout.tsx`)
> blijft werken.

---

## 2. Expliciete AI — SCHRAPPEN

Dit is de zichtbare AI-laag. Volledig verwijderen.

**Routes & UI**
- `app/dashboard/ai-assistant/page.tsx` — hele route.
- `components/ai/TaxAgentChat.tsx` — chat-UI.
- AI-assistent-toggle op het dashboard (embedded `TaxAgentChat` in
  Desktop-/MobileDashboard).
- `features/dashboard/components/AiQuotaBanner.tsx` — quota-waarschuwing.
- Nav-verwijzingen: `lib/hooks/useRecentNav.ts` (`/dashboard/ai-assistant`),
  en eventuele link in `components/layout/DashboardNav.tsx`.

**API**
- `app/api/ai/tax-agent/route.ts`
- `app/api/ai/tax-agent/compliance/route.ts`
- `app/api/ai/tax-agent/test/route.ts`

**Lib & services**
- `lib/ai/chat.ts` (+ test) — chat-invocatie.
- `lib/ai/quota.ts` (+ test) — chat/OCR-quota.
- `lib/services/managed-agent.ts` (+ test) — Anthropic Managed Agents.
- `lib/ai/models.ts` — alleen de `CHAT`/`AGENT`-routing eruit; de
  **`OCR`-entry blijft** (OCR werkt door).

**Admin (expliciete AI-ops)**
- `app/admin/systeem/ai-usage/page.tsx`
- `features/admin/ai-usage-actions.ts`

**Database / config**
- Migratie: drop chat-quota (`ai_chat_quota`-kolom op `plans`). De
  `ai_usage`-tabel mag blijven als **stille** OCR-teller voor
  kostenbewaking, maar zonder "AI"-UI. Anders volledig droppen.
- `ANTHROPIC_AGENT_ID` / `ANTHROPIC_ENVIRONMENT_ID` uit env-validatie
  (managed-agent verdwijnt). `ANTHROPIC_API_KEY` **blijft** (OCR).

---

## 3. AI onder de motorkap — DE-BRANDEN (functie blijft)

OCR en bank-categorisatie blijven werken; alleen de "AI"-naamgeving en
-teksten verdwijnen.

**Code (functienamen)**
- `features/receipts/actions.ts`: `scanReceiptWithAI` → `scanReceipt`.
- `features/invoices/invoice-ocr-actions.ts`: `scanInvoiceWithAI` →
  `scanInvoice`.
- Bank-auto-categorisatie: behouden, geen "AI"-tekst.

**Teksten / i18n**
- `lib/i18n/dictionaries/nl.ts` & `en.ts`: `aiScanUnavailable`,
  `aiRecognition`, `aiFailed`, `aiAssistant` → neutraal hernoemen
  ("scan", "herkenning", "automatisch") of verwijderen (`aiAssistant`).
- `app/page.tsx` (landing): "Onbeperkt AI-chat" verwijderen; OCR-feature
  herformuleren zonder "AI" (bv. "Bon scannen — automatisch ingevuld").
- `app/manifest.ts`: "Scan een bon met AI-herkenning" → "Scan een bon".
- `app/(legal)/voorwaarden/page.tsx`: "AI features" herformuleren.
- `features/dashboard/components/QuickReceiptUpload.tsx` &
  `features/invoices/components/BulkInvoiceCard.tsx`: "AI-scan" → "scan".
- `lib/email/send-retention.ts`: "AI-insights" verwijderen/herformuleren.

**Privacy — let op (functie blijft, dus disclosure blijft!)**
- `app/(legal)/privacy/page.tsx`: de Anthropic-subverwerker-disclosure
  **moet blijven** (OCR stuurt nog steeds beeld naar Anthropic). Wel
  herformuleren van "AI-bonherkenning" naar bv. "automatische
  tekstherkenning op bonnen/facturen via subverwerker Anthropic". Idem
  `docs/subverwerkers.md` controleren.

---

## 4. Redundante routes — SCHRAPPEN (consolidatie, geen functieverlies)

De functionaliteit bestaat al als tab onder **Uitgaven**; alleen de
dubbele route-wrappers gaan weg.

- `app/dashboard/trips/` → dekt door Uitgaven-tab "Ritten".
- `app/dashboard/hours/` → dekt door Uitgaven-tab "Uren".
- `app/dashboard/assets/` → dekt door Uitgaven-tab "Activa".
- `app/dashboard/bank/` → is al een redirect; mag blijven als deep-link of weg.
- `app/dashboard/report/` → redirect naar Belasting/jaarrekening; redundant.
- `app/dashboard/audit/` → afgeschermde, niet-functionele stub. Weg.

Actie: controleer en herstel interne links die naar deze routes wijzen
(naar de juiste Uitgaven-tab). Geen tracking-/invoer-logica verwijderen.

---

## 5. Groei-/marketing-extra's — VERBERGEN (achter flag, code blijft)

Niet-fiscale scaffolding. Code blijft staan, maar standaard uit/onzichtbaar.

| Item | Aanpak |
|---|---|
| `features/referrals` + `/admin/groei` | Achter flag `NEXT_PUBLIC_REFERRALS_ENABLED` (default uit). Uit nav. |
| `features/waitlist` + `app/admin/pipeline` + `WaitlistForm` (landing) | Achter bestaande beta-flag; bij slanke SaaS landing → normale registratie i.p.v. wachtlijst. |
| `app/dashboard/network` (community) | Niet-fiscaal. Uit discovery/nav; route dormant of achter flag. |
| `BetaBanner` (`components/feedback`) | Alleen tonen als `NEXT_PUBLIC_BETA_MODE=true`; in slanke SaaS standaard uit. |
| `app/dashboard/voorbeeld` (demo) | Houden — goede onboarding. Eventueel later versimpelen. |
| `features/feedback` (widget + inbox) | **Houden** (expliciet gewenst). |

---

## 6. Admin — SLANK maken (code blijft, nav inkorten)

De admin-console (~6.900 r., grootste module) blijft voor een slanke
SaaS, maar de operator-nav wordt teruggebracht tot het essentiële.

**Admin houden (essentieel):** users, settings, financials/abonnementen,
feedback-inbox, systeem-health, klanten.

**Admin verbergen (flag/uit nav, code blijft):** groei, analytics,
pipeline (waitlist), forecast, ai-usage (die laatste vervalt sowieso, §2).

**Impersonation:** houden voor support; het audit-spoor is al ingebouwd.

---

## 7. Navigatie na de operatie

**Dashboard (desktop):** Overzicht · Facturen · Klanten · Uitgaven ·
Belasting · Berichten · Account. *(AI-assistent weg.)*

**Uitgaven (tabs):** Bonnen · Bank · Activa · Uren · Ritten.
*(standalone routes weg.)*

**Belasting (tabs):** BTW · IB · ICP · Jaarrekening · Suppletie.
*(behouden; presentatie eventueel inklappen.)*

**Admin (nav):** Users · Abonnementen/Financials · Klanten · Feedback ·
Systeem · Settings.

---

## 8. Fasering (uitvoering)

Elke fase is een aparte commit-reeks; `npm run build` + `typecheck` +
`lint` + `test` groen vóór de volgende fase.

- **Fase 0 — Baseline.** Branch `claude/brave-wozniak-rFwYh`. Build/test
  groen vastleggen.
- **Fase 1 — Expliciete AI eruit (§2).** Grootste, op zichzelf staande
  verwijdering. Routes, UI, API, lib, admin-ai-usage, dashboard-toggle.
- **Fase 2 — AI de-branden (§3).** Functienamen, i18n, landing, manifest,
  legal (disclosure correct laten!), e-mail, componenten.
- **Fase 3 — Redundante routes (§4).** Standalone trips/hours/assets +
  audit-stub + report; links herstellen.
- **Fase 4 — Groei-extra's verbergen (§5).** Flags zetten; feedback laten
  staan; landing wachtlijst → registratie.
- **Fase 5 — Admin slank (§6).** Nav inkorten, groei/analytics achter flag.
- **Fase 6 — Verificatie.** Volledige build/test, mobiele smoke (390px),
  per fase pushen.

---

## 9. Buiten scope (bewust niet nu)

- Money-safety (floats → cents), file-splits, CSP-nonces, select-column
  audit — staan in `docs/PLAN.md`; dit zijn refactors, geen scope-keuzes.
- Geen schema-migraties behalve het droppen van de chat-quota (§2).

## 10. Risico's / let op

- **Build-gate:** na elke fase `npm run build` — hard vereist.
- **Privacy:** OCR blijft, dus de Anthropic-subverwerkerdisclosure mag
  niet sneuvelen bij het de-branden (§3).
- **Berichten ≠ AI:** `features/chat` is support; niet meeschrappen (§1).
- **NL-teksten:** alle herformuleringen in het Nederlands, in de stem van
  `docs/voice.md` (kalm, precies, geen hype).

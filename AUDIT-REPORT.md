# VAT100 Codebase Audit Report

**Datum:** 11 april 2026
**Status:** Alleen-lezen analyse — geen wijzigingen doorgevoerd

---

## 1. Architectuur-overview

### Tech Stack
- **Framework:** Next.js 15.5 (App Router) + React 19
- **Taal:** TypeScript 5.9 (strict mode)
- **Styling:** Tailwind CSS 4 + Framer Motion 12
- **Database:** Supabase (PostgreSQL) met RLS
- **State:** Zustand 5 (forms) + TanStack React Query 5 (server state)
- **Auth:** Supabase Auth (OAuth) + middleware-bescherming
- **Betalingen:** Mollie
- **Banking:** Tink (PSD2)
- **AI:** Anthropic Managed Agents
- **Email:** Resend
- **Monitoring:** Sentry

### Data Flow
```
Supabase (PostgreSQL + RLS)
    |
lib/services/ (repositories, business logic)
    |
features/*/actions.ts (Server Actions + requireAuth())
    |
React Query (client cache, staleTime: 2min)
    |
React Components (Server Components + Client Components)
```

### Patterns
- **Server Components** als default; `"use client"` alleen waar interactie nodig is
- **Hybride rendering:** Server haalt initieel data op, geeft door als `initialData` aan Client Components met `useQuery`
- **Feature-gebaseerde structuur:** `features/invoices/`, `features/tax/`, etc. met eigen `actions.ts` en `components/`
- **Zustand** alleen voor formulier-state (invoice/quote editor)
- **Event-driven automation:** `system_events` tabel → cron → AI agents (qualification, bookkeeping, VAT detection, etc.)
- **Middleware auth:** Sessie-refresh, route-bescherming, admin-check, subscription-gating op elke request

### Route-structuur
| Route | Type | Bescherming |
|-------|------|-------------|
| `/` | Publiek | Landing page |
| `/login`, `/register` | Auth | — |
| `/invoice/[token]` | Publiek | Token-based share |
| `/dashboard/*` | Beschermd | Auth + actieve subscription |
| `/admin/*` | Beschermd | Auth + admin role |
| `/api/cron/*` | Intern | CRON_SECRET (timing-safe) |
| `/api/webhook/*` | Extern | Payload-validatie + rate limiting |

---

## 2. Code Smells

### HOOG IMPACT

| # | Bevinding | Locatie | Details |
|---|-----------|---------|---------|
| CS-1 | **XSS via `dangerouslySetInnerHTML`** | `components/ai/TaxAgentChat.tsx:133-167` | AI-gegenereerde content wordt zonder sanitatie als HTML gerenderd. Regex-replace van markdown naar `<strong>` tags, maar geen DOMPurify of escape. |
| CS-2 | **God-files: action-bestanden >500 regels** | `features/banking/actions.ts` (774), `features/receipts/actions.ts` (680), `features/invoices/actions.ts` (571), `features/dashboard/actions.ts` (556), `features/quotes/actions.ts` (535) | Combineren DB-access, validatie, error handling en business logic zonder scheiding. |
| CS-3 | **Monolithisch component: TaxContent** | `app/dashboard/tax/TaxContent.tsx` (990 regels) | Bevat BTW-overzicht, belastingprojectie, betalingen en aangiftes in 1 component. Geen code-splitting per tab. |
| CS-4 | **Geslikte errors (fire-and-forget)** | `features/banking/actions.ts:402,414,417,419`, `features/dashboard/action-feed.ts:107,110` | `.catch(() => {})` op reconciliatie, auto-categorisatie en agent-taken. Geen Sentry-logging, geen feedback. |
| CS-5 | **State-explosie in ReceiptForm** | `features/receipts/components/ReceiptForm.tsx` (674 regels, 37+ useState calls) | Upload, AI-scanning, formuliervalidatie en business logic in 1 component. |

### MIDDEN IMPACT

| # | Bevinding | Locatie | Details |
|---|-----------|---------|---------|
| CS-6 | **Gedupliceerde auth-boilerplate** | Alle `features/*/actions.ts` (~50x) | `const auth = await requireAuth(); if (auth.error !== null) return { error: auth.error }; const { supabase, user } = auth;` herhaald in elke functie. |
| CS-7 | **4x gedupliceerde invoice-templates** | `features/invoices/components/InvoiceHTML.tsx` (493 regels), `InvoicePDF.tsx` (585 regels) | Minimaal, Klassiek, Strak, Poster templates herhalen kleurconstanten, styling en layout met 70% overlap. |
| CS-8 | **Inline styles overal** | 935+ instances in `app/`, 720+ in `features/` | Geen gedeeld thema-object. Magic values als `"0.5px solid rgba(0,0,0,0.08)"` herhaald. |
| CS-9 | **Monolithische type-/dictionary-bestanden** | `lib/types/index.ts` (754 regels), `lib/i18n/dictionaries/nl.ts` (1070 regels) | Geen logische groepering (invoice types vs tax types vs receipt types). |
| CS-10 | **Magic numbers** | `ReceiptForm.tsx:37` (`AUTO_SAVE_CONFIDENCE = 0.85`), `BulkUpload.tsx:24-25` (`MAX_FILES = 20`), `banking/actions.ts:360` (`CHUNK_SIZE = 100`) | Gedupliceerd en niet in een gedeeld constants-bestand. |

### LAAG IMPACT

| # | Bevinding | Locatie | Details |
|---|-----------|---------|---------|
| CS-11 | **Inconsistente naming** | Codebase-breed | Mix van Nederlands (`kvk_number`, `btw_number`, `bedrijf`) en Engels (`studio_name`, `business_percentage`). Single-letter vars in InvoiceHTML (`l`, `i`, `F`). |
| CS-12 | **Temporele koppeling in banking sync** | `features/banking/actions.ts:395-422` | 6 operaties sequentieel in try-catch zonder transactie-semantiek. Als 1 faalt, gaan de rest door. |

---

## 3. Security

### HOOG IMPACT

| # | Bevinding | Locatie | Risico |
|---|-----------|---------|--------|
| SEC-1 | **XSS via `dangerouslySetInnerHTML` op AI-content** | `components/ai/TaxAgentChat.tsx:133-167` | Als de AI-endpoint gecompromitteerd wordt of kwaadaardige content retourneert, kan JavaScript in de browser uitgevoerd worden. Sessie-tokens, financiele data (omzet, kosten, BTW) lekbaar. **Fix:** Gebruik `react-markdown` of `DOMPurify`. |
| SEC-2 | **Export API routes missen expliciete auth-check** | `app/api/export/btw/route.ts`, `app/api/export/ib-aangifte/route.ts`, `app/api/export/activastaat/route.ts`, `app/api/export/btw-aangifte/route.ts`, `app/api/export/icp/route.ts` | Geen auth op route-niveau. Onderliggende functies checken auth via `requireAuth()`, maar defense-in-depth ontbreekt. |
| SEC-3 | **FormData `as string` zonder null-check** | `app/(auth)/actions.ts:25-26,48-51`, `features/waitlist/actions.ts:19-21`, `app/api/webhooks/mollie/route.ts:30` | `formData.get("email") as string` zonder validatie dat de waarde niet `null` of een `File` is. Kan runtime crash veroorzaken. |

### MIDDEN IMPACT

| # | Bevinding | Locatie | Risico |
|---|-----------|---------|--------|
| SEC-4 | **Regex-gebaseerde input parsing in AI agent** | `app/api/ai/tax-agent/route.ts:134-151` | Nummers uit chat-berichten extraheren met regex zonder bounds-checking. Geen Zod-validatie op resultaat. |
| SEC-5 | **Raw Tink-errors doorgegeven aan gebruiker** | `lib/banking/tink.ts:91-94` | `throw new Error(\`Tink Auth Fout: ${err}\`)` leakt potentieel interne API-foutmeldingen naar de frontend. |

### GOED (bestaande maatregelen)

| Maatregel | Status |
|-----------|--------|
| Supabase RLS policies (user_id isolatie) | Correct geconfigureerd |
| `requireAuth()` / `requireAdmin()` in alle Server Actions | Consistent toegepast |
| Middleware: sessie-refresh, admin-check, subscription-check, suspended-check | Volledig |
| Cron-beveiliging via `timingSafeEqual` | Correct |
| Zod-validatie op formulieren (clients, invoices, receipts, quotes, assets) | Uitgebreid |
| Rate limiting (KVK: 10/min, VIES: 10/min, Export: 20/min, Mollie webhook: 100/min) | Database-backed |
| Geen hardcoded secrets in broncode | Bevestigd |
| `.env*` in `.gitignore` | Correct |
| Security headers (HSTS, X-Frame-Options, CSP, X-Content-Type-Options) | In next.config.ts |
| Error-sanitatie (`sanitizeSupabaseError`, `sanitizeError`) | Voorkomt interne info-lekkage |
| Invoice share tokens met expiratie | UUID-based + `share_token_expires_at` |
| Mollie webhook: payload-validatie via Mollie API + idempotency | Correct |

---

## 4. Performance

### HOOG IMPACT

| # | Bevinding | Locatie | Details |
|---|-----------|---------|---------|
| PERF-1 | **Dashboard: `staleTime: 0` + `refetchOnMount/WindowFocus: "always"`** | `app/dashboard/DashboardClient.tsx:38-44` | Dashboard refetcht op elke mount en window-focus. Zware RPC `get_dashboard_stats` wordt constant aangeroepen. **Fix:** `staleTime: 60000`, `refetchOnWindowFocus: "stale"`. |
| PERF-2 | **N+1 query in receipt-matcher** | `lib/services/receipt-matcher.ts:62-124` | Geneste loop met sequentiele `await supabase.update()` per match. 100 transacties = 100-200 opeenvolgende DB-calls. **Fix:** Batch met `Promise.all()`. |
| PERF-3 | **O(n^2) payment reconciliation** | `lib/services/payment-reconciliation.ts:56-124` | Dubbele loop + `Array.splice()` mutatie. 100 tx x 500 invoices = 50.000 iteraties. **Fix:** Gebruik `Map` voor O(1) lookups. |
| PERF-4 | **Ongelimiteerde GDPR-export** | `features/admin/actions/gdpr.ts:30-42` | 12 parallelle queries zonder `.limit()`. Haalt ALLE invoices, receipts, trips, bank-transacties op. **Fix:** Paginatie of streaming. |
| PERF-5 | **Waterfall queries in chat** | `features/chat/actions.ts:31-53,104-126` | `getChatMessages()` en `getUnreadCount()` doen 2 opeenvolgende queries (eerst conversation ophalen, dan messages). **Fix:** Single query met relatie-join. |

### MIDDEN IMPACT

| # | Bevinding | Locatie | Details |
|---|-----------|---------|---------|
| PERF-6 | **`.select("*")` in 6+ queries** | `app/api/export/transactions/route.ts:19`, `app/api/export/receipts/route.ts:19`, `features/admin/actions/users.ts`, `features/admin/actions/waitlist.ts:36,69` | Haalt alle kolommen op terwijl maar een subset nodig is. 20-50% overbodige bandbreedte. |
| PERF-7 | **Geen paginatie op invoices/clients** | `features/invoices/actions.ts`, `features/clients/actions.ts:7-27` | `getInvoices()` en `getClients()` laden alle records. Power users met 1000+ records krijgen alles. |
| PERF-8 | **Admin customer list: auth.listUsers(1000)** | `features/admin/actions/customers.ts:64-145` | Haalt 1000 auth-users op per pagina, combineert met profiel- en factuurdata. Geen filtering server-side. |
| PERF-9 | **Geen `React.memo` in hele codebase** | Codebase-breed | 0 instances gevonden. Alle list-items en display-componenten re-renderen bij parent-updates. |
| PERF-10 | **TaxContent (990 regels) niet code-split** | `app/dashboard/tax/TaxContent.tsx` | 3 aparte useQuery calls (btw, tax-projection, dashboard), geen staleTime, alles in 1 bundle. |
| PERF-11 | **`<img>` i.p.v. `<Image>`** | `app/dashboard/tax/TaxContent.tsx:219-231` | Ongeoptimaliseerde `<img src="/images/office-walnut.png">` zonder width/height, niet lazy-loaded. |
| PERF-12 | **Globale refetch op window focus** | `app/providers.tsx:22-26` | `refetchOnWindowFocus: true` als default. Elke tab-switch triggert refetch voor alle queries. |

### LAAG IMPACT

| # | Bevinding | Locatie | Details |
|---|-----------|---------|---------|
| PERF-13 | **Tab-state als useState i.p.v. URL params** | `app/dashboard/invoices/page.tsx:34`, `app/dashboard/expenses/page.tsx:24` | Tab-selectie reset bij refresh, niet bookmarkable. |
| PERF-14 | **Zware dynamic imports ontbreken** | `features/receipts/components/ReceiptForm.tsx` (674), `BulkUpload.tsx` (554) | Niet dynamisch geimporteerd, verhogen initiele bundle. |
| PERF-15 | **@react-pdf/renderer altijd in bundle** | `package.json` | ~400KB library. Alleen nodig bij PDF-generatie, zou lazy-loaded moeten zijn. |

---

## 5. Type Safety

### HOOG IMPACT

| # | Bevinding | Locatie | Details |
|---|-----------|---------|---------|
| TS-1 | **Onvolledige Supabase type-generatie** | `lib/database.types.ts` | Alleen `system_events` tabel is volledig getypt. Alle andere tabellen vallen terug op `Record<string, unknown>`. **Fix:** `npx supabase gen types typescript` draaien. |
| TS-2 | **FormData `as string` casts zonder validatie** | `app/(auth)/actions.ts:25-26,48-51,68,77,87-108`, `features/waitlist/actions.ts:19-21` | `formData.get("email") as string` kan `null` of `File` zijn. Geen runtime type-check. |
| TS-3 | **Dubbele type-casts** | `app/admin/klanten/[id]/page.tsx:240` | `profile as unknown as Record<string, unknown>` — twee casts om type-systeem te omzeilen. |

### MIDDEN IMPACT

| # | Bevinding | Locatie | Details |
|---|-----------|---------|---------|
| TS-4 | **50+ `as`-casts zonder type-narrowing** | `lib/services/invoice-repository.ts:48,87,322,352`, `features/quotes/actions.ts:33,95,521,534`, `features/admin/AdminMiniTable.tsx:49` | Type-assertions zonder voorafgaande guards. Beter: type-guard functies. |
| TS-5 | **Loose `Record<string, unknown>` in admin** | `features/admin/actions/stats.ts:128,151`, `features/admin/LeadDossier.tsx:15,23`, `features/admin/AdminMiniTable.tsx:8` | Admin-componenten gebruiken `Record<string, unknown>` i.p.v. specifieke interfaces. |
| TS-6 | **Route params niet gevalideerd** | `app/admin/klanten/[id]/page.tsx:154` | `params.id as string` — in Next.js kan `params.id` ook `string[]` zijn. |

### GOED (bestaande maatregelen)

| Maatregel | Status |
|-----------|--------|
| `strict: true` in tsconfig.json | Aan |
| Geen `any` gebruik in codebase | 0 instances gevonden |
| `ActionResult<T>` return type op alle server actions | Consistent |
| Zod-validatie met `validate()` helper | Op alle forms |
| `e: unknown` in catch-blocks + `getErrorMessage()` | Correct |
| Discriminated unions voor statussen | `InvoiceStatus`, `VatRate`, etc. |
| Null-safety met `?.` en `??` | Goed toegepast |
| Typed React hooks (useState, useQuery, useMutation) | Consistent |

---

## Samenvatting: Top 10 Prioriteiten

| Prio | ID | Categorie | Bevinding | Ernst |
|------|----|-----------|-----------|-------|
| 1 | SEC-1 | Security | XSS via `dangerouslySetInnerHTML` in TaxAgentChat | **HOOG** |
| 2 | PERF-1 | Performance | Dashboard `staleTime: 0` + always refetch | **HOOG** |
| 3 | TS-1 | Type Safety | Onvolledige Supabase types (alleen system_events getypt) | **HOOG** |
| 4 | PERF-2/3 | Performance | N+1 en O(n^2) in receipt-matcher / payment-reconciliation | **HOOG** |
| 5 | PERF-4 | Performance | Ongelimiteerde GDPR-export queries | **HOOG** |
| 6 | SEC-3/TS-2 | Security+Types | FormData `as string` zonder null-check | **HOOG** |
| 7 | CS-2/3 | Code Smells | God-files (774 regels) en god-components (990 regels) | **MIDDEN** |
| 8 | CS-4 | Code Smells | Geslikte errors `.catch(() => {})` zonder logging | **MIDDEN** |
| 9 | PERF-7 | Performance | Ontbrekende paginatie op invoices/clients | **MIDDEN** |
| 10 | CS-7 | Code Smells | 4x gedupliceerde invoice templates (70% overlap) | **MIDDEN** |

---

*Dit rapport is gegenereerd als read-only analyse. Er zijn geen codewijzigingen doorgevoerd.*

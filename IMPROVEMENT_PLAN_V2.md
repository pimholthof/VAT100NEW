# VAT100 Verbeterplan V2 — Analyse & Stappenplan

> Gebaseerd op volledige code-analyse van 25 maart 2026.
> Vorig plan (V1) had 10 sprints, allemaal afgerond.

---

## Samenvatting Huidige Staat

**Sterktes:**
- Solide feature-complete MVP (facturen, offertes, bonnetjes, banking, AI agents, BTW overzicht)
- Goede server action architectuur met consistente `ActionResult<T>` pattern
- Zod-validatie op alle inputs, Nederlandse UX-teksten
- AI-agent systeem (reconciliatie, payment detection, anticipation, investment)
- Mooi design system ("Luminous Conceptualism"), PWA, Sentry monitoring

**Knelpunten gevonden:**

| Categorie | Ernst | Aantal items |
|-----------|-------|-------------|
| Architectuur & Performance | Hoog | 8 |
| Security & Betrouwbaarheid | Hoog | 6 |
| Code Kwaliteit & DRY | Middel | 7 |
| Testing | Middel | 5 |
| UX & Accessibility | Laag | 4 |

---

## Sprint 11: Database Transacties & Data-integriteit

Probleem: `createInvoice`, `updateInvoice`, `createQuote`, `duplicateInvoice` etc. doen multi-table writes zonder transactie. Bij een failure halverwege ontstaat inconsistente data. De handmatige "rollback" (delete invoice als lines falen) is niet betrouwbaar.

- [ ] **11a** `lib/supabase/server.ts` — Helper functie `withTransaction` toevoegen die Supabase RPC `begin/commit/rollback` wrapt
- [ ] **11b** `features/invoices/actions.ts` — `createInvoice` refactoren naar transactie
- [ ] **11c** `features/invoices/actions.ts` — `updateInvoice` refactoren (delete+insert lines = gevaarlijk zonder TX)
- [ ] **11d** `features/invoices/actions.ts` — `createCreditNote` en `duplicateInvoice` refactoren
- [ ] **11e** `features/quotes/actions.ts` — `createQuote`, `updateQuote`, `duplicateQuote` refactoren
- [ ] **11f** `features/quotes/actions.ts` — `convertQuoteToInvoice` refactoren (cross-table mutatie)

---

## Sprint 12: Performance — N+1 Queries & Dashboard Optimalisatie

Probleem: `getDashboardData()` doet 12 parallelle queries per pageload. De reconciliation agent doet N+1 queries (per uncategorized transactie een aparte receipt-query). Search filtering is client-side na volledige fetch.

- [ ] **12a** `features/dashboard/actions.ts` — `getDashboardData` opsplitsen in 3 server actions (stats, cashflow, vatDeadline) zodat ze onafhankelijk gecached kunnen worden
- [ ] **12b** `features/dashboard/actions.ts` — Database view of RPC voor dashboard stats (1 query i.p.v. 4)
- [ ] **12c** `features/dashboard/action-feed.ts` — `runReconciliationAgent` batch receipt lookup i.p.v. per-transaction query
- [ ] **12d** `features/invoices/actions.ts` — `getInvoices` search verplaatsen naar database-side (`ilike` filter)
- [ ] **12e** `features/receipts/actions.ts` — `getReceipts` search verplaatsen naar database-side
- [ ] **12f** `features/quotes/actions.ts` — `getQuotes` search verplaatsen naar database-side
- [ ] **12g** Pagination toevoegen aan alle list endpoints (nu ongelimiteerd ophalen)

---

## Sprint 13: Security Hardening

Probleem: Meerdere security gaps gevonden.

- [ ] **13a** `app/api/ai/chat/route.ts` — Authenticatie toevoegen (nu open voor iedereen). Rate limiter is in-memory (werkt niet bij meerdere instances/serverless)
- [ ] **13b** `app/api/ai/chat/route.ts` — Input sanitization en max length op `query` parameter
- [ ] **13c** `app/api/cron/overdue/route.ts` + `recurring/route.ts` — Verifieer CRON_SECRET header (nu geen auth check)
- [ ] **13d** `features/receipts/actions.ts` — `uploadReceiptImage` controleert MIME type maar niet magic bytes (content-type header is spoofbaar)
- [ ] **13e** `features/banking/actions.ts` — Rate limiting op GoCardless API calls (per user throttle)
- [ ] **13f** `lib/supabase/service.ts` — Service client aanroepen loggen met audit trail

---

## Sprint 14: Code DRY & Herstructurering

Probleem: Significante code duplicatie gevonden.

- [ ] **14a** Gedeelde `createWithLines` helper — `createInvoice`, `createQuote`, `duplicateInvoice`, `duplicateQuote` hebben vrijwel identieke insert+lines logica
- [ ] **14b** Gedeelde `updateWithLines` helper — `updateInvoice` en `updateQuote` zijn 95% identiek
- [ ] **14c** Gedeelde `generateNumber` + retry pattern — Invoice/Quote number generation met unique constraint retry is gedupliceerd
- [ ] **14d** `features/dashboard/action-feed.ts` — Agent error handling extracten naar `withAgentErrorHandling` wrapper (4x dezelfde try/catch + Sentry)
- [ ] **14e** Shared `formatAmount` helper — `Intl.NumberFormat("nl-NL", ...)` wordt 8+ keer inline aangemaakt
- [ ] **14f** `features/invoices/actions.ts` — Line amount berekening (`Math.round(qty * rate * 100) / 100`) op 4 plekken duplicated; centraliseer in `calculateLineAmount`
- [ ] **14g** `app/api/export/*.ts` — CSV export routes consolideren naar 1 generieke route met type parameter

---

## Sprint 15: Error Handling & Resilience

Probleem: Meerdere plekken waar errors stil gefaald worden of onvoldoende gehandeld.

- [ ] **15a** `features/dashboard/actions.ts` — Background agent calls (`.catch(console.error)`) moeten naar Sentry, niet console
- [ ] **15b** `features/banking/actions.ts` — `syncTransactions` gooit alle transacties weg als upsert faalt; batch in chunks
- [ ] **15c** `features/banking/actions.ts` — `autoCategorizeTransactions` slikt AI-fouten stil (`continue` in catch); log naar Sentry
- [ ] **15d** `features/dashboard/actions.ts` — `getDashboardData` error handling: als 1 van 12 queries faalt, faalt alles. Graceful degradation toevoegen
- [ ] **15e** `app/api/ai/chat/route.ts` — Retry logica voor Anthropic API calls (transient failures)
- [ ] **15f** `features/invoices/actions.ts` — `processOverdueInvoices` sequential loop → parallel met `Promise.allSettled`

---

## Sprint 16: Testing Uitbreiden

Probleem: Slechts 5 test files. Geen tests voor de meest complexe logica (dashboard, banking, agents).

- [ ] **16a** `features/dashboard/actions.test.ts` — `calculateSafeToSpend` unit tests (belastingberekening kritiek)
- [ ] **16b** `features/tax/actions.test.ts` — `getBtwOverview` kwartaal-toewijzing en afrondingstests
- [ ] **16c** `features/dashboard/action-feed.test.ts` — Reconciliation agent matching logica testen
- [ ] **16d** `features/dashboard/action-feed.test.ts` — Payment detection confidence scoring testen
- [ ] **16e** `features/banking/actions.test.ts` — `autoCategorizeTransactions` rule matching en AI fallback
- [ ] **16f** E2E test: volledige factuur flow (create → send → mark paid)
- [ ] **16g** E2E test: offerte naar factuur conversie

---

## Sprint 17: AI Chat Verbeteren

Probleem: `/api/ai/chat` is momenteel een stateless demo zonder user context.

- [ ] **17a** Authenticatie toevoegen en echte user data ophalen (factuur stats, openstaande bedragen)
- [ ] **17b** Context injection: recente facturen, BTW status, en cashflow data meesturen
- [ ] **17c** Conversation history ondersteunen (nu single-turn)
- [ ] **17d** Structured output voor acties ("Maak een factuur voor X" → pre-filled form)
- [ ] **17e** Streaming response implementeren voor betere UX

---

## Sprint 18: Recurring Invoices Afmaken

Probleem: Er is een migration voor `recurring_invoices` tabel maar geen feature code gevonden.

- [ ] **18a** `features/invoices/recurring-actions.ts` — CRUD voor recurring invoice templates
- [ ] **18b** `app/api/cron/recurring/route.ts` — Implementatie afmaken (genereer facturen op schema)
- [ ] **18c** UI voor recurring invoice beheer in dashboard
- [ ] **18d** `features/dashboard/actions.ts` — Recurring invoices tonen in dashboard overzicht

---

## Sprint 19: Type Safety & Supabase Types

Probleem: Veel `as unknown as X` casts door gebrek aan gegenereerde Supabase types.

- [ ] **19a** `npx supabase gen types typescript` — Gegenereerde types toevoegen
- [ ] **19b** Supabase client typeren met `Database` generic: `createClient<Database>()`
- [ ] **19c** Alle `as unknown as X` casts verwijderen na type generation
- [ ] **19d** `features/invoices/actions.ts` — `InvoiceWithClient` type afleiden van Supabase types i.p.v. handmatig

---

## Sprint 20: UX Verbeteringen

- [ ] **20a** `app/layout.tsx` — `userScalable: false` verwijderen (accessibility anti-pattern, blokeert zoom)
- [ ] **20b** Optimistic updates toevoegen voor status wijzigingen (factuur markeren als betaald)
- [ ] **20c** `components/ui/Table.tsx` — Sorteerbare kolommen toevoegen
- [ ] **20d** `features/invoices/components/InvoiceForm.tsx` — Keyboard shortcuts voor snel invullen

---

## Prioritering (Aanbevolen Volgorde)

| Prioriteit | Sprint | Reden |
|-----------|--------|-------|
| 1 | Sprint 13 (Security) | Open API endpoint = direct risico |
| 2 | Sprint 11 (Transacties) | Data-integriteit is fundamenteel |
| 3 | Sprint 15 (Error Handling) | Stille failures maskeert bugs |
| 4 | Sprint 12 (Performance) | Dashboard is N+1 heavy |
| 5 | Sprint 14 (DRY) | Vermindert onderhoudslast |
| 6 | Sprint 16 (Testing) | Vangt regressies na refactors |
| 7 | Sprint 19 (Types) | Developer experience |
| 8 | Sprint 17 (AI Chat) | Feature enhancement |
| 9 | Sprint 18 (Recurring) | Feature completion |
| 10 | Sprint 20 (UX) | Polish |

---

## Snelle Wins (< 15 min elk)

1. **`app/layout.tsx:11`** — Verwijder `userScalable: false` (a11y fix)
2. **`app/api/ai/chat/route.ts`** — Voeg auth check toe met `requireAuth()`
3. **`features/dashboard/actions.ts:96-99`** — Vervang `console.error` door `Sentry.captureException`
4. **`features/invoices/actions.ts`** — Extracteer `formatAmount` helper
5. **`app/api/cron/*.ts`** — Voeg `CRON_SECRET` header verificatie toe

---

*Plan opgesteld: 25 maart 2026*

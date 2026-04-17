# UX Sprint Log — `claude/vat100-ux-review-4weFW`

Compact overview of the UX sprint on this branch. Keep this short and factual
so a fresh session can pick up without re-reading every diff.

## Original plan

`/root/.claude/plans/jij-bent-een-senior-clever-teapot.md` — 8 items across two
sprints. Most have landed; the "still open" section below lists what's left.

## What shipped (newest first)

1. **`e83f9cf`** · Onboarding flow — stepped header, Button components, bank
   step with value bullets, KOR/urencriterium consequence hints.
2. **`586409c`** · Admin `/klanten/feedback` → conversational inbox: filter
   pills (Alles/Onbeantwoord), card rows, shared MessageBubble with customer
   side, unanswered badge on admin home.
3. **`b79d0bd`** · Klant-kant chat unified: `TaxAgentChat` rewritten (design
   tokens, safe markdown — no more `dangerouslySetInnerHTML` XSS), `BerichtenPage`
   timestamps + date headers, slim route-headers.
4. **`dffbfca`** · Overdue nav badge links to `?status=overdue`; SearchFilter
   gained `initialFilters` prop.
5. **`82a8b72`** · Mobile BTW hint, mobile breadcrumb collapse, InvoiceTotals
   no longer AnimatedNumber (hero count-up was too busy), QuickActionMenu
   singular labels + hints.
6. **`4ff8251`** · Richer invoice-line placeholder + autofocus client select on
   `/invoices/new`.
7. **`204dc06`** · Overdue count badge on Facturen nav link (server-side count
   query in `app/dashboard/layout.tsx`).
8. **`608cb02`** · `UpcomingInvoiceTable` feedback → `useToast`.
9. **`ab07c86`** · Overdue urgency on invoice list ("3 dagen te laat" /
   "Vervalt morgen").
10. **`d3ce508`** · Credit note + delete confirm dialogs show invoice number,
    client, amount.
11. **`821ed48`** · Removed dead "Terug naar concept" button; added Markeer
    als betaald for overdue.
12. **`77cb973`** · Share-link strip — one row, ellipsis URL, Kopieer + Open.
13. **`2f1c2ab`** · Invoice status bar grouped into flow-actions vs
    maintenance (with 0.5px divider).
14. **`98643cd`** · Loading spinner on ClientForm + RecurringInvoiceForm.
15. **`e1ef143`** · Cmd+K on mobile via new `lib/events/command-menu.ts`
    event + visible search-icon button.
16. **`a748dd2`** · `aria-current="page"` on sidebar + mobile bottom nav.
17. **`ee040ff`** · Duplicate invoice number detection (`checkInvoiceNumberExists`)
    with inline "Genereer een nieuw nummer" link.
18. **`439bc28`** · ClientForm email/KvK/BTW use `FieldGroup` error/hint
    (auto aria-describedby + aria-invalid).
19. **`8b44c5b`** · Motion calibration — dashboard stagger 120ms → 40ms,
    `AnimatedNumber` skips first render + sub-€1 deltas, global
    `prefers-reduced-motion` media query.
20. **`70b8b5d`** · BTW rubriek explainer + "Volgende stap · Dien in"
    callout with Belastingdienst deep-link.
21. **`bdbd951`** · "Versturen aan <klant>" CTA, BTW reserve "Niet jouw geld"
    hint on dashboard StatCard.
22. **`01a43f8`** · Cmd+K entity search + recent navigation
    (`useSyncExternalStore`-backed `useRecentNav`).
23. **`3324a0e`** · `Button` `loading` prop + spinner keyframe; empty states
    with client-dependency ("Begin met een klant" vs "Nieuwe factuur").
24. **`24efaec`** · `HealthScore` rewritten as **signals** (no score/grade);
    `OnboardingChecklist` hides completed steps, gains minimize toggle.
25. **`41f0430`** · Toast `action` + 8s undo window; FieldGroup error/hint
    auto-wires aria; invoice status changes have undo.
26. **`c24b0dd`** · Fixed "500% staat open" openRatio bug; softer HealthScore
    (first rev — superseded by `24efaec`).
27. **`6660428`** · Live invoice preview side-by-side on desktop (≥1200px)
    + toggle on mobile wizard step 3.

## Patterns + building blocks introduced

- **`components/ui/Button.tsx`** — `loading?: boolean` on `Button`,
  `ButtonPrimary`, `ButtonSecondary`. Shows border-spinner with `aria-busy`.
- **`components/ui/Toast.tsx`** — supports `{ action: { label, onClick }, duration }`;
  action toasts stay 8s; backwards-compatible with `toast(msg, type)`.
- **`components/ui/FieldGroup.tsx`** — optional `error` + `hint` props
  auto-wire `aria-describedby` + `aria-invalid` onto the child input.
- **`components/ui/StatCard.tsx`** — optional `hint` slot (italic helper
  under the `sub` line).
- **`lib/hooks/useRecentNav.ts`** — module-level store +
  `useSyncExternalStore`. Tracks path navigation, resolves paths to human
  labels. Used by `CommandMenu`.
- **`lib/events/command-menu.ts`** — `COMMAND_MENU_OPEN_EVENT` + `openCommandMenu()`
  for externally triggering Cmd+K (mobile search button, etc).
- **`features/invoices/components/InvoiceLivePreview.tsx`** — constructs a
  placeholder `InvoiceData` from `useInvoiceStore` + live `getProfile` /
  `getClients` queries, scales `InvoiceHTML` via CSS transform.
- **`features/tax/components/AangifteExplainer.tsx`** — collapsible per-rubriek
  explainer on the tax page.
- **Message bubbles** — shared visual language across `TaxAgentChat`,
  `BerichtenPage`, and admin `/klanten/feedback`: sender label (editorial
  uppercase), bubble, timestamp, date-group headers.

## Design decisions worth remembering

- **Drop score/grade metaphor for HealthScore** — users of a fiscal tool
  don't benefit from school grades. Signals sorted by severity + direct CTA
  links outperform "B · 65/100".
- **Sparse-data guard in `lib/tax/financial-health.ts`** — new accounts with no
  invoices/revenue get a minimum score of 55 and a neutral "Je bent net
  begonnen" summary instead of a demotivating D/F.
- **Reserved amber/red** — `factorBarColor()` uses amber only below score 40
  and neutral grey for mid-range. Accent red is for *real* urgency.
- **Live preview is debounced via `useDeferredValue`**, not a manual debounce.
- **Chat AI output is rendered safely**: minimal inline parser for `**bold**`
  + bullet lines. No `dangerouslySetInnerHTML`.

## Still open (from the plan)

- **Receipt-capture flow** — `/dashboard/receipts/new` with AI confidence
  indicator UX was flagged in the original review. Never touched.
- **Settings page** — second-most-visited page once the user is configured.
  Never touched.
- **Quote/offerte flow** — didn't inherit the invoice-list urgency, status
  grouping, or confirm-dialog context improvements.
- **CashflowForecast** data-viz — basic SVG sparkline, could show trend
  annotations without getting heavy.
- **Error routes** — `error.tsx` files are presumably generic.
- **Mobile invoice wizard** — only preview toggle was added; the wizard
  itself wasn't polished.
- **CLAUDE.md ↔ CSS DNA mismatch** — project doc says "Luminous Conceptualism"
  (pure B/W), `styles/globals.css:9-22` is "Editorial Brutalism" (warm paper
  `#f4f3f1`, crimson `#A51C30`). Strategic decision required before further
  visual polish.
- **Keyboard-nav audit** — only nav has `aria-current`; no list keyboard
  shortcuts (j/k), no focus-trap verification on modals.
- **Form autosave + resume** on onboarding — if a user abandons mid-flow
  they start over.

## Branch protocol

All work lands on `claude/vat100-ux-review-4weFW`. Tests/lint before
commit: `npm run typecheck` + `npm run lint` (prebuild env-check fails
without runtime secrets — expected). No PR has been opened.

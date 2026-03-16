# VAT100 — Project Context for Claude Code

## What is this?
VAT100 is a bookkeeping/invoicing app for Dutch creative freelancers. Next.js 15, React 19, Tailwind CSS 4, Supabase, Zustand, TanStack Query.

## Design system
- **Aesthetic:** Editorial brutalism — gedrukt materiaal gevoel, typografisch gedreven, extreme whitespace
- **Fonts:** Inter (body: 300/400/500) + Space Grotesk (display: 700) + JetBrains Mono (data/numbers: 300/400)
- **Font usage:**
  - --font-display: titels, logo, grote cijfers in stat cards
  - --font-body: lopende tekst, namen, adressen, navigatie
  - --font-mono: bedragen, datums, factuurnummers, KVK/BTW/IBAN, tabeldata
- **Labels:** 9px, uppercase, letter-spacing 0.08em, font-weight 500 — voor alle micro-labels (tabelkoppen, form labels, stat card labels, nav items)
- **Colors:** `--foreground: #0D0D0B`, `--background: #FAFAF8` — no greys, only opacity
- **Border-radius:** 0px everywhere (enforced globally in CSS)
- **Borders:** altijd 0.5px, altijd rgba — nooit solid kleuren
- **Buttons:** twee stijlen — "primary" (solid bg) en "ghost" (transparent + border) — beide uppercase label stijl
- **All tokens** in `styles/globals.css` as CSS custom properties

## Critical rules
- `npm run build` must pass after every change
- Visual output must be PIXEL-PERFECT identical after refactors
- **DO NOT touch** `components/invoice/InvoiceHTML.tsx` styles (A4 preview, pixel-exact)
- **DO NOT touch** `components/invoice/InvoicePDF.tsx` Font.register() calls (react-pdf's own font system)
- All text/labels are in Dutch (NL)
- The app is light-mode only, no dark mode

## Architecture notes
- Server actions in `lib/actions/` return `ActionResult<T>` = `{ error: string | null; data?: T }`
- Exception: `lib/invoice/fetch.ts` throws errors (to be fixed)
- Zustand store in `lib/store/invoice.ts` for invoice form state
- TanStack Query for all data fetching in client components
- Supabase RLS handles authorization per-table

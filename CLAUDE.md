# VAT100 — Project Context for Claude Code

## What is this?
VAT100 is a bookkeeping/invoicing app for Dutch creative freelancers. Next.js 15, React 19, Tailwind CSS 4, Supabase, Zustand, TanStack Query.

## Design system
- **Aesthetic:** Bauhaus 2.0 / Teenage Engineering — strict monochrome, zero border-radius, 1–2px borders, 8px grid
- **Fonts:** Barlow (body: 300/400/500) + Barlow Condensed (display: 900)
- **Colors:** `--foreground: #0D0D0B`, `--background: #FAFAF8` — no greys, only opacity
- **Border-radius:** 0px everywhere (enforced globally in CSS)
- **All tokens** are in `styles/globals.css` as CSS custom properties

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

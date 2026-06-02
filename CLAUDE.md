# VAT100 — The Conceptual Monolith

## What is this?
VAT100 is a forward-thinking fiscal engine for Dutch creative freelancers. It strips all software clutter to provide a pure reflection of financial reality. Next.js 15, React 19, Tailwind CSS 4, Supabase.

## Design system: "Warm Editorial Minimalism" (Luminous Conceptualism, executed warm)
- **Ancestral DNA:** Dieter Rams (Less but better), Jony Ive (Precision), Donald Judd (Geometric clarity), James Turrell (Atmospheric light).
- **Aesthetic:** High-end editorial restraint, warm light-mode minimalism, "Apple-level" finish.
- **Philosophy:** If an element doesn't solve a fiscal problem, it should not exist. The UI is a "perceptual space".
- **Palette** (light mode is forced — no dark theme; tokens live in `styles/globals.css`):
  - `--foreground: #1a1a19` (Obsidian Ink — off-black, softer than pure black)
  - `--background: #f4f3f1` (Warm Paper — trust meets warmth)
  - `--color-accent: #A51C30` (Crimson — primary accent, used sparingly)
  - States: `--color-success #1a7a3a` · `--color-warning #b45309` · `--color-overdue #C44D2A` · `--color-info #2D5A7B`
- **Surfaces:** `.glass` — luminous raised panel: white @ 55% opacity + `blur(20px) saturate(150%)` + 0.5px border. Same blur language as the nav and dialogs.
- **Borders:** Judd-inspired 0.5px architectural lines (rgba(0,0,0,0.06–0.08)). Radii via `--radius` (12px) + `--radius-sm/md/lg/xl`.
- **Interactions:** Rams-inspired functionality, Ive-inspired precision transitions (`--ease-out-expo`; duration hierarchy 100/200/350/500ms).
- **Typography:** Geist (Geist Sans / Geist Mono) as the primary type family. Tabular numerals on all amounts; wide editorial tracking (0.18em) on uppercase `.label`s.

## Critical rules
- `npm run build` must pass after every change.
- All text/labels are in Dutch (NL).
- **Modern Next.js**: Server Components and Server Actions (Lib/actions).

## Architecture notes
- **Single Canvas**: Consolidate all views into a fluid, unified experience.
- **Predictive Calm**: The system anticipates fiscal deadlines and suggests one-click actions.
- **Essential Math**: Invoicing is reduced to its mathematical core (Amount + Recipient).

# VAT100 — Design language

## Canonieke identiteit: "Luminous Conceptualism"

Dit is de officiële naam van het ontwerpsysteem (zie `CLAUDE.md`). Sommige
oudere code-commentaren noemen het "Editorial Brutalism" — dat is een
verouderde naam en mag bij aanraking worden gemigreerd naar Luminous
Conceptualism. Eén naam, overal.

**Ancestral DNA:** Dieter Rams (less but better), Jony Ive (precisie),
Donald Judd (geometrische helderheid), James Turrell (atmosferisch licht).

**Filosofie:** als een element geen fiscaal probleem oplost, bestaat het niet.
Extreme light-mode, hoog contrast, Apple-niveau afwerking.

## Tokens (bron: `styles/globals.css`)

Gebruik **altijd** tokens, nooit losse hex-waarden in componenten.

| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--foreground` | `#1a1a19` (obsidiaan-inkt) | tekst, lijnen |
| `--background` | `#f4f3f1` (warm papier) | achtergrond |
| `--color-accent` | `#A51C30` (karmijn) | fouten, accenten — spaarzaam |
| `--color-success` | `#1a7a3a` | betaald/geslaagd |
| `--color-overdue` | `#C44D2A` | te laat |
| `--color-info` | `#2D5A7B` | informatief |
| `--border-light` | `0.5px solid rgba(0,0,0,0.08)` | Judd-lijnen |
| `--radius` / `--radius-sm` | `12px` / `4px` | hoeken |

**Typografie:** Geist (sans/mono) als primair; bedragen in mono. Tracking voor
displays `-0.04em`, labels `0.18em` (wijd, editorial).

**Opacity-hiërarchie (4 niveaus):** `1 / 0.55 / 0.35 / 0.15` — niet
improviseren met tussenwaarden.

**Beweging:** Ive-precisie. `--duration-quick` (200ms) met
`--ease-out-expo`. Respecteer `prefers-reduced-motion`.

## Regels

- Geen losse `text-red-*` / `bg-green-*`; gebruik de semantische tokens.
- Borders zijn 0.5px architectonische lijnen, geen zware kaders.
- Glas-effect via `.glass` (Turrell-diepte), spaarzaam.
- Light-mode is geforceerd; ontwerp niet voor dark mode.
- Nieuwe componenten: tokens + (waar herhaald) een CSS-module, geen
  inline-style-wildgroei.

---
description: Stage 5 — Testmatrix draaien. npm run build moet slagen.
---

Je bevindt je in stage **Test**. CLAUDE.md eist dat `npm run build` na elke wijziging slaagt.

## Verplichte volgorde

Draai in deze volgorde, stop bij de eerste falende stap, fix, herstart:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test` (Vitest, unit)
4. `npm run build`

## Conditioneel

Draai daarnaast alleen als de genoemde scope is geraakt:

- Auth / (auth)-routes / middleware gewijzigd → `npm run e2e` op relevante spec.
- Invoice / tax / banking / payments gewijzigd → `npm run e2e` op betreffende flow **én** extra Vitest rond pure berekeningen.
- `.env`-schema / `lib/env.ts` gewijzigd → `npm run check-env`.
- Afhankelijkheden gewijzigd → `npm run security:audit`.
- Performance-gevoelige wijziging → `npm run test:perf`.

## Rapportage

Per stap: één regel met ✅ of ❌ + korte samenvatting. Bij falen: het exacte foutfragment (niet de hele stacktrace) en de fix-strategie.

## Niet doen

- Geen `--no-verify`, geen skips, geen gebypassde hooks.
- Geen tests toevoegen die alleen bestaan om groen te kleuren; test gedrag, niet implementatie.
- Falende test niet "tijdelijk" uitschakelen.

Sluit af met: **doorgaan naar /ship** of **blokkerend probleem** + root cause.

Argument: $ARGUMENTS

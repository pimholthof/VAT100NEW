---
description: Stage 2 — Implementatieplan conform Next.js 15 + Server Components + NL labels.
---

Je bevindt je in stage **Plan** van de VAT100-workflow. `/think` moet eerst groen zijn.

Lever een compact implementatieplan. Geen proza, geen "wat is X"-uitleg.

## 1. Scope
- Eén zin: wat bouwen we.
- Niet-doelen: wat expliciet niét bij deze wijziging hoort.

## 2. Bestanden
Lijst bestanden die je gaat maken/wijzigen. Voor elk:
- Pad
- Server Component / Client Component / Server Action / Route handler / lib-utility
- Eén regel: wat erin verandert.

Conventies:
- Server Actions → `lib/actions/<domein>.ts` (niet in route handlers tenzij REST echt nodig).
- Client Components alleen bij interactie, state, of browser-API's. Rest is Server Component.
- Features onder `features/<domein>/`. Herbruikbare UI onder `components/ui/`.

## 3. Data & fiscale randen
- Welke Supabase-tabellen worden gelezen/geschreven? RLS-check nodig?
- Welke BTW-tarieven raakt dit (0/9/21 % / verlegd / KOR)?
- Afrondingen: cent-precisie, `Math.round` op (bedrag × 100) / 100 of Decimal?
- Tijdzone: altijd `Europe/Amsterdam` voor deadlines.
- Edge cases: negatief bedrag, creditfactuur, jaargrens, kwartaalgrens.

## 4. NL-labels
Tabel `key → NL-tekst` voor alle nieuwe UI-strings. Geen Engelse placeholders die "later" vertaald worden.

## 5. Visuele tokens
- Welke `.glass` / border / typografie-primitives uit CLAUDE.md worden gebruikt.
- Geen nieuwe kleuren of shadow-varianten zonder expliciete reden.

## 6. Testplan
- Unit-tests (Vitest): welke pure functies.
- E2E (Playwright): alleen als de happy path door meerdere routes loopt.
- Handmatig: welke scherm-flow loop je af.

## 7. Risico's
Max 3. Per risico: de mitigatie.

Argument: $ARGUMENTS

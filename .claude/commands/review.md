---
description: Stage 4 — Review op fiscale correctheid, architectuur en stijl.
---

Je bevindt je in stage **Review**. Lees de wijzigingen en check onderstaande matrix. Rapporteer per categorie: ✅ / ⚠️ / ❌ met één regel bewijs (bestand:regel).

## Fiscale correctheid
- BTW-tarieven: 0 / 9 / 21 / verlegd / KOR correct toegepast? Hardcoded 21 is verdacht.
- Afronding: geldbedragen in centen of via consistente afrondstrategie. Geen `toFixed(2)` op ruwe floats voor sommatie.
- Datum/tijd: deadlines in `Europe/Amsterdam`, geen UTC-drift. Kwartaalgrenzen correct (Q1 tot en met 31 maart).
- Audit trail: elke fiscaal-relevante mutatie schrijft naar `lib/audit` of logging.
- Idempotentie bij financiële writes (dubbele submit = geen dubbele boeking).

## Architectuur
- Server vs Client boundary logisch gekozen, geen onnodige `"use client"`.
- Server Actions valideren input met Zod.
- Supabase-calls respecteren RLS; geen service-role-key in code pad bereikbaar vanaf browser.
- Geen secrets in client-bundle (check imports vanuit `"use client"`-bestanden).

## UI / stijl
- Alle nieuwe strings NL.
- Geen nieuwe kleuren / shadows / borders buiten de design tokens.
- Geen decoratie zonder fiscale functie.
- Geist-typografie gebruikt.

## Code-hygiëne
- Geen dode code, geen `console.log` die blijft staan.
- Geen commentaar dat "wat" uitlegt in plaats van "waarom".
- Geen over-engineering: abstracties met één call-site zijn verdacht.
- Geen backwards-compat shims voor code die nog niet shipped was.

## Security (snelle pass)
- Input gesanitized aan de rand.
- Geen `dangerouslySetInnerHTML` met user-content.
- Rate limiting actief op mutaties die geld raken.

Sluit af met: **doorgaan naar /test** of **eerst fixen**, en bij fixen een beknopte action list.

Argument: $ARGUMENTS

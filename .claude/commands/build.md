---
description: Stage 3 — Implementatie met Luminous Conceptualism constraints.
---

Je bevindt je in stage **Build**. Volg het plan uit `/plan`. Afwijken = eerst melden en toestemming vragen.

## Harde constraints

**Taal**
- Alle UI-strings, labels, errors, placeholders, emails: Nederlands. Geen mengvorm.
- Code, variabelen, types: Engels (zoals elders in het project).

**Architectuur**
- Server Components tenzij echt interactief nodig.
- Server Actions in `lib/actions/<domein>.ts`, inputvalidatie met Zod.
- Geen `useEffect` voor datafetching als een Server Component het ook kan.
- Alleen validatie aan de randen (user input, externe API). Interne code vertrouwt types.

**Design system**
- Kleuren: `#000000` foreground, `#FFFFFF` background. Geen tussentinten zonder reden.
- Borders: 0.5px, `rgba(0,0,0,0.05)`.
- Glass: bestaande `.glass` utility, niet opnieuw schrijven.
- Typografie: Geist sans/mono. Geen andere fonts.
- Geen decoratieve iconen, illustraties of "empty state"-plaatjes zonder fiscale functie.

**Code-stijl**
- Geen commentaar dat herhaalt wat de code al zegt.
- Geen error-handling voor onmogelijke scenario's.
- Geen feature flags of backwards-compat shims, tenzij het plan ze voorschrijft.
- Drie vergelijkbare regels > premature abstractie.

## Werkwijze
1. Maak/wijzig de bestanden uit het plan, in volgorde van afhankelijkheid.
2. Na elke logische stap: noem één zin wat je deed.
3. Raak je een scope-grens? Stop, vraag bevestiging.

Argument: $ARGUMENTS

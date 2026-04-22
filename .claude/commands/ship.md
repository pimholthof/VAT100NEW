---
description: Stage 6 — Pre-flight en push. Respecteert fiscale deadline-vensters.
---

Je bevindt je in stage **Ship**. Alle eerdere stages moeten groen zijn.

## Pre-flight checklist

Loop deze puntsgewijs langs en rapporteer ✅ / ❌ per regel.

1. `git status` schoon op files die je niet bedoelde te wijzigen.
2. `npm run check-env` slaagt — alle verwachte env-vars documenteerbaar.
3. Sentry-config intact: `sentry.client.config.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts`.
4. Supabase-migraties (`supabase/`): elke nieuwe migration heeft een rollback-strategie of is idempotent.
5. `vercel.json` en `next.config.ts` niet per ongeluk aangepast.
6. Geen secrets in diff (`git diff` scannen op `SUPABASE_SERVICE`, `ANTHROPIC_API_KEY`, `RESEND`, …).
7. PWA-manifest (`app/manifest.ts`) en offline-route nog consistent als je routing raakte.

## Deadline-venster-check

Nederlandse BTW-kwartaalaangiften vervallen uiterlijk de laatste dag van de maand volgend op het kwartaal (30 apr / 31 jul / 31 okt / 31 jan). IB-aangifte typisch 1 mei.

- Ben je binnen **72 uur** van een dergelijke deadline?
  - Raak je dan code die aangifte-berekening, export of Digipoort-koppeling beïnvloedt? → **NIET shippen**, meld dit en wacht of beperk de PR tot niet-fiscale wijzigingen.
  - Geen impact op die paden? → shippen mag, wees extra kritisch op de diff.

## Push

- Branch: `claude/apply-gstack-to-vat100-E3di0` (of de actieve feature-branch — nooit direct naar `main`).
- `git push -u origin <branch>`.
- Géén auto-merge, géén force-push, géén `--no-verify`.
- PR alleen aanmaken als de user daar expliciet om vraagt.

## Na de push

- Noem de branchnaam en de laatste commit-SHA.
- Stel voor: `/reflect` draaien.

Argument: $ARGUMENTS

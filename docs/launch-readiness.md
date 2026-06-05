# VAT100 — Launch readiness (bèta)

Single source of truth voor de status richting de gratis bèta-lancering.
Bijgewerkt: 2026-06-03.

## Gereed (op de bèta-branch)

**Fiscaal**
- BTW-rubrieken gecorrigeerd naar het officiële OB-model (0%→1e, uitvoer→3a,
  geen dubbeltelling 2a, hele-euro-afronding).
- IB-projectie: KIA wordt vóór de MKB-winstvrijstelling afgetrokken.
- 2026-constanten geverifieerd (zie `fiscal-constants-2026.md`).
- Fiscale disclaimers ("indicatie, geen belastingadvies") op BTW/IB.

**Bèta & activatie**
- Gratis bèta via uitnodigingscode (één vlag `NEXT_PUBLIC_BETA_MODE`).
- Onboarding-frictie weg (KVK/BTW optioneel + overslaan).
- Voorbeeld-showcase + activerende lege staten.
- Wrijvingsloze feedback (widget + in-context "kloppen de cijfers?") + admin-inbox.
- Activatie-funnel (`/admin/analytics`).

**Security & compliance**
- Digipoort veilig uit (feature-flag + productie-guard tegen nep-"accepted").
- Impersonation-auditspoor (tamper-proof, IP/duur, `/admin/impersonation`).
- AVG: data-export (`/api/export/my-data`) + verwijderverzoek.
- Bestaand: RLS breed, timing-safe cron-secret, Mollie-webhook-verificatie,
  security-headers (HSTS, X-Frame-Options, nosniff, frame-ancestors).

**Kwaliteit**
- `npm run build`, typecheck, lint groen; 405 unit tests groen; CI-gate actief.
- Mobiel geverifieerd (landing/register/login op 390px).

**Minimalisatie (juni 2026)**
- Expliciete AI verwijderd (assistent/chat/quota/managed-agent in de UI);
  OCR + bank-categorisatie blijven onder de motorkap. Geen "AI" meer in UI,
  copy of prijzen.
- Routes geconsolideerd, admin-nav geslankt, groei-extra's achter
  `NEXT_PUBLIC_GROWTH_ENABLED` (default uit).
- Self-service abonnementsbeheer (wijzigen/opzeggen) aangesloten.

## Bekende follow-ups

| Item | Status | Toelichting |
|------|--------|-------------|
| CSP `script-src 'unsafe-inline'` weg (nonces) | **Uitgesteld (bèta-WONTFIX)** | Vereist per-request nonce in middleware + runtime-verificatie; breekt-risico op Next/Mollie/Sentry-scripts. Gemitigeerd door strakke `connect/frame/script`-allowlist + HSTS/X-Frame/nosniff/frame-ancestors. Oppakken vóór schaal/betaald. |
| `style-src 'unsafe-inline'` weg | Geblokkeerd door inline-styles | Vereist de grote inline-style→tokens refactor (B2). Laag risico (style-injectie < script-injectie). |
| Arbeidskorting-max / AHK-afbouwgrens | **Afgetekend voor bèta (2026-06-05)** | Cross-check de ≤ €27-randwaarden vóór betaald; zie `fiscal-constants-2026.md`. |
| Inline-style-opschoning (B2) | Uitgesteld | Cosmetisch/maintainability; visueel al strak. |
| Mobiele verificatie auth-schermen | Uitgesteld | Dashboard/onboarding/voorbeeld op de preview met bèta-account. |
| Volledige wissing na bewaartermijn | Processtap | `deletion_requested_at` gevuld; admin/cron voert de wissing uit. |

## Operationeel — vóór livegang

1. **Migraties draaien** op Supabase — álle in `supabase/migrations/`, incl.
   `20260602_001_feedback`, `20260602_002_impersonation_sessions` en
   `20260602_003_account_deletion_request`. De AI-opruim-migraties
   `20260602_001_remove_ai_quota` en `20260602_002_debrand_plan_features`
   zijn gedraaid.
2. **Env-vars** zetten (productie): `NEXT_PUBLIC_BETA_MODE=true`,
   `BETA_INVITE_CODE`, `NEXT_PUBLIC_DIGIPOORT_ENABLED=false`,
   `NEXT_PUBLIC_GROWTH_ENABLED=false` (groei-extra's verborgen), plus de
   verplichte keys (Supabase, Mollie, Resend, **Anthropic** — nog steeds nodig
   voor bon/factuur-OCR —, `CRON_SECRET`, `EMAIL_FROM`).
3. **Fiscalist/RB** tekent de BTW-rubrieken en IB-constanten af. ✅ Afgetekend
   voor de bèta (2026-06-05); cross-check de randwaarden vóór betaald.
4. **Verwerkersovereenkomsten** sluiten (zie `subverwerkers.md`); Supabase in
   EU-regio; privacyverklaring aanvullen met alle sub-verwerkers.
5. **Monitoring/backups** aan (zie `monitoring.md`); Sentry-alerts live; PITR aan.
6. Optioneel: `npm run security:audit`, E2E tegen staging.

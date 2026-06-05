# VAT100 — Launch-stappenplan (bèta)

Praktische checklist voor de **gratis bèta-lancering**. De code is klaar; dit
zijn de operationele, juridische en fiscale stappen die buiten de repo liggen.
Werk van boven naar beneden af. Zie ook `launch-readiness.md` (status) en
`subverwerkers.md` (AVG-register).

> **Kortste pad naar "het draait technisch":** stappen **1 → 2 → 4 → 5 → 9**.
> Vóór je écht breed uitnodigt: ook **6 → 7** (juridisch/fiscaal) rond hebben.

## 🟦 Supabase (database)

- [ ] **1. EU-regio** — zet de database in een EU-regio of verifieer dat 'ie er
  al staat.
- [ ] **2. Migraties draaien** — pas álles in `supabase/migrations/` toe
  (`supabase db push` of de SQL-editor). Controleer dat deze erbij zitten:
  `20260602_001_feedback`, `20260602_002_impersonation_sessions`,
  `20260602_003_account_deletion_request`.
- [ ] **3. Backups** — zet **PITR** (point-in-time recovery) aan.

## 🟩 Vercel (productie)

- [ ] **4. Env-vars zetten** (Settings → Environment Variables → Production):
  - **Verplicht:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`, `MOLLIE_API_KEY`, `RESEND_API_KEY`,
    `EMAIL_FROM`, `ANTHROPIC_API_KEY` (bon/factuur-OCR), `CRON_SECRET`
  - **Bèta:** `NEXT_PUBLIC_BETA_MODE=true`, `BETA_INVITE_CODE=<jouw code>`,
    `NEXT_PUBLIC_DIGIPOORT_ENABLED=false`
  - **Monitoring:** `NEXT_PUBLIC_SENTRY_DSN`
  - **Optioneel (bank/KVK):** `TINK_CLIENT_ID`, `TINK_CLIENT_SECRET`,
    `KVK_API_KEY`
  - Laat `NEXT_PUBLIC_GROWTH_ENABLED` weg of op `false` → groei-extra's blijven
    verborgen.
- [ ] **5. Redeploy** zodat de env-vars actief worden.

## 🟧 Juridisch & fiscaal (vóór échte gebruikers — mag parallel)

- [ ] **6. DPA's sluiten** met Supabase, Vercel, Mollie, Resend, Anthropic,
  Sentry en Tink (lijst in `subverwerkers.md`). Borg SCC voor de niet-EU-
  partijen (Resend, Anthropic, Sentry, Vercel).
- [x] **7. Fiscalist/RB** — **BTW-rubrieken** + **IB-constanten 2026** afgetekend
  voor de bèta (2026-06-05). Cross-check de ≤ €27-randwaarden vóór betaald
  (zie `fiscal-constants-2026.md`).

## 🟨 Monitoring

- [ ] **8. Sentry-alerts** aanzetten (DSN uit stap 4).

## 🟪 Test & go-live

- [ ] **9. Rook-test** met een invite-code: registreren → bedrijfsgegevens →
  factuur maken → bon scannen (OCR) → BTW-overzicht → feedback-widget. Werkt
  dit, dan kloppen je env-vars én migraties.
- [ ] **10. Eerste bèta-gebruikers uitnodigen** (deel de invite-code).

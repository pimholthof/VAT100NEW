# Mollie Subscription Lifecycle — QA Runbook

**Eigenaar:** Founder/Tech lead
**Uit te voeren:** uiterlijk 26 mei 2026 (code-freeze) en nogmaals bij elke deploy die payments/`features/subscriptions/` of `/app/api/webhooks/mollie/` raakt.
**Duur:** ~90 minuten doorlooptijd, waarvan ~20 minuten actieve tijd.

Dit runbook valideert dat de volledige Mollie subscription-lifecycle werkt vóór lancering. We testen op **staging** met een Mollie **test-API-key**, niet op productie.

---

## Voorbereiding

1. Staging-deploy actief op `https://staging.vat100.nl` met:
   - `MOLLIE_API_KEY` ingesteld op een test-key (`test_`-prefix).
   - Webhook URL bereikbaar vanaf het publieke internet (Mollie → jouw staging host).
   - Resend test-modus aan zodat e-mails niet echt verzonden worden.
2. Een verse test-gebruiker: `qa+<datum>@vat100.nl`. Na registratie en email-bevestiging door naar onboarding.
3. Een terminal met `curl` of de `scripts/mollie-webhook-sim.ts` helper klaar (zie onderaan).
4. Supabase SQL-editor open op staging met snelkoppelingen naar tabellen `subscriptions`, `system_events`, `webhook_events`, `admin_audit_log`.

---

## Scenario 1 — Nieuwe subscribe + eerste betaling (happy path)

- [ ] Log in als test-gebruiker → `/abonnement/kies` → selecteer **Studio** (€39/mnd).
- [ ] Klik op "Start" en laat de browser doorleiden naar Mollie-checkout.
- [ ] Mollie test-card `test-success`: voltooi de betaling.
- [ ] Verwacht: redirect terug naar `/dashboard` en binnen 10 seconden een nieuwe rij in `subscriptions` met `status = 'active'`.
- [ ] Controleer: `mollie_subscription_id` en `mollie_customer_id` zijn gevuld.
- [ ] `subscription_payments` heeft exact één rij met `status = 'paid'` en `amount_cents = 3900`.
- [ ] Resend-log: "subscription receipt" naar test-gebruiker.

**Faalt iets?** Check `/admin/systeem` → Dead Letter Queue. Log eventuele replay via `scripts/mollie-webhook-sim.ts`.

---

## Scenario 2 — Recurring renewal

Hoeft niet 30 dagen te wachten: stuur een gesimuleerde webhook voor een bestaand `mollie_subscription_id`.

- [ ] Haal `mollie_subscription_id` op uit `subscriptions` en kies een bestaand/gesimuleerd payment-ID.
- [ ] `curl -X POST https://staging.vat100.nl/api/webhooks/mollie -d "id=tr_<test_id>"` (of gebruik de simulator).
- [ ] Verwacht: een nieuwe rij in `subscription_payments`, `current_period_end` is +30 dagen verschoven, status blijft `active`.
- [ ] Geen duplicate e-mail voor terugkerende betalingen (alleen eerste + faalgevallen).

---

## Scenario 3 — Gefaalde betaling → past_due → retry

- [ ] Simuleer een `status = failed` payment via Mollie test-card `test-insufficient-funds`, of post een webhook met een failed payment-ID.
- [ ] Verwacht binnen 60 seconden: `subscription.status = 'past_due'`.
- [ ] `system_events` bevat `subscription.payment_failed`.
- [ ] Resend-log: dunning e-mail naar gebruiker.
- [ ] `/dashboard` toont waarschuwing "Laatste betaling mislukt — werk je betaalgegevens bij".
- [ ] Wacht tot de cron of retry draait (zie `lib/webhooks/retry-processor.ts`): bij succesvolle hertry terug naar `active`.

---

## Scenario 4 — Cancel at period end

- [ ] Navigeer naar `/dashboard/settings/abonnement` → **Abonnement opzeggen**.
- [ ] Bevestig. Verwacht: `subscriptions.cancel_at_period_end = true`, status blijft `active` tot aan `current_period_end`.
- [ ] `admin_audit_log` **niet** beïnvloed (user action, geen admin).
- [ ] `system_events` bevat `subscription.cancellation_scheduled`.
- [ ] UI toont een melding: "Je abonnement loopt door tot <datum>."

---

## Scenario 5 — Reactivate binnen periode

- [ ] Binnen `current_period_end` klik op **Opzegging ongedaan maken**.
- [ ] Verwacht: `cancel_at_period_end = false`, status blijft `active`.
- [ ] Geen dubbele betaling; geen extra `subscription_payments`-rij.

---

## Scenario 6 — Period end → gracefull downgrade

- [ ] Zet `current_period_end` handmatig op `now() - interval '1 hour'` via SQL (gesimuleerd).
- [ ] Triggr cron `/api/cron/agents` (of wacht op de automatische run).
- [ ] Verwacht: `subscription.status = 'canceled'`. Toegang tot paid features (`requirePlan`) geeft upgrade-prompt.
- [ ] Data blijft behouden, geen cascading deletes.

---

## Scenario 7 — Webhook retry & dead-letter

- [ ] Forceer een fout door de test-database tijdelijk te pauzeren (of een `handleSubscriptionPayment` exception te simuleren).
- [ ] Post een webhook. Verwacht insert in `webhook_events` met `status = 'pending'` en `next_retry_at`.
- [ ] Wacht tot retry draait (5/15/60 min window); controleer `attempts` veld.
- [ ] Bij 5 mislukte pogingen: `status = 'failed'`, entry in Sentry en **één admin-alert e-mail per uur**.
- [ ] Check `/admin/systeem` → Dead Letter-sectie toont het event met replay-knop.

---

## Exit-criteria

- [ ] Alle zeven scenario's afgevinkt zonder open bugs.
- [ ] Elk scenario twee keer achter elkaar succesvol (flake-resistentie).
- [ ] Geen rode/urgent signalen in Sentry over payment-flows in de laatste 24u.
- [ ] Screenshots of SQL-dumps per scenario in `/docs/qa-evidence/<datum>/`.

Niet alle scenario's groen op 26 mei? **Soft-launch op 2 juni uitstellen** tot 9 juni.

---

## Simulator helper

Zie `scripts/mollie-webhook-sim.ts` voor een lokale helper die Mollie-POST requests fabrieken naar `/api/webhooks/mollie`. Gebruik alleen met test-ID's en staging.

```bash
npx tsx scripts/mollie-webhook-sim.ts --env=staging --payment-id=tr_abc --scenario=paid
```

Scenario's: `paid` | `failed` | `canceled` | `expired`.

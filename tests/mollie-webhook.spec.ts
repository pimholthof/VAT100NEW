/**
 * Mollie subscription E2E scaffold.
 *
 * Volledige paid-renew-cancel-reactivate flow vereist een Mollie
 * test-API-key en een writable Supabase test-database. De actieve
 * tests hier zijn bedoeld om te draaien op iedere deploy zonder
 * externe afhankelijkheden; de volledige flows zijn gemarkeerd als
 * test.skip met een TODO-checklist zodat QA ze handmatig kan
 * aftekenen tijdens de launch dress rehearsal.
 */

import { test, expect } from "@playwright/test";

test.describe("Mollie webhook — input validatie", () => {
  test("leeg verzoek krijgt 400", async ({ request }) => {
    const response = await request.post("/api/webhooks/mollie", {
      form: {},
    });
    expect(response.status()).toBe(400);
  });

  test("onjuist payment-ID formaat krijgt 400", async ({ request }) => {
    const response = await request.post("/api/webhooks/mollie", {
      form: { id: "invalid-id" },
    });
    expect(response.status()).toBe(400);
  });

  test("te lang payment-ID krijgt 400", async ({ request }) => {
    const tooLong = `tr_${"x".repeat(60)}`;
    const response = await request.post("/api/webhooks/mollie", {
      form: { id: tooLong },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Abonnement UI — ongeauthenticeerd", () => {
  test("abonnement-pagina redirect naar login", async ({ page }) => {
    await page.goto("/dashboard/settings/abonnement");
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe("Mollie — volledige lifecycle (manual/staging)", () => {
  test.skip(
    "TODO: subscribe → first payment → recurring renewal → cancel → reactivate",
    async () => {
      // Vereisten:
      // 1. MOLLIE_API_KEY in test.key-modus
      // 2. Staging Supabase met seed user
      // 3. Playwright routes voor Mollie checkout pagina
      //
      // Scenario's om af te vinken vóór 2 juni:
      // - [ ] Nieuwe gebruiker kan abonnement starten (plan: studio)
      // - [ ] Eerste betaling "paid" activeert subscription (status = active)
      // - [ ] Recurring payment "paid" verlengt current_period_end
      // - [ ] Betaling "failed" zet status naar past_due en triggert e-mail
      // - [ ] cancelSubscription() zet cancel_at_period_end = true
      // - [ ] Na period_end verloopt toegang automatisch
      // - [ ] Heractivering werkt binnen 30 dagen
      // - [ ] Webhook retry queue verwerkt gefaalde webhooks correct
      // - [ ] DLQ admin-alert e-mail arriveert bij uitputting
    }
  );
});

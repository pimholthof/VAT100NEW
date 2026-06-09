# Launch-readiness — VAT100

> Eerlijke stand van zaken richting lancering. Dit document focust op de fiscale
> engine + de autonome motor (deze werkstroom). Voor het bredere product-/
> marketing-launchplan: zie `docs/launch-readiness.md` en `docs/launch-stappenplan.md`.

## ✅ Code-compleet & geverifieerd

Alles hieronder is gebouwd, getest en `npm run build` + de volledige testsuite
(497 tests) zijn groen.

- **Twee kernen:** factuur + live waarheid-paneel; canvas met *Van jou* + de
  Drie Potten + "Nu doen" (Predictive Calm).
- **Eén bron van fiscale waarheid:** BTW-aangifte via `calculateBtwRubrieken`
  (geen duplicatie meer; `totaalBtw`-bug weg).
- **Aangiftes als geleide flow:** Jaarafsluiting-surface (BTW/IB/jaarrekening)
  met readiness + één-tap volgende stap.
- **Veilige autonomie:** tier-poort (`decideAction`) + runner (`runAgentAction`);
  BTW-auto-voorbereiden loopt er al doorheen (gelogd, omkeerbaar).
- **Verbetert zichzelf:** geleerde regels (transactie-categorie + bon→kostsoort)
  door de poort; herhaalde correcties als controle-signaal.

## 🔧 Vereist om te lanceren (operationeel — actie nodig)

1. **Database-migraties toepassen**, inclusief de nieuwe
   `supabase/migrations/20260609_001_learned_rules.sql`. Zonder toepassing werkt
   de bredere leerlus niet (de code faalt veilig: leren is non-fataal).
2. **Omgevingsvariabelen** (verplicht, gecontroleerd door `npm run check-env`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `MOLLIE_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `ANTHROPIC_API_KEY`, `CRON_SECRET`.
3. **Externe accounts live zetten:** Supabase (DB/auth), Mollie (betalingen),
   Resend + geverifieerd verzenddomein (e-mail), Tink (bankkoppeling, PSD2),
   Anthropic (OCR/classificatie).
4. **Belastingdienst-indiening:** Digipoort is nog gemockt. "Assisted manual"
   (cijfers + PDF + markeer ingediend) werkt vandaag; system-to-system vereist
   een PKIoverheid-certificaat + SBR/XBRL-aansluiting (`FilingTransport`-laag).
5. **Fiscalist-akkoord** op de bewuste 1e/3a-bucketkeuze (zie ARCHITECTURE.md
   §6.1a) vóórdat klanten met 0%- of export-aangiftes erop steunen.

## 🔜 Code-vervolg (hardening na/rond launch, niet-blokkerend)

- Overdue-cron + payment-matching ook door de veiligheidspoort.
- `invariantsOk` echt voeden uit `runSelfChecks` (nu nog placeholder `true`).
- Safe-to-spend unificeren (ARCHITECTURE.md §6.2) en de jaarrekening-BTW via de
  canonieke bron (§6 / 4e divergentie).
- Noodstop/schaduwmodus uit config + een expliciete undo-registry in `audit_log`.
- Migratie `rubriek_1e_*` / `rubriek_3a_*` (na fiscalist-akkoord).
- Leren verder verbreden (leverancier → BTW-tarief) op dezelfde generieke laag.

## Gouden regel

De motor is zo gebouwd dat **elke onomkeerbare stap (aangifte indienen, factuur
versturen, belasting betalen) bij de mens blijft (Tier 3).** Lanceren met de
autonomie aan is veilig: het systeem doet het omkeerbare werk zelf en legt de
rest rustig voor.

# VAT100 Verbeterplan — Stapsgewijze Roadmap

## Huidige Staat (Maart 2026)

**Wat werkt:**
- Authenticatie (login/register/onboarding) met Supabase Auth
- Facturen CRUD met regels, PDF-generatie, e-mail verzending
- Offertes CRUD met conversie naar factuur
- Bonnetjes upload met AI-verwerking (Anthropic)
- Klantenbeheer
- Dashboard met cashflow chart, fiscal pulse, action feed
- Bank connectie via GoCardless Open Banking
- BTW-aangifte overzicht en export (CSV)
- Terugkerende facturen (cron)
- Openbare factuur-link (share token)
- Herinneringen (herinnering/aanmaning/incasso)
- Command menu met AI-chat
- Sentry error tracking, PWA ondersteuning

**Wat ontbreekt of verbeterd moet worden:**
- Build draait niet (dependencies niet geïnstalleerd)
- Geen tests behalve `format.test.ts`, `validation.test.ts`, en 2 Playwright specs
- Taalfouten (Engelse tekst op plekken waar NL moet)
- Accessibility gaps (ARIA attributen, focus management)
- Type safety issues (`any` types, ongevalideerde API responses)
- Formulier validatie onvolledig (email, KVK, BTW format)
- Geen input constraints (negatieve bedragen mogelijk)
- Geen optimistic UI / loading feedback op sommige plekken
- Geen E2E test pipeline

---

## Fase 1: Fundament Repareren (Stabiliteit)

### Stap 1.1 — Build & Dependencies Fixen
- [ ] `npm install` uitvoeren en verifiëren
- [ ] `npm run build` laten slagen
- [ ] Eventuele TypeScript errors oplossen
- [ ] ESLint warnings opruimen

### Stap 1.2 — Taalcorrectie (NL Compliance)
- [ ] `InvoiceForm.tsx`: "Select Client" → "Selecteer klant"
- [ ] `InvoiceMetadata.tsx`: "High/Low/Zero" → "Hoog (21%)/Laag (9%)/Nul (0%)"
- [ ] `QuoteForm.tsx`: Engelse placeholders naar NL
- [ ] Alle componenten doorlopen op resterend Engels

### Stap 1.3 — Type Safety Verbeteren
- [ ] `CommandMenu.tsx`: ChatMessage interface definiëren, `any` types verwijderen
- [ ] API response validatie met Zod schemas toevoegen
- [ ] Alle `any` types in codebase identificeren en fixen

---

## Fase 2: Formulier Kwaliteit & Validatie

### Stap 2.1 — Input Constraints
- [ ] `InvoiceLineRow.tsx`: `min="0"` op quantity en rate inputs
- [ ] `ReceiptForm.tsx`: bedrag inputs begrenzen
- [ ] Alle numerieke inputs reviewen op min/max/step

### Stap 2.2 — Formulier Validatie Uitbreiden
- [ ] `ClientForm.tsx`: Email format validatie toevoegen
- [ ] `ClientForm.tsx`: KVK (8 cijfers) en BTW (NL + 9 cijfers + B01) format checks
- [ ] IBAN validatie in onboarding/profile
- [ ] Zod schema's voor alle formulieren (client-side + server-side)

### Stap 2.3 — Error Handling Verbeteren
- [ ] `ReceiptForm.tsx`: Specifiekere foutmeldingen bij AI-analyse
- [ ] `InvoiceForm.tsx`: Auto-save error feedback aan gebruiker tonen
- [ ] Consistente error patterns in alle server actions

---

## Fase 3: Accessibility (A11y)

### Stap 3.1 — Modal & Dialog Accessibility
- [ ] `CommandMenu.tsx`: `role="dialog"`, `aria-modal="true"`, focus trap toevoegen
- [ ] Alle modals/dialogs reviewen op ARIA compliance

### Stap 3.2 — Form Accessibility
- [ ] `aria-invalid` op formuliervelden met errors
- [ ] `aria-describedby` koppelen aan foutmeldingen
- [ ] `aria-busy` op muterende selects (invoice status wijzigen)
- [ ] Focus management na form submissions

### Stap 3.3 — Interactie Feedback
- [ ] `DashboardError.tsx`: `role="alert"` toevoegen
- [ ] Loading states voorzien van `aria-live="polite"` regions
- [ ] Skip-to-content link in dashboard layout

---

## Fase 4: UX Verfijning

### Stap 4.1 — Loading & Optimistic States
- [ ] `ClientQuickCreate.tsx`: Optimistic UI bij client aanmaken
- [ ] Invoice status wijziging: optimistic update met rollback
- [ ] Skeleton loading voor alle lijstpagina's consistent maken

### Stap 4.2 — Dashboard Verfijning
- [ ] `DashboardClient.tsx`: Event listener cleanup bij unmount fixen
- [ ] Action feed: swipe-to-dismiss op mobiel
- [ ] Fiscal Pulse: kwartaal-switcher toevoegen
- [ ] Cashflow chart: tooltip met bedrag details

### Stap 4.3 — Factuur Workflow
- [ ] Factuur dupliceren functionaliteit
- [ ] Bulk status wijziging (meerdere facturen markeren als betaald)
- [ ] Factuur preview in-page (zonder navigatie)
- [ ] Credit nota: visueel onderscheiden van reguliere factuur

### Stap 4.4 — Responsive Design
- [ ] `DashboardNav.tsx`: Font scaling consistentie fixen
- [ ] Mobiele navigatie verfijnen (bottom nav of hamburger)
- [ ] Tabel componenten horizontaal scrollbaar op mobiel
- [ ] Touch targets minimaal 44x44px

---

## Fase 5: Testing

### Stap 5.1 — Unit Tests (Vitest)
- [ ] Server actions testen met gemockte Supabase client
- [ ] `lib/format.ts`: test coverage uitbreiden
- [ ] `lib/validation/`: alle validatie regels testen
- [ ] `lib/export/csv.ts`: output format testen
- [ ] Invoice number generation logic testen

### Stap 5.2 — Component Tests
- [ ] `InvoiceForm`: render, line toevoegen/verwijderen, berekeningen
- [ ] `ReceiptUpload`: drag-drop, file validatie, error states
- [ ] `ClientForm`: validatie feedback, submit flow
- [ ] `CommandMenu`: keyboard navigatie, zoeken

### Stap 5.3 — E2E Tests (Playwright)
- [ ] Auth flow: registratie → onboarding → dashboard
- [ ] Factuur flow: aanmaken → verzenden → betaald markeren
- [ ] Offerte flow: aanmaken → accepteren → omzetten naar factuur
- [ ] Bonnetje flow: uploaden → AI verwerking → opslaan
- [ ] BTW export flow

---

## Fase 6: Performance & Security

### Stap 6.1 — Performance
- [ ] React Query cache strategie reviewen (staleTime, gcTime)
- [ ] Grote lijsten: virtualisatie of paginering toevoegen
- [ ] Image optimalisatie voor logo's en bonnetje previews
- [ ] Bundle size analyse en dynamic imports waar nodig

### Stap 6.2 — Security Hardening
- [ ] Rate limiting op API routes (chat, PDF generatie)
- [ ] CSRF bescherming verifiëren op server actions
- [ ] Share token: expiry datum toevoegen
- [ ] File upload: magic byte validatie naast MIME type
- [ ] Content Security Policy headers configureren

### Stap 6.3 — Monitoring & Observability
- [ ] Sentry: custom breadcrumbs voor belangrijke acties
- [ ] Server action error logging structureren
- [ ] Uptime monitoring voor cron jobs

---

## Fase 7: Feature Completeness

### Stap 7.1 — Bank Reconciliatie Verfijnen
- [ ] Automatische matching verbeteren (AI confidence threshold)
- [ ] Handmatige match UI: factuur/bonnetje koppelen aan transactie
- [ ] Categorisatie regels beheer scherm
- [ ] Bank sync status indicator in dashboard

### Stap 7.2 — BTW Aangifte
- [ ] Kwartaal selectie met vergelijking vorig jaar
- [ ] ICP (intracommunautaire prestaties) ondersteuning
- [ ] Kleineondernemersregeling (KOR) toggle
- [ ] PDF export van BTW aangifte overzicht

### Stap 7.3 — Rapportage
- [ ] Winst & verlies overzicht
- [ ] Omzet per klant grafiek
- [ ] Jaaroverzicht voor belastingaangifte
- [ ] Ouderdomsanalyse openstaande facturen

### Stap 7.4 — Communicatie
- [ ] Factuur herinneringen automatiseren (schema instellen)
- [ ] Email templates aanpasbaar maken
- [ ] Notificaties: in-app + optioneel email digest

---

## Fase 8: Polish & Launch Readiness

### Stap 8.1 — Design System Afronden
- [ ] Glass effect consistent toepassen
- [ ] Animaties reviewen op "Rams-inspired" soberheid
- [ ] Dark mode overwegen (of bewust uitsluiten als design keuze)
- [ ] Print stylesheet voor facturen/offertes

### Stap 8.2 — Onboarding Ervaring
- [ ] Stapsgewijze onboarding wizard (progress indicator)
- [ ] Voorbeeld data optie voor nieuwe gebruikers
- [ ] Contextual help tooltips bij eerste gebruik
- [ ] Lege state designs voor alle lijsten

### Stap 8.3 — Productie Gereedheid
- [ ] Environment variabelen documenteren
- [ ] Database backup strategie
- [ ] Supabase migrations testen op schone database
- [ ] PWA: offline fallback pagina
- [ ] Meta tags en Open Graph voor publieke factuur pagina's

---

## Prioritering Samenvatting

| Fase | Impact | Effort | Prioriteit |
|------|--------|--------|------------|
| 1. Fundament | Kritiek | Klein | Nu |
| 2. Validatie | Hoog | Klein | Week 1 |
| 3. A11y | Hoog | Medium | Week 1-2 |
| 4. UX | Medium | Medium | Week 2-3 |
| 5. Testing | Hoog | Groot | Week 2-4 |
| 6. Performance | Medium | Medium | Week 3-4 |
| 7. Features | Hoog | Groot | Week 4-8 |
| 8. Polish | Medium | Medium | Week 6-8 |

Elke stap is zo klein gehouden dat deze in 1-2 uur implementeerbaar is. Het plan kan parallel uitgevoerd worden: Fase 5 (testing) loopt mee met elke andere fase.

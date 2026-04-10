# Changelog

Alle noemenswaardige wijzigingen aan VAT100 worden in dit bestand gedocumenteerd.

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/) en dit project volgt [Semantic Versioning](https://semver.org/lang/nl/).

## [0.1.0] - 2026-04-10

### Toegevoegd

- Facturering: aanmaken, versturen (PDF + e-mail), UBL/Peppol-export, herhalende facturen, creditnota's
- Offertes: aanmaken, versturen, omzetten naar factuur
- BTW-overzicht: realtime berekening, kwartaalaangifte-export, verleggingsregelingen (EU/niet-EU)
- Inkomstenbelasting: jaarprojectie met ondernemersaftrek, MKB-vrijstelling, heffingskortingen
- Klantenbeheer: CRUD, KvK-lookup, VIES BTW-validatie
- Bonnenbeheer: uploaden, AI-herkenning, zakelijk percentage
- Bankintegratie: Tink Open Banking, transacties synchroniseren, categorisatieregels
- Urenregistratie: urencriterium-tracking (1.225 uur/jaar)
- Rittenadministratie: kilometerdeclaratie
- Grootboek: 25 standaard ZZP-rekeningen, automatische journaalposten
- Activabeheer: afschrijvingsschema's, KIA-berekening
- Dashboard: Fiscal Pulse (veilig-om-uit-te-geven), cashflow-forecast, gezondheidscore
- Action Feed: voorspellende fiscale taken en herinneringen
- Abonnementen: 3 plannen (Basis/Studio/Compleet) via Mollie
- AI-agent: transactieclassificatie met vertrouwensmodel per plan
- Landingspagina: features, mockups, prijzen, FAQ, waitlist
- Onboarding: stapsgewijze wizard (profiel, klant, factuur, bon, bank)
- Admin panel: gebruikersbeheer, analytics, audit logs, feedback
- E-mailsysteem: facturen, herinneringen (3-staps), onboarding, BTW-deadlines
- Beveiliging: RLS, rate limiting, Zod-validatie, security headers, timing-safe cron
- Juridisch: privacybeleid (AVG), algemene voorwaarden
- CI/CD: GitHub Actions (lint, typecheck, build, unit tests, E2E)
- Monitoring: Sentry error tracking, structured logging, cron-alerts

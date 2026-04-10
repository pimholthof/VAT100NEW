# Beveiligingsbeleid

## Kwetsbaarheid melden

Als je een beveiligingsprobleem ontdekt in VAT100, meld dit dan via **security@vat100.nl**. Stuur geen beveiligingsproblemen via openbare GitHub issues.

We streven ernaar om binnen **48 uur** te reageren op meldingen en binnen **7 werkdagen** een beoordeling te geven.

## Wat te melden

- Ongeautoriseerde toegang tot gebruikersgegevens
- SQL-injectie, XSS, CSRF of andere injectie-aanvallen
- Omzeiling van Row-Level Security (RLS)
- Authenticatie- of autorisatieproblemen
- Onbedoelde blootstelling van API-sleutels of gevoelige gegevens
- Problemen met betalingsverwerking (Mollie)
- Problemen met bankdata-integratie (Tink)

## Buiten scope

- Denial-of-service aanvallen
- Social engineering
- Problemen in third-party diensten (Supabase, Vercel, Mollie, etc.)
- Cosmetische bugs zonder beveiligingsimpact

## Beveiligingsmaatregelen

VAT100 hanteert de volgende beveiligingsmaatregelen:

- **Database**: Row-Level Security (RLS) op alle tabellen in Supabase
- **Input-validatie**: Zod-schema's voor alle gebruikersinvoer
- **Rate limiting**: Database-backed rate limiting op authenticatie-endpoints
- **Security headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- **Cron-beveiliging**: Timing-safe bearer token verificatie
- **Betalingen**: Idempotente webhook-verwerking, Mollie API-verificatie
- **Monitoring**: Sentry error tracking met structured logging
- **Versleuteling**: TLS voor alle verbindingen, versleutelde sessies

## Responsible Disclosure

We vragen je om:

1. Ons een redelijke termijn te geven om het probleem op te lossen
2. Geen gebruikersgegevens te benaderen of te wijzigen
3. Geen destructieve acties uit te voeren
4. Het probleem niet openbaar te maken voordat het is opgelost

# Sub-verwerkers & AVG-verwerkingsregister

Startpunt voor de verwerkersovereenkomsten en het AVG-verwerkingsregister.
Met elke partij hieronder hoort een verwerkersovereenkomst (DPA) gesloten te
zijn vóór livegang met echte gebruikers. Controleer per partij de actuele
DPA, de dataregio en (bij niet-EU) de doorgiftegrondslag.

| Sub-verwerker | Doel | Soort gegevens | Regio / doorgifte | DPA-status |
|---------------|------|----------------|-------------------|------------|
| **Supabase** | Database, auth, opslag | Alle gebruikersdata: profielen, facturen, bonnen, transacties, auth-gegevens | EU-regio kiezen/verifiëren | Te bevestigen |
| **Vercel** | Hosting, edge, logging | HTTP-verzoeken, IP-adressen, logs | VS-bedrijf; EU-edge mogelijk | Te bevestigen |
| **Mollie** | Betalingen & abonnementen | Betaalgegevens, bedragen, e-mail | NL/EU | Te bevestigen |
| **Resend** | Transactionele e-mail | E-mailadressen, mailinhoud (facturen, herinneringen) | VS-bedrijf | Te bevestigen + doorgiftegrondslag |
| **Anthropic** | AI: bon-OCR, fiscale chat | Bonafbeeldingen, chatinhoud (kan financiële data bevatten) | VS | Te bevestigen + doorgiftegrondslag (SCC) |
| **Sentry** | Foutmonitoring | Foutdata, IP, user-context | VS/EU (config) | Te bevestigen |
| **Tink** | Open Banking (PSD2) | Banktransacties, rekeninginfo (read-only) | EU | Te bevestigen; AISP-licentie-scope checken |
| **KVK API** | Bedrijfsopzoeking | KVK-nummer (opzoeking) | NL | Overheidsdienst |

## Aandachtspunten

- **Niet-EU doorgifte** (Resend, Anthropic, Vercel, mogelijk Sentry): borg een
  geldige grondslag (adequaatheidsbesluit of Standard Contractual Clauses).
- **Anthropic**: bonafbeeldingen en chat kunnen bijzondere/financiële data
  bevatten — bevestig dat data niet voor training wordt gebruikt (zakelijke
  API-voorwaarden) en leg dat vast in het register.
- **Supabase-regio**: zet de database in een EU-regio; verifieer dit in het
  project.
- Het privacybeleid (`app/(legal)/privacy`) noemt Tink, Mollie en Sentry al;
  vul aan met Resend, Anthropic, Supabase en Vercel zodat het register en de
  privacyverklaring overeenkomen.

## Betrokkenenrechten (geïmplementeerd)

- **Inzage/portabiliteit**: `/api/export/my-data` (volledige JSON-export).
- **Verwijdering**: verwijderverzoek via `/dashboard/settings/privacy`
  (directe deactivering + registratie; volledige wissing ná de fiscale
  bewaartermijn of door een admin).
- **Bewaartermijn**: fiscale administratie 7 jaar (bewaarplicht) — geborgd in
  de verwijderflow.

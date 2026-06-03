-- ============================================================================
-- De-brand abonnementskenmerken (plan.features)
--
-- De zichtbare plan-features (PlanCard / abonnement-keuze) noemden nog
-- "AI" en de inmiddels verwijderde boekhouder-chat. Deze migratie haalt
-- die branding eruit:
--   - "AI transactie-classificatie"   -> "Automatische transactie-classificatie"
--   - "AI auto-boeking"               -> "Automatische boeking"
--   - "Slimme boekhouder chat (...)"  -> verwijderd (functie bestaat niet meer)
--   - "Onbeperkt chat"                -> verwijderd
-- De onderliggende functies (OCR, automatische categorisatie/boeking) blijven.
-- ============================================================================

update public.plans
set features = '["Alles van Start","Bonnen scannen (50/mnd)","Bankrekening koppeling","Automatische transactie-classificatie (met goedkeuring)","Betaallinks (Mollie)","E-mail herinneringen","Cashflow-analyse","Inzicht inkomstenbelasting"]'::jsonb
where id = 'studio';

update public.plans
set features = '["Alles van Studio","Automatisch bonnen scannen (300/mnd)","Automatische boeking (zonder goedkeuring)","Automatische reconciliatie","Jaarrekening PDF export","Prioriteit support"]'::jsonb
where id = 'compleet';

update public.plans
set features = '["Alles van Complete","Directe Digipoort BTW-aangifte","IB-aangifte via SBR","Onbeperkt bonnen scannen","Accountant-review jaarrekening","Dedicated support (< 4u reactie)","Multi-gebruiker (2 zetels)"]'::jsonb
where id = 'plus';

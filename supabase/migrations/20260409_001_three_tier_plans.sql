-- ============================================================================
-- Three-tier pricing update
-- ============================================================================

insert into public.plans (id, name, price_cents, interval_months, features, sort_order)
values
  (
    'basis',
    'Start',
    2900,
    1,
    '["Onbeperkt facturen & creditnota''s","BTW-overzicht","Offertes","Klantenbeheer","CSV export"]'::jsonb,
    0
  ),
  (
    'studio',
    'Studio',
    3900,
    1,
    '["Alles van Start","Bonnen scannen (handmatig)","Bankrekening koppeling","AI transactie-classificatie (met goedkeuring)","Betaallinks (Mollie)","E-mail herinneringen","Cashflow-analyse","Inzicht inkomstenbelasting"]'::jsonb,
    1
  ),
  (
    'compleet',
    'Complete',
    5900,
    1,
    '["Alles van Studio","Automatisch bonnen scannen","Slimme boekhouder chat","AI auto-boeking (zonder goedkeuring)","Automatische reconciliatie","Jaarrekening PDF export","Prioriteit support"]'::jsonb,
    2
  )
on conflict (id) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  interval_months = excluded.interval_months,
  features = excluded.features,
  sort_order = excluded.sort_order,
  is_active = true;

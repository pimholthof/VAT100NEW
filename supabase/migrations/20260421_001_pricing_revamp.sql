-- ============================================================================
-- Pricing revamp — margin optimization
--
-- Hefbomen:
--   1. Compleet €59 -> €79 (AI-gebruik dekt OCR/agent-kosten)
--   2. Nieuwe tier Plus €149 (Digipoort-aangifte, accountant-review)
--   3. Jaarabonnementen (2 maanden gratis: 10x maandprijs)
--   4. AI-quota per plan (hard-limit OCR-scans en chat-berichten per maand)
-- ============================================================================

-- Quota-kolommen op plans
alter table public.plans
  add column if not exists ai_ocr_quota        integer,
  add column if not exists ai_chat_quota       integer,
  add column if not exists includes_digipoort  boolean not null default false,
  add column if not exists billing_interval    text    not null default 'monthly'
    check (billing_interval in ('monthly', 'yearly'));

-- Nieuwe plan-hierarchy waarden
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_id_fkey;

alter table public.subscriptions
  add constraint subscriptions_plan_id_fkey
    foreign key (plan_id) references public.plans (id);

-- Bestaande maandabonnementen updaten + nieuwe plans toevoegen
insert into public.plans (id, name, price_cents, interval_months, billing_interval, features, sort_order, ai_ocr_quota, ai_chat_quota, includes_digipoort)
values
  (
    'basis',
    'Start',
    2900,
    1,
    'monthly',
    '["Onbeperkt facturen & creditnota''s","BTW-overzicht","Offertes","Klantenbeheer","CSV export"]'::jsonb,
    0,
    0,
    0,
    false
  ),
  (
    'studio',
    'Studio',
    3900,
    1,
    'monthly',
    '["Alles van Start","Bonnen scannen (50/mnd)","Bankrekening koppeling","AI transactie-classificatie (met goedkeuring)","Betaallinks (Mollie)","E-mail herinneringen","Cashflow-analyse","Inzicht inkomstenbelasting"]'::jsonb,
    1,
    50,
    0,
    false
  ),
  (
    'compleet',
    'Complete',
    7900,
    1,
    'monthly',
    '["Alles van Studio","Automatisch bonnen scannen (300/mnd)","Slimme boekhouder chat (200 berichten/mnd)","AI auto-boeking (zonder goedkeuring)","Automatische reconciliatie","Jaarrekening PDF export","Prioriteit support"]'::jsonb,
    2,
    300,
    200,
    false
  ),
  (
    'plus',
    'Plus',
    14900,
    1,
    'monthly',
    '["Alles van Complete","Directe Digipoort BTW-aangifte","IB-aangifte via SBR","Onbeperkt bonnen scannen","Onbeperkt chat","Accountant-review jaarrekening","Dedicated support (< 4u reactie)","Multi-gebruiker (2 zetels)"]'::jsonb,
    3,
    null,
    null,
    true
  ),
  -- Jaar-varianten: 10x maandprijs = 2 maanden gratis
  (
    'basis_yearly',
    'Start jaarlijks',
    29000,
    12,
    'yearly',
    '["Alles van Start","2 maanden gratis"]'::jsonb,
    10,
    0,
    0,
    false
  ),
  (
    'studio_yearly',
    'Studio jaarlijks',
    39000,
    12,
    'yearly',
    '["Alles van Studio","2 maanden gratis"]'::jsonb,
    11,
    50,
    0,
    false
  ),
  (
    'compleet_yearly',
    'Complete jaarlijks',
    79000,
    12,
    'yearly',
    '["Alles van Complete","2 maanden gratis"]'::jsonb,
    12,
    300,
    200,
    false
  ),
  (
    'plus_yearly',
    'Plus jaarlijks',
    149000,
    12,
    'yearly',
    '["Alles van Plus","2 maanden gratis"]'::jsonb,
    13,
    null,
    null,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  interval_months = excluded.interval_months,
  billing_interval = excluded.billing_interval,
  features = excluded.features,
  sort_order = excluded.sort_order,
  ai_ocr_quota = excluded.ai_ocr_quota,
  ai_chat_quota = excluded.ai_chat_quota,
  includes_digipoort = excluded.includes_digipoort,
  is_active = true;

-- Grandfather bestaande Compleet-klanten op €59 via vlag op subscription
alter table public.subscriptions
  add column if not exists price_lock_cents integer,
  add column if not exists is_founding_member boolean not null default false;

comment on column public.subscriptions.price_lock_cents is
  'Indien ingevuld: override voor plan.price_cents (founding member / grandfathered pricing).';

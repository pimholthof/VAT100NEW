-- ============================================================================
-- Subscriptions — Mollie-backed subscription plans
-- ============================================================================

-- Plan definitions (static reference table)
create table public.plans (
  id              text        primary key,  -- 'basis', 'compleet'
  name            text        not null,
  price_cents     integer     not null,     -- 2900, 5900
  currency        text        not null default 'EUR',
  interval_months integer     not null default 1,
  features        jsonb       not null default '[]',
  is_active       boolean     not null default true,
  sort_order      integer     not null default 0,
  created_at      timestamptz not null default now()
);

-- Seed plans
insert into public.plans (id, name, price_cents, interval_months, features, sort_order) values
  ('basis', 'Basis', 2900, 1, '["Onbeperkt facturen & creditnota''s","BTW-overzicht","Bonnen scannen (handmatig)","Offertes","Klantenbeheer","Betaallinks (Mollie)","E-mail herinneringen","CSV export"]', 0),
  ('compleet', 'Compleet', 5900, 1, '["Alles van Basis","AI bonnen scannen","AI boekhouder chat","Bankrekening koppeling","Automatische reconciliatie","Jaarrekening PDF export","Cashflow-analyse","Prioriteit support"]', 1);

-- Allow public read access to plans
alter table public.plans enable row level security;

create policy "Plans are publicly readable"
  on public.plans for select
  using (true);

-- User subscriptions
create table public.subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        not null references public.profiles (id) on delete cascade,
  plan_id                text        not null references public.plans (id),
  status                 text        not null default 'pending'
                                     check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  mollie_customer_id     text,
  mollie_subscription_id text,
  mollie_mandate_id      text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancelled_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index idx_subscriptions_user_id on public.subscriptions (user_id);
create index idx_subscriptions_status on public.subscriptions (status);
create index idx_subscriptions_mollie_customer on public.subscriptions (mollie_customer_id);

create unique index idx_subscriptions_mollie_sub
  on public.subscriptions (mollie_subscription_id)
  where mollie_subscription_id is not null;

-- Only one active/pending subscription per user
create unique index idx_subscriptions_active_per_user
  on public.subscriptions (user_id)
  where status in ('active', 'pending');

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Subscription payment history
create table public.subscription_payments (
  id                uuid        primary key default gen_random_uuid(),
  subscription_id   uuid        not null references public.subscriptions (id) on delete cascade,
  mollie_payment_id text        not null,
  amount_cents      integer     not null,
  status            text        not null,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index idx_sub_payments_subscription on public.subscription_payments (subscription_id);
create index idx_sub_payments_mollie on public.subscription_payments (mollie_payment_id);

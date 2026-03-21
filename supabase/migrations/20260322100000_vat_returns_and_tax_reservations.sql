-- ═══════════════════════════════════════════════════════════════════
-- BTW-aangiftes (vat_returns) en belastingreserveringen (tax_reservations)
-- Per CLAUDE.md specificatie
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. BTW-aangiftes ────────────────────────────────────────────

create table if not exists vat_returns (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  output_vat   numeric(10,2) not null default 0,
  input_vat    numeric(10,2) not null default 0,
  vat_due      numeric(10,2) not null default 0,
  status       text not null default 'concept'
               check (status in ('concept', 'ingediend', 'betaald')),
  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table vat_returns enable row level security;

create policy "eigen vat_returns"
  on vat_returns using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Advisor leesrechten
create policy "advisor leest vat_returns"
  on vat_returns for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = vat_returns.user_id
        and ac.status = 'active'
    )
  );

create index if not exists idx_vat_returns_user_period
  on vat_returns (user_id, period_start desc);

-- Uniek per gebruiker per periode
create unique index if not exists idx_vat_returns_unique_period
  on vat_returns (user_id, period_start, period_end);

-- ─── 2. Belastingreserveringen per betaling ─────────────────────

create table if not exists tax_reservations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  invoice_id   uuid references invoices(id) on delete set null,
  period       text not null,
  vat_reserved numeric(10,2) not null default 0,
  ib_reserved  numeric(10,2) not null default 0,
  created_at   timestamptz not null default now()
);

alter table tax_reservations enable row level security;

create policy "eigen tax_reservations"
  on tax_reservations using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Advisor leesrechten
create policy "advisor leest tax_reservations"
  on tax_reservations for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = tax_reservations.user_id
        and ac.status = 'active'
    )
  );

create index if not exists idx_tax_reservations_user
  on tax_reservations (user_id, created_at desc);

create index if not exists idx_tax_reservations_invoice
  on tax_reservations (invoice_id);

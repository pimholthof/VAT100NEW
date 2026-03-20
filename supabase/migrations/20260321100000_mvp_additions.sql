-- ═══════════════════════════════════════════════════════════════════
-- MVP Additions: assets, documents, advisor system, opening balances
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Assets (activastaat) ─────────────────────────────────────

create table if not exists assets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  description      text not null,
  acquisition_date date not null,
  acquisition_cost numeric(10,2) not null,
  residual_value   numeric(10,2) not null default 0,
  useful_life_months integer not null default 60,
  category         text not null default 'overig'
                   check (category in (
                     'computer', 'meubilair', 'gereedschap',
                     'vervoer', 'software', 'overig'
                   )),
  created_at       timestamptz not null default now()
);

alter table assets enable row level security;

create policy "eigen assets"
  on assets using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 2. Documents (algemene opslag) ──────────────────────────────

create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  name          text not null,
  storage_path  text not null,
  file_type     text,
  file_size     integer,
  client_id     uuid references clients(id) on delete set null,
  invoice_id    uuid references invoices(id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table documents enable row level security;

create policy "eigen documents"
  on documents using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 3. Advisor systeem ──────────────────────────────────────────

-- Rol op profiles
alter table profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'advisor'));

-- Advisor-klant koppeltabel
create table if not exists advisor_clients (
  id             uuid primary key default gen_random_uuid(),
  advisor_id     uuid not null references profiles(id) on delete cascade,
  client_user_id uuid not null references profiles(id) on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending', 'active', 'revoked')),
  created_at     timestamptz not null default now(),
  unique(advisor_id, client_user_id)
);

alter table advisor_clients enable row level security;

-- Advisor kan eigen koppelingen zien
create policy "advisor ziet eigen koppelingen"
  on advisor_clients using (auth.uid() = advisor_id)
  with check (auth.uid() = advisor_id);

-- User ziet wie advisor is
create policy "user ziet eigen advisor"
  on advisor_clients for select
  using (auth.uid() = client_user_id);

-- ─── 4. Opening balances ────────────────────────────────────────

create table if not exists opening_balances (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  fiscal_year     integer not null,
  equity          numeric(10,2) not null default 0,
  fixed_assets    numeric(10,2) not null default 0,
  current_assets  numeric(10,2) not null default 0,
  cash            numeric(10,2) not null default 0,
  liabilities     numeric(10,2) not null default 0,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  unique(user_id, fiscal_year)
);

alter table opening_balances enable row level security;

create policy "eigen opening_balances"
  on opening_balances using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 5. Banksaldo op annual_accounts ────────────────────────────

alter table annual_accounts
  add column if not exists bank_balance_start numeric(10,2),
  add column if not exists bank_balance_end numeric(10,2);

-- ─── 6. Advisor leesrechten op bestaande tabellen ───────────────

-- Helper: advisor kan data lezen van gekoppelde klanten
-- We voegen SELECT-policies toe voor advisor op alle relevante tabellen.

create policy "advisor leest invoices"
  on invoices for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = invoices.user_id
        and ac.status = 'active'
    )
  );

create policy "advisor leest receipts"
  on receipts for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = receipts.user_id
        and ac.status = 'active'
    )
  );

create policy "advisor leest assets"
  on assets for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = assets.user_id
        and ac.status = 'active'
    )
  );

create policy "advisor leest annual_accounts"
  on annual_accounts for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = annual_accounts.user_id
        and ac.status = 'active'
    )
  );

create policy "advisor leest documents"
  on documents for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = documents.user_id
        and ac.status = 'active'
    )
  );

-- Advisor schrijft opening_balances voor klanten
create policy "advisor schrijft opening_balances"
  on opening_balances for all
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = opening_balances.user_id
        and ac.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = opening_balances.user_id
        and ac.status = 'active'
    )
  );

-- Advisor kan annual_accounts status updaten
create policy "advisor wijzigt annual_accounts"
  on annual_accounts for update
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = annual_accounts.user_id
        and ac.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = annual_accounts.user_id
        and ac.status = 'active'
    )
  );

-- Advisor leest profiles van gekoppelde klanten
create policy "advisor leest profiles"
  on profiles for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = profiles.id
        and ac.status = 'active'
    )
  );

-- Advisor leest opening_balances van gekoppelde klanten
create policy "advisor leest opening_balances"
  on opening_balances for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = opening_balances.user_id
        and ac.status = 'active'
    )
  );

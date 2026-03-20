-- Annual accounts (jaarrekening) table
create table if not exists annual_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  fiscal_year integer not null,
  status text default 'draft' check (status in ('draft', 'reviewed', 'final')),

  -- Snapshot of calculated figures at generation time
  figures jsonb not null,

  -- Generated PDF stored in Supabase Storage
  pdf_nl_path text,
  pdf_en_path text,

  generated_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text,

  created_at timestamptz default now(),
  unique(user_id, fiscal_year)
);

-- RLS
alter table annual_accounts enable row level security;

create policy "Users can view own annual accounts"
  on annual_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own annual accounts"
  on annual_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own annual accounts"
  on annual_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own annual accounts"
  on annual_accounts for delete
  using (auth.uid() = user_id);

-- Index for lookups
create index if not exists idx_annual_accounts_user_year
  on annual_accounts(user_id, fiscal_year);

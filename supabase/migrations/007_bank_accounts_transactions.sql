-- ============================================================================
-- VAT100 — Bank connections & transactions (Open Banking via GoCardless)
-- ============================================================================

-- ============================================================================
-- BANK CONNECTIONS
-- Stores linked bank accounts via GoCardless Bank Account Data.
-- ============================================================================

create table public.bank_connections (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles (id) on delete cascade,
  institution_id    text        not null,
  institution_name  text        not null,
  requisition_id    text,
  account_id        text,
  iban              text,
  status            text        not null default 'pending'
                    check (status in ('pending', 'active', 'expired', 'error')),
  last_synced_at    timestamptz,
  created_at        timestamptz not null default now()
);

comment on table public.bank_connections is 'Bank accounts linked via GoCardless Open Banking.';

alter table public.bank_connections enable row level security;

create policy "Users can view own bank connections"
  on public.bank_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own bank connections"
  on public.bank_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bank connections"
  on public.bank_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own bank connections"
  on public.bank_connections for delete
  using (auth.uid() = user_id);

create index idx_bank_connections_user_id on public.bank_connections (user_id);


-- ============================================================================
-- BANK TRANSACTIONS
-- Imported transactions from linked bank accounts.
-- ============================================================================

create table public.bank_transactions (
  id                    uuid          primary key default gen_random_uuid(),
  user_id               uuid          not null references public.profiles (id) on delete cascade,
  bank_connection_id    uuid          not null references public.bank_connections (id) on delete cascade,
  external_id           text          not null,
  booking_date          date          not null,
  amount                numeric(10,2) not null,
  currency              text          not null default 'EUR',
  description           text,
  counterpart_name      text,
  category              text,
  is_income             boolean       not null default false,
  linked_invoice_id     uuid          references public.invoices (id) on delete set null,
  linked_receipt_id     uuid          references public.receipts (id) on delete set null,
  created_at            timestamptz   not null default now(),
  unique(bank_connection_id, external_id)
);

comment on table public.bank_transactions is 'Transactions imported from linked bank accounts.';

alter table public.bank_transactions enable row level security;

create policy "Users can view own bank transactions"
  on public.bank_transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own bank transactions"
  on public.bank_transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bank transactions"
  on public.bank_transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own bank transactions"
  on public.bank_transactions for delete
  using (auth.uid() = user_id);

create index idx_bank_transactions_user_id on public.bank_transactions (user_id);
create index idx_bank_transactions_booking_date on public.bank_transactions (booking_date);
create index idx_bank_transactions_connection_id on public.bank_transactions (bank_connection_id);

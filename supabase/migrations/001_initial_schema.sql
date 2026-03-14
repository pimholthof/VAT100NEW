-- ============================================================================
-- VAT100 — Initial database schema
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";


-- ============================================================================
-- PROFILES
-- Extends Supabase auth.users with business/studio details.
-- One-to-one relationship with auth.users via id.
-- ============================================================================

create table public.profiles (
  id            uuid        primary key references auth.users (id) on delete cascade,
  full_name     text        not null,
  studio_name   text,                     -- e.g. "Maya Kowalski Studio"
  kvk_number    text,
  btw_number    text,
  address       text,
  city          text,
  postal_code   text,
  iban          text,
  bic           text,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is 'User profile extending Supabase Auth with business details.';

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);


-- ============================================================================
-- CLIENTS
-- Business clients that a user sends invoices to.
-- ============================================================================

create table public.clients (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  name          text        not null,     -- company name
  contact_name  text,
  email         text,
  address       text,
  city          text,
  postal_code   text,
  kvk_number    text,
  created_at    timestamptz not null default now()
);

comment on table public.clients is 'Business clients belonging to a user.';

alter table public.clients enable row level security;

create policy "Users can view own clients"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "Users can insert own clients"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "Users can update own clients"
  on public.clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own clients"
  on public.clients for delete
  using (auth.uid() = user_id);


-- ============================================================================
-- INVOICES
-- Invoices issued by a user to a client.
-- ============================================================================

create table public.invoices (
  id              uuid          primary key default gen_random_uuid(),
  user_id         uuid          not null references public.profiles (id) on delete cascade,
  client_id       uuid          not null references public.clients (id) on delete restrict,
  invoice_number  text          not null,   -- e.g. "0031"
  status          text          not null default 'draft'
                                check (status in ('draft', 'sent', 'paid', 'overdue')),
  issue_date      date          not null default current_date,
  due_date        date,
  sent_via        text          check (sent_via in ('email', 'peppol', 'both')),
  subtotal_ex_vat numeric(10,2) not null default 0,
  vat_amount      numeric(10,2) not null default 0,
  total_inc_vat   numeric(10,2) not null default 0,
  notes           text,
  created_at      timestamptz   not null default now()
);

comment on table public.invoices is 'Invoices issued by a user to a client.';

alter table public.invoices enable row level security;

create policy "Users can view own invoices"
  on public.invoices for select
  using (auth.uid() = user_id);

create policy "Users can insert own invoices"
  on public.invoices for insert
  with check (auth.uid() = user_id);

create policy "Users can update own invoices"
  on public.invoices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own invoices"
  on public.invoices for delete
  using (auth.uid() = user_id);


-- ============================================================================
-- INVOICE LINES
-- Individual line items on an invoice.
-- ============================================================================

create table public.invoice_lines (
  id          uuid          primary key default gen_random_uuid(),
  invoice_id  uuid          not null references public.invoices (id) on delete cascade,
  description text          not null,
  quantity    numeric(10,2) not null default 1,
  unit        text          not null default 'uren'
                            check (unit in ('uren', 'dagen', 'stuks')),
  rate        numeric(10,2) not null default 0,
  amount      numeric(10,2) not null default 0,
  sort_order  integer       not null default 0
);

comment on table public.invoice_lines is 'Individual line items belonging to an invoice.';

alter table public.invoice_lines enable row level security;

-- RLS via parent invoice ownership
create policy "Users can view own invoice lines"
  on public.invoice_lines for select
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_lines.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

create policy "Users can insert own invoice lines"
  on public.invoice_lines for insert
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_lines.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

create policy "Users can update own invoice lines"
  on public.invoice_lines for update
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_lines.invoice_id
        and invoices.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_lines.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

create policy "Users can delete own invoice lines"
  on public.invoice_lines for delete
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_lines.invoice_id
        and invoices.user_id = auth.uid()
    )
  );


-- ============================================================================
-- RECEIPTS
-- Uploaded receipts (bonnen) for expense tracking / BTW terugvordering.
-- ============================================================================

create table public.receipts (
  id              uuid          primary key default gen_random_uuid(),
  user_id         uuid          not null references public.profiles (id) on delete cascade,
  vendor_name     text,
  amount_ex_vat   numeric(10,2),
  vat_amount      numeric(10,2),
  amount_inc_vat  numeric(10,2),
  vat_rate        numeric(5,2),
  category        text,
  receipt_date    date,
  storage_path    text,                   -- path in Supabase Storage
  ai_processed    boolean       not null default false,
  created_at      timestamptz   not null default now()
);

comment on table public.receipts is 'Uploaded receipts (bonnen) for expense tracking and VAT recovery.';

alter table public.receipts enable row level security;

create policy "Users can view own receipts"
  on public.receipts for select
  using (auth.uid() = user_id);

create policy "Users can insert own receipts"
  on public.receipts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own receipts"
  on public.receipts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own receipts"
  on public.receipts for delete
  using (auth.uid() = user_id);


-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_invoices_user_id    on public.invoices (user_id);
create index idx_invoices_status     on public.invoices (status);
create index idx_invoices_issue_date on public.invoices (issue_date);

create index idx_receipts_user_id      on public.receipts (user_id);
create index idx_receipts_receipt_date on public.receipts (receipt_date);

create index idx_invoice_lines_invoice_id on public.invoice_lines (invoice_id);

create index idx_clients_user_id on public.clients (user_id);


-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Trigger that creates a profile row when a new user signs up via Supabase Auth.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

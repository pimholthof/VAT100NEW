-- ═══════════════════════════════════════════════════════════════════
-- Betalingsregistratie (payments) + paid_at op invoices
-- Ondersteunt deelbetalingen en reconciliatie met banktransacties
-- ═══════════════════════════════════════════════════════════════════

-- ─── paid_at kolom op invoices ────────────────────────────────────
alter table invoices add column if not exists paid_at date;

-- ─── Payments tabel ───────────────────────────────────────────────
create table payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  invoice_id          uuid not null references invoices(id) on delete restrict,
  amount              numeric(10,2) not null check (amount > 0),
  payment_date        date not null,
  bank_transaction_id uuid references bank_transactions(id) on delete set null,
  method              text check (method in ('bank', 'contant', 'creditcard', 'overig')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table payments enable row level security;

create policy "payments_select"
  on payments for select
  using (auth.uid() = user_id);

create policy "payments_insert"
  on payments for insert
  with check (auth.uid() = user_id);

create policy "payments_update"
  on payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "payments_delete"
  on payments for delete
  using (auth.uid() = user_id);

-- Advisor leesrechten
create policy "advisor leest payments"
  on payments for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = payments.user_id
        and ac.status = 'active'
    )
  );

create index idx_payments_user
  on payments (user_id, payment_date desc);

create index idx_payments_invoice
  on payments (invoice_id);

create index idx_payments_bank_tx
  on payments (bank_transaction_id)
  where bank_transaction_id is not null;

-- updated_at trigger
create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- Audit trigger
create trigger trg_audit_payments
  after insert or update or delete on payments
  for each row execute function audit_trigger_fn();

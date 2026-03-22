-- ═══════════════════════════════════════════════════════════════════
-- Creditfacturen (credit notes)
-- Wettelijk verplicht voor correcties op verzonden facturen
-- ═══════════════════════════════════════════════════════════════════

create table credit_notes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  invoice_id      uuid not null references invoices(id) on delete restrict,
  credit_number   text not null,
  reason          text not null,
  amount_ex_vat   numeric(10,2) not null check (amount_ex_vat >= 0),
  vat_amount      numeric(10,2) not null check (vat_amount >= 0),
  amount_inc_vat  numeric(10,2) not null check (amount_inc_vat >= 0),
  vat_rate        numeric(5,2) not null default 21,
  issue_date      date not null default current_date,
  status          text not null default 'draft'
                  check (status in ('draft', 'sent')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, credit_number)
);

alter table credit_notes enable row level security;

create policy "credit_notes_select"
  on credit_notes for select
  using (auth.uid() = user_id);

create policy "credit_notes_insert"
  on credit_notes for insert
  with check (auth.uid() = user_id);

create policy "credit_notes_update"
  on credit_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "credit_notes_delete"
  on credit_notes for delete
  using (auth.uid() = user_id and status = 'draft');

-- Advisor leesrechten
create policy "advisor leest credit_notes"
  on credit_notes for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = credit_notes.user_id
        and ac.status = 'active'
    )
  );

create index idx_credit_notes_user
  on credit_notes (user_id, issue_date desc);

create index idx_credit_notes_invoice
  on credit_notes (invoice_id);

-- updated_at trigger
create trigger trg_credit_notes_updated_at
  before update on credit_notes
  for each row execute function set_updated_at();

-- Audit trigger
create trigger trg_audit_credit_notes
  after insert or update or delete on credit_notes
  for each row execute function audit_trigger_fn();

-- Totaal check
alter table credit_notes add constraint chk_credit_note_totals
  check (amount_inc_vat = amount_ex_vat + vat_amount);

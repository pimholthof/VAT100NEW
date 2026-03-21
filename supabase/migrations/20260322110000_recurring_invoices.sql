-- ═══════════════════════════════════════════════════════════════════
-- Terugkerende facturen
-- ═══════════════════════════════════════════════════════════════════

alter table invoices
  add column if not exists recurring_interval text
  check (recurring_interval is null or recurring_interval in ('maandelijks', 'kwartaal', 'jaarlijks'));

alter table invoices
  add column if not exists recurring_next_date date;

alter table invoices
  add column if not exists is_template boolean not null default false;

-- Index voor cron-job: vind alle templates met een volgende datum
create index if not exists idx_invoices_recurring
  on invoices (user_id, is_template, recurring_next_date)
  where is_template = true and recurring_interval is not null;

-- ═══════════════════════════════════════════════════════════════════
-- Multi-valuta ondersteuning
-- ═══════════════════════════════════════════════════════════════════

alter table invoices
  add column if not exists currency text not null default 'EUR'
  check (currency in ('EUR', 'USD', 'GBP', 'CHF'));

alter table invoices
  add column if not exists exchange_rate numeric(10,6) default 1.000000;

-- Index voor valuta-filtering
create index if not exists idx_invoices_currency
  on invoices (user_id, currency);

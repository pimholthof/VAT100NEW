-- ═══════════════════════════════════════════════════════════════════
-- Add updated_at column + auto-update trigger to all mutable tables
-- ═══════════════════════════════════════════════════════════════════

-- Generic trigger functie
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

-- ─── profiles ──────────────────────────────────────────────────────
alter table profiles
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ─── clients ───────────────────────────────────────────────────────
alter table clients
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

-- ─── invoices ──────────────────────────────────────────────────────
alter table invoices
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

-- ─── receipts ──────────────────────────────────────────────────────
alter table receipts
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_receipts_updated_at
  before update on receipts
  for each row execute function set_updated_at();

-- ─── vat_returns ───────────────────────────────────────────────────
alter table vat_returns
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_vat_returns_updated_at
  before update on vat_returns
  for each row execute function set_updated_at();

-- ─── tax_reservations ──────────────────────────────────────────────
alter table tax_reservations
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_tax_reservations_updated_at
  before update on tax_reservations
  for each row execute function set_updated_at();

-- ─── assets ────────────────────────────────────────────────────────
alter table assets
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_assets_updated_at
  before update on assets
  for each row execute function set_updated_at();

-- ─── bank_connections ──────────────────────────────────────────────
alter table bank_connections
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_bank_connections_updated_at
  before update on bank_connections
  for each row execute function set_updated_at();

-- ─── bank_transactions ─────────────────────────────────────────────
alter table bank_transactions
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_bank_transactions_updated_at
  before update on bank_transactions
  for each row execute function set_updated_at();

-- ─── action_feed ───────────────────────────────────────────────────
alter table action_feed
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_action_feed_updated_at
  before update on action_feed
  for each row execute function set_updated_at();

-- ─── documents ─────────────────────────────────────────────────────
alter table documents
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ─── opening_balances ──────────────────────────────────────────────
alter table opening_balances
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_opening_balances_updated_at
  before update on opening_balances
  for each row execute function set_updated_at();

-- ─── annual_accounts ───────────────────────────────────────────────
alter table annual_accounts
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_annual_accounts_updated_at
  before update on annual_accounts
  for each row execute function set_updated_at();

-- ─── advisor_clients ───────────────────────────────────────────────
alter table advisor_clients
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_advisor_clients_updated_at
  before update on advisor_clients
  for each row execute function set_updated_at();

-- ─── categorization_rules ──────────────────────────────────────────
alter table categorization_rules
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_categorization_rules_updated_at
  before update on categorization_rules
  for each row execute function set_updated_at();

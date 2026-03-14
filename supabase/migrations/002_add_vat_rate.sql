-- ============================================================================
-- Add vat_rate column to invoices table
-- ============================================================================

alter table public.invoices
  add column vat_rate numeric(5,2) not null default 21;

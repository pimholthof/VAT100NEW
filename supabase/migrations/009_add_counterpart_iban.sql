-- ============================================================================
-- VAT100 — Voeg counterpart_iban toe aan bank_transactions
-- ============================================================================

alter table public.bank_transactions
  add column if not exists counterpart_iban text;

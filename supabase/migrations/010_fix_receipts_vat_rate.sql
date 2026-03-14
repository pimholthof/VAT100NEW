-- ============================================================================
-- 010: Fix receipts vat_rate default and null values
-- ============================================================================

ALTER TABLE public.receipts ALTER COLUMN vat_rate SET DEFAULT 21;
UPDATE public.receipts SET vat_rate = 21 WHERE vat_rate IS NULL;

-- Add currency support to receipts (ISO 4217 code, defaults to EUR)
ALTER TABLE public.receipts
  ADD COLUMN currency text NOT NULL DEFAULT 'EUR';

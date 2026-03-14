ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) DEFAULT 21;

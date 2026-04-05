-- Add country field to clients for VAT scheme auto-detection
ALTER TABLE public.clients ADD COLUMN country text DEFAULT 'NL';

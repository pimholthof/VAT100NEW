-- Betaaltermijn per klant (standaard 30 dagen)
ALTER TABLE public.clients ADD COLUMN payment_terms_days integer DEFAULT 30;

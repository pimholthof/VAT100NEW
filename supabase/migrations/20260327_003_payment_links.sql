-- Mollie betaallinks: iDEAL/creditcard via factuur
ALTER TABLE invoices
  ADD COLUMN payment_link TEXT,
  ADD COLUMN mollie_payment_id TEXT,
  ADD COLUMN payment_method TEXT;

-- Voeg matched_invoice_id toe aan bank_transactions voor automatische reconciliatie
ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS matched_invoice_id UUID REFERENCES invoices(id);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched_invoice
  ON bank_transactions (matched_invoice_id)
  WHERE matched_invoice_id IS NOT NULL;

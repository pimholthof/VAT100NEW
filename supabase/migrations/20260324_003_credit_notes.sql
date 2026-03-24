-- Credit notes: extend invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_credit_note boolean NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id uuid REFERENCES invoices(id);

-- Index for looking up credit notes by original invoice
CREATE INDEX idx_invoices_original ON invoices(original_invoice_id) WHERE original_invoice_id IS NOT NULL;

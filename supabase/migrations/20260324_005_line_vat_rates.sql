-- Add per-line VAT rates to invoice and quote lines
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 21;
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 21;

-- Migrate existing data: copy invoice-level vat_rate to all its lines
UPDATE invoice_lines SET vat_rate = (
  SELECT COALESCE(invoices.vat_rate, 21) FROM invoices WHERE invoices.id = invoice_lines.invoice_id
);

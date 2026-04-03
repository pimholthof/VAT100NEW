-- Track which PDF template is used per invoice
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_template TEXT DEFAULT 'poster';

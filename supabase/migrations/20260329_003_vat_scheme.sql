-- Add vat_scheme column to distinguish between different 0% VAT scenarios
-- Values: 'standard' (default), 'eu_reverse_charge', 'export_outside_eu'
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_scheme TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat_scheme TEXT NOT NULL DEFAULT 'standard';

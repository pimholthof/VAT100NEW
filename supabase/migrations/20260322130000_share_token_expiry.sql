-- Share token vervaldatum voor facturen
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS share_token_expires_at timestamptz;

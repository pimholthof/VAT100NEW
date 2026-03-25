-- Share token expiry: tokens verlopen standaard na 90 dagen
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS share_token_expires_at timestamptz;

-- Bestaande tokens krijgen geen expiry (backwards compatible)
-- Nieuwe tokens moeten expliciet een expiry meekrijgen

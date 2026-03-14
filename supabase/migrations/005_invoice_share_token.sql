-- Add share_token column for public invoice sharing
ALTER TABLE invoices ADD COLUMN share_token text UNIQUE;

-- Index for fast token lookups
CREATE INDEX idx_invoices_share_token ON invoices (share_token) WHERE share_token IS NOT NULL;

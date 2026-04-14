-- Soft-delete: archiveren in plaats van verwijderen
-- Boekhoudkundig mag je facturen/bonnen nooit kwijtraken.
-- archived_at = NULL → actief, archived_at = timestamp → gearchiveerd.

ALTER TABLE invoices ADD COLUMN archived_at timestamptz;
ALTER TABLE clients ADD COLUMN archived_at timestamptz;
ALTER TABLE receipts ADD COLUMN archived_at timestamptz;
ALTER TABLE quotes ADD COLUMN archived_at timestamptz;

-- Partial indexes: alleen actieve rijen snel doorzoekbaar
CREATE INDEX idx_invoices_active ON invoices(user_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX idx_clients_active ON clients(user_id, name) WHERE archived_at IS NULL;
CREATE INDEX idx_receipts_active ON receipts(user_id, receipt_date DESC) WHERE archived_at IS NULL;
CREATE INDEX idx_quotes_active ON quotes(user_id, created_at DESC) WHERE archived_at IS NULL;

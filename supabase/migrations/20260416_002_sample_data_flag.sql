-- =============================================
-- Migration: is_sample vlag voor onboarding-voorbeelddata
--
-- Bij het afronden van de onboarding (completeOnboarding) wordt
-- optioneel een setje voorbeeldfacturen, klanten en bonnen
-- aangemaakt met is_sample = true. De gebruiker kan deze in één
-- klik wissen; verder gedraagt het zich als gewone data.
-- =============================================

ALTER TABLE invoices  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE clients   ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE receipts  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;

-- Indexen alleen relevant voor het filteren bij het wissen
CREATE INDEX IF NOT EXISTS idx_invoices_sample
  ON invoices (user_id) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_clients_sample
  ON clients (user_id) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_receipts_sample
  ON receipts (user_id) WHERE is_sample = true;

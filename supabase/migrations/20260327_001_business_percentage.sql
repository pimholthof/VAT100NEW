-- Zakelijke/privé splitsing: percentage van de bon dat zakelijk is
ALTER TABLE receipts
  ADD COLUMN business_percentage INTEGER NOT NULL DEFAULT 100
  CONSTRAINT receipts_business_percentage_check CHECK (business_percentage >= 0 AND business_percentage <= 100);

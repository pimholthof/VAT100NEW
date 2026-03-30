-- ══════════════════════════════════════════════════════════════
-- BTW Aangiftes: Immutable VAT returns (quarters locking)
-- Fiscus-proof: once filed, a quarter's data cannot be mutated
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vat_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filed', 'accepted')),

  -- Snapshot of financials at filing time
  revenue_ex_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  output_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  input_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_vat NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- EU reverse charge / export
  eu_supplies NUMERIC(12,2) NOT NULL DEFAULT 0,
  eu_acquisitions NUMERIC(12,2) NOT NULL DEFAULT 0,
  export_outside_eu NUMERIC(12,2) NOT NULL DEFAULT 0,

  filed_at TIMESTAMPTZ,
  reference TEXT, -- Belastingdienst reference number
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, year, quarter)
);

-- RLS
ALTER TABLE vat_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vat_returns"
  ON vat_returns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vat_returns"
  ON vat_returns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vat_returns"
  ON vat_returns FOR UPDATE
  USING (auth.uid() = user_id);

-- Prevent mutation of filed quarters via trigger
CREATE OR REPLACE FUNCTION prevent_filed_quarter_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('filed', 'accepted') THEN
    RAISE EXCEPTION 'Kwartaal % Q% is al ingediend en kan niet meer worden gewijzigd.', OLD.year, OLD.quarter;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_prevent_filed_mutation
  BEFORE UPDATE ON vat_returns
  FOR EACH ROW
  WHEN (OLD.status IN ('filed', 'accepted') AND NEW.status != 'accepted')
  EXECUTE FUNCTION prevent_filed_quarter_mutation();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vat_returns_user_year ON vat_returns(user_id, year);

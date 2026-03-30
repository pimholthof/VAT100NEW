-- ══════════════════════════════════════════════════════════════
-- Depreciation Lines: per-year depreciation history
-- Supports willekeurige afschrijving (arbitrary depreciation)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS depreciation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,

  year INT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,       -- Depreciation amount for this year
  is_arbitrary BOOLEAN NOT NULL DEFAULT FALSE, -- Willekeurige afschrijving
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(asset_id, year)
);

-- RLS
ALTER TABLE depreciation_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own depreciation_lines"
  ON depreciation_lines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own depreciation_lines"
  ON depreciation_lines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own depreciation_lines"
  ON depreciation_lines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own depreciation_lines"
  ON depreciation_lines FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_depreciation_lines_asset ON depreciation_lines(asset_id, year);
CREATE INDEX IF NOT EXISTS idx_depreciation_lines_user_year ON depreciation_lines(user_id, year);

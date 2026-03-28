-- ─── Openingsbalans: import voorgaande jaarrekening ───

CREATE TABLE opening_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  eigen_vermogen numeric(12,2) DEFAULT 0,
  vaste_activa numeric(12,2) DEFAULT 0,
  bank_saldo numeric(12,2) DEFAULT 0,
  debiteuren numeric(12,2) DEFAULT 0,
  crediteuren numeric(12,2) DEFAULT 0,
  btw_schuld numeric(12,2) DEFAULT 0,
  overige_activa numeric(12,2) DEFAULT 0,
  overige_passiva numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year)
);

-- RLS
ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own opening balances"
  ON opening_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own opening balances"
  ON opening_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own opening balances"
  ON opening_balances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own opening balances"
  ON opening_balances FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_opening_balances_user_year ON opening_balances(user_id, year);

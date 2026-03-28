-- ─── Activastaat: Vaste activa met afschrijving ───

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  omschrijving text NOT NULL,
  aanschaf_datum date NOT NULL,
  aanschaf_prijs numeric(12,2) NOT NULL,
  restwaarde numeric(12,2) DEFAULT 0,
  levensduur integer DEFAULT 5,
  categorie text,
  receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
  notitie text,
  is_verkocht boolean DEFAULT false,
  verkoop_datum date,
  verkoop_prijs numeric(12,2),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_assets_user_id ON assets(user_id);

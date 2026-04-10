-- VAT Suggestions table voor de BTW-tarief Detector Agent

CREATE TYPE vat_suggestion_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE vat_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('invoice', 'receipt')),
  item_id uuid NOT NULL,
  suggested_vat_rate int NOT NULL CHECK (suggested_vat_rate IN (0, 9, 21)),
  confidence numeric NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  issue text NOT NULL,
  status vat_suggestion_status NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Een suggestie per item
  UNIQUE (item_type, item_id)
);

-- RLS
ALTER TABLE vat_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vat_suggestions"
  ON vat_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vat_suggestions"
  ON vat_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vat_suggestions"
  ON vat_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vat_suggestions"
  ON vat_suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_vat_suggestions_user_status ON vat_suggestions(user_id, status);
CREATE INDEX idx_vat_suggestions_item ON vat_suggestions(item_type, item_id);

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vat_suggestions_updated_at 
  BEFORE UPDATE ON vat_suggestions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

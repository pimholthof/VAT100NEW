-- BTW Suppletie (correctie op ingediende BTW-aangifte)
CREATE TABLE vat_return_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  original_return_id uuid REFERENCES vat_returns(id) NOT NULL,
  year integer NOT NULL,
  quarter integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  reden text NOT NULL,
  rubriek_1a_omzet numeric NOT NULL DEFAULT 0,
  rubriek_1a_btw numeric NOT NULL DEFAULT 0,
  rubriek_1b_omzet numeric NOT NULL DEFAULT 0,
  rubriek_1b_btw numeric NOT NULL DEFAULT 0,
  rubriek_1c_omzet numeric NOT NULL DEFAULT 0,
  rubriek_1c_btw numeric NOT NULL DEFAULT 0,
  rubriek_2a_omzet numeric NOT NULL DEFAULT 0,
  rubriek_2a_btw numeric NOT NULL DEFAULT 0,
  rubriek_3b_omzet numeric NOT NULL DEFAULT 0,
  rubriek_3b_btw numeric NOT NULL DEFAULT 0,
  rubriek_4a_omzet numeric NOT NULL DEFAULT 0,
  rubriek_4a_btw numeric NOT NULL DEFAULT 0,
  rubriek_4b_omzet numeric NOT NULL DEFAULT 0,
  rubriek_4b_btw numeric NOT NULL DEFAULT 0,
  rubriek_5b numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vat_return_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own VAT return corrections" ON vat_return_corrections
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_vat_corrections_user ON vat_return_corrections(user_id, year, quarter);

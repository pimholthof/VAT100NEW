-- VAT Returns (BTW-Aangiftes) with immutability protection

-- Status enum
CREATE TYPE vat_return_status AS ENUM ('draft', 'locked', 'submitted');

-- Main table
CREATE TABLE vat_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year int NOT NULL CHECK (year >= 2020),
  quarter int NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  -- OB Rubrieken
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
  -- Status
  status vat_return_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One return per user per quarter
  UNIQUE (user_id, year, quarter)
);

-- FK on invoices and receipts
ALTER TABLE invoices ADD COLUMN vat_return_id uuid REFERENCES vat_returns(id) ON DELETE SET NULL;
ALTER TABLE receipts ADD COLUMN vat_return_id uuid REFERENCES vat_returns(id) ON DELETE SET NULL;

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

CREATE POLICY "Users can delete own vat_returns"
  ON vat_returns FOR DELETE
  USING (auth.uid() = user_id);

-- Immutability trigger: prevent mutations on invoices/receipts linked to locked/submitted vat_returns
CREATE OR REPLACE FUNCTION prevent_locked_quarter_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status vat_return_status;
BEGIN
  -- For DELETE, check OLD record
  IF TG_OP = 'DELETE' THEN
    IF OLD.vat_return_id IS NOT NULL THEN
      SELECT status INTO v_status FROM vat_returns WHERE id = OLD.vat_return_id;
      IF v_status IN ('locked', 'submitted') THEN
        RAISE EXCEPTION 'Kan niet wijzigen: gekoppeld aan een vergrendelde BTW-aangifte (%).', v_status;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- For UPDATE, check both OLD and NEW
  IF TG_OP = 'UPDATE' THEN
    IF OLD.vat_return_id IS NOT NULL THEN
      SELECT status INTO v_status FROM vat_returns WHERE id = OLD.vat_return_id;
      IF v_status IN ('locked', 'submitted') THEN
        RAISE EXCEPTION 'Kan niet wijzigen: gekoppeld aan een vergrendelde BTW-aangifte (%).', v_status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoices_locked_quarter
  BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_quarter_mutation();

CREATE TRIGGER trg_receipts_locked_quarter
  BEFORE UPDATE OR DELETE ON receipts
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_quarter_mutation();

-- Indexes
CREATE INDEX idx_vat_returns_user_year_q ON vat_returns(user_id, year, quarter);
CREATE INDEX idx_invoices_vat_return_id ON invoices(vat_return_id) WHERE vat_return_id IS NOT NULL;
CREATE INDEX idx_receipts_vat_return_id ON receipts(vat_return_id) WHERE vat_return_id IS NOT NULL;

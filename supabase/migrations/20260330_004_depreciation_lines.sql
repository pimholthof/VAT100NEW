-- Add depreciation_method to assets table
-- 'linear' = standard lineaire afschrijving
-- 'willekeurig' = willekeurige afschrijving (per jaar instelbaar bedrag)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'depreciation_method'
  ) THEN
    ALTER TABLE assets ADD COLUMN depreciation_method text NOT NULL DEFAULT 'linear'
      CHECK (depreciation_method IN ('linear', 'willekeurig'));
  END IF;
END $$;

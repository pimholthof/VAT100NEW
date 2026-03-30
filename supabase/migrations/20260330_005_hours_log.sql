-- ══════════════════════════════════════════════════════════════
-- Hours Log: Urenregistratie voor het urencriterium (≥1.225 uur/jaar)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hours_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  work_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  project TEXT,        -- Optional project/client grouping
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE hours_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hours_log"
  ON hours_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hours_log"
  ON hours_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hours_log"
  ON hours_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hours_log"
  ON hours_log FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hours_log_user_date ON hours_log(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_hours_log_user_year ON hours_log(user_id, (EXTRACT(year FROM work_date)));

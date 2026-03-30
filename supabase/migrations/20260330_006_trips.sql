-- ══════════════════════════════════════════════════════════════
-- Trips: Kilometerregistratie & autokosten
-- Fiscale aftrek: €0,23/km (2026 tarief)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  trip_date DATE NOT NULL,
  description TEXT NOT NULL,
  origin TEXT,             -- Vertrekpunt
  destination TEXT,        -- Bestemming
  distance_km NUMERIC(8,1) NOT NULL CHECK (distance_km > 0),
  is_return_trip BOOLEAN NOT NULL DEFAULT FALSE,  -- Heen-en-terug (verdubbelt km)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_date ON trips(user_id, trip_date);

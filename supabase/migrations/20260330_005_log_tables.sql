-- Hours log (urenregistratie) and Trips (rittenregistratie)

CREATE TABLE hours_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL CHECK (hours > 0 AND hours <= 24),
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  distance_km numeric NOT NULL CHECK (distance_km > 0),
  is_return_trip boolean NOT NULL DEFAULT false,
  purpose text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: hours_log
ALTER TABLE hours_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hours_log"
  ON hours_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hours_log"
  ON hours_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hours_log"
  ON hours_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hours_log"
  ON hours_log FOR DELETE USING (auth.uid() = user_id);

-- RLS: trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_hours_log_user_date ON hours_log(user_id, date);
CREATE INDEX idx_trips_user_date ON trips(user_id, date);

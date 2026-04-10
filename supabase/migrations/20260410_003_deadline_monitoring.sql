-- Tabellen voor de Deadline Monitor Agent

-- Deadline alerts
CREATE TYPE deadline_alert_type AS ENUM (
  'vat_deadline', 
  'income_tax_deadline', 
  'hours_progress', 
  'kia_deadline', 
  'compliance'
);

CREATE TYPE deadline_urgency AS ENUM ('OVERDUE', 'URGENT', 'WARNING', 'INFO');

CREATE TABLE deadline_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type deadline_alert_type NOT NULL,
  urgency deadline_urgency NOT NULL,
  message text NOT NULL,
  deadline_date timestamptz,
  quarter int,
  year int,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compliance status tracking
CREATE TABLE compliance_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  issues jsonb DEFAULT '[]',
  last_checked timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Een record per user
  UNIQUE (user_id)
);

-- Tax returns table (voor inkomstenbelasting)
CREATE TYPE tax_return_status AS ENUM ('draft', 'submitted', 'processed');

CREATE TABLE tax_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year int NOT NULL CHECK (year >= 2020),
  status tax_return_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  processed_at timestamptz,
  data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Een return per user per jaar
  UNIQUE (user_id, year)
);

-- RLS policies
ALTER TABLE deadline_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deadline_alerts"
  ON deadline_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deadline_alerts"
  ON deadline_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deadline_alerts"
  ON deadline_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deadline_alerts"
  ON deadline_alerts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own compliance_status"
  ON compliance_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compliance_status"
  ON compliance_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compliance_status"
  ON compliance_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tax_returns"
  ON tax_returns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax_returns"
  ON tax_returns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax_returns"
  ON tax_returns FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_deadline_alerts_user_status ON deadline_alerts(user_id, status);
CREATE INDEX idx_deadline_alerts_type_urgency ON deadline_alerts(alert_type, urgency);
CREATE INDEX idx_deadline_alerts_deadline ON deadline_alerts(deadline_date) WHERE deadline_date IS NOT NULL;
CREATE INDEX idx_compliance_status_user ON compliance_status(user_id);
CREATE INDEX idx_compliance_status_score ON compliance_status(score);
CREATE INDEX idx_tax_returns_user_year ON tax_returns(user_id, year);

-- Triggers voor updated_at
CREATE TRIGGER update_deadline_alerts_updated_at 
  BEFORE UPDATE ON deadline_alerts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_status_updated_at 
  BEFORE UPDATE ON compliance_status 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_returns_updated_at 
  BEFORE UPDATE ON tax_returns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

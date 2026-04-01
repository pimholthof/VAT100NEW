-- Admin Audit Log: track all admin actions for compliance and traceability
CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action);

-- RLS: only admins can read, service role inserts
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON admin_audit_log FOR SELECT
  USING (is_admin());

-- System Settings table for runtime configuration
CREATE TABLE system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON system_settings FOR ALL
  USING (is_admin());

-- Seed default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('platform.name', '"VAT100"', 'Platform naam'),
  ('platform.registration_open', 'true', 'Of nieuwe registraties zijn toegestaan'),
  ('platform.maintenance_mode', 'false', 'Onderhoudsmodus actief'),
  ('platform.default_vat_rate', '21', 'Standaard BTW-tarief'),
  ('notifications.welcome_email', 'true', 'Welkomstemails versturen naar nieuwe gebruikers'),
  ('notifications.overdue_reminders', 'true', 'Automatische betalingsherinneringen'),
  ('limits.max_free_users', '0', 'Maximaal aantal gratis gebruikers (0 = onbeperkt)');

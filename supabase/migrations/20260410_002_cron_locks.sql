-- Distributed cron locking om dubbele executie te voorkomen
CREATE TABLE IF NOT EXISTS cron_locks (
  job_name TEXT PRIMARY KEY,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Automatisch verlopen locks opruimen
CREATE INDEX IF NOT EXISTS idx_cron_locks_expires ON cron_locks (expires_at);

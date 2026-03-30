-- ============================================================================
-- VAT100 — Bank Connection Health & Sync Logging
-- Adds error tracking, account names, consent expiry, and sync audit trail.
-- ============================================================================

-- Extend bank_connections with health tracking fields
ALTER TABLE bank_connections
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS error_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS account_holder text,
  ADD COLUMN IF NOT EXISTS consent_expires_at timestamptz;

-- Sync audit log
CREATE TABLE IF NOT EXISTS public.bank_sync_log (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_connection_id    uuid        NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  status                text        NOT NULL CHECK (status IN ('success', 'error', 'rate_limited')),
  transaction_count     integer     NOT NULL DEFAULT 0,
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON public.bank_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs"
  ON public.bank_sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_bank_sync_log_connection ON public.bank_sync_log (bank_connection_id, created_at DESC);

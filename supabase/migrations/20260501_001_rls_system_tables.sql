-- Enable RLS on system-only tables to deny access from anon/authenticated roles.
-- These tables are accessed exclusively via the service-role key (cron jobs,
-- webhook handlers); enabling RLS without policies blocks PostgREST clients
-- while leaving service-role access intact (service role bypasses RLS).

ALTER TABLE cron_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop the over-broad "service_role_all" policy on email_preferences.
-- The original policy used USING (true) WITH CHECK (true) without a TO clause,
-- so it effectively granted every authenticated user read/write access to all
-- users' unsubscribe_token and email preferences. The service role bypasses
-- RLS by design, so no policy is needed for service-role access.

DROP POLICY IF EXISTS "service_role_all" ON public.email_preferences;

-- Dashboard widget layout preferences per user
-- Schema: { "order": ["kpi-grid", "health-score", ...], "hidden": ["ai-assistant"] }
-- NULL = default layout (all widgets visible, default order)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.dashboard_layout IS
  'User dashboard widget order and visibility preferences';

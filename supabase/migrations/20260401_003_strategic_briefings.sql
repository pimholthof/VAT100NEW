-- ══════════════════════════════════════════════════════════════
-- STRATEGIC BRIEFINGS: CFO Snapshots
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.strategic_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Financial Metrics (in cents)
    mrr_cents INTEGER NOT NULL DEFAULT 0,
    churn_mrr_cents INTEGER NOT NULL DEFAULT 0,
    pipeline_value_cents INTEGER NOT NULL DEFAULT 0,
    
    -- User Metrics
    active_users INTEGER NOT NULL DEFAULT 0,
    at_risk_leads INTEGER NOT NULL DEFAULT 0,
    
    -- AI Generated Insights
    briefing_text TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Admin Only
ALTER TABLE public.strategic_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage strategic_briefings" ON public.strategic_briefings
    USING (public.is_admin());

-- Index for temporal queries (Growth calculation)
CREATE INDEX IF NOT EXISTS idx_strategic_briefings_created ON public.strategic_briefings (created_at DESC);

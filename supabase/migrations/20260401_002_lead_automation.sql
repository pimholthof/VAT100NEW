-- ══════════════════════════════════════════════════════════════
-- ECOSYSTEM AUTOMATION: Lead Tokens & Plan Targeting
-- ══════════════════════════════════════════════════════════════

-- 1. Update Lead Lifecycle to match the Monitoring View (Safe check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Link Verstuurd' AND enumtypid = 'public.lead_lifecycle'::regtype) THEN
        ALTER TYPE public.lead_lifecycle ADD VALUE 'Link Verstuurd';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Plan Gekozen' AND enumtypid = 'public.lead_lifecycle'::regtype) THEN
        ALTER TYPE public.lead_lifecycle ADD VALUE 'Plan Gekozen';
    END IF;
END $$;

-- 2. Add target_plan_id to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS target_plan_id TEXT REFERENCES public.plans(id);

-- 3. Create lead_tokens for secure registration pre-filling
CREATE TABLE IF NOT EXISTS public.lead_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_lead_tokens_token ON public.lead_tokens(token);

-- Security: Admin Only (same as leads)
ALTER TABLE public.lead_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead_tokens" ON public.lead_tokens
    USING (public.is_admin());

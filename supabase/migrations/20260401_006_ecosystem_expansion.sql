-- ══════════════════════════════════════════════════════════════
-- ECOSYSTEM EXPANSION: Onboarding, Feedback, Learning, Uren→Factuur
-- Sprint 1-5 ontbrekende schema's
-- ══════════════════════════════════════════════════════════════


-- ─── 1. LEAD BRONNEN UITBREIDEN ───
-- Voeg ontbrekende lead sources toe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'marketing' AND enumtypid = 'public.lead_source'::regtype) THEN
        ALTER TYPE public.lead_source ADD VALUE 'marketing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'branding' AND enumtypid = 'public.lead_source'::regtype) THEN
        ALTER TYPE public.lead_source ADD VALUE 'branding';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'waitlist' AND enumtypid = 'public.lead_source'::regtype) THEN
        ALTER TYPE public.lead_source ADD VALUE 'waitlist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'via_via' AND enumtypid = 'public.lead_source'::regtype) THEN
        ALTER TYPE public.lead_source ADD VALUE 'via_via';
    END IF;
END $$;


-- ─── 2. WAITLIST → LEADS AUTOMATISCHE TRIGGER ───
-- Bij elke nieuwe waitlist aanmelding wordt automatisch een lead aangemaakt
CREATE OR REPLACE FUNCTION public.waitlist_to_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Alleen aanmaken als er nog geen lead met dit e-mail bestaat
    INSERT INTO public.leads (email, first_name, source, lifecycle_stage)
    VALUES (NEW.email, COALESCE(NEW.name, ''), 'waitlist', 'Nieuw')
    ON CONFLICT (email) DO NOTHING;

    -- Event aanmaken voor de automation engine
    INSERT INTO public.system_events (event_type, payload)
    VALUES ('lead.waitlist_signup', jsonb_build_object(
        'email', NEW.email,
        'name', COALESCE(NEW.name, ''),
        'waitlist_id', NEW.id,
        'referral', NEW.referral
    ));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger alleen als die nog niet bestaat
DROP TRIGGER IF EXISTS on_waitlist_insert ON public.waitlist;
CREATE TRIGGER on_waitlist_insert
    AFTER INSERT ON public.waitlist
    FOR EACH ROW
    EXECUTE FUNCTION public.waitlist_to_lead();


-- ─── 3. ONBOARDING TAKEN ───
-- Checklist per nieuwe klant na account activatie
CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    task_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Gebruikers kunnen eigen onboarding zien en bijwerken
CREATE POLICY "Users can view own onboarding"
    ON public.onboarding_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
    ON public.onboarding_tasks FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins kunnen alles
CREATE POLICY "Admins can manage onboarding"
    ON public.onboarding_tasks
    USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON public.onboarding_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_incomplete ON public.onboarding_tasks(user_id)
    WHERE completed = FALSE;


-- ─── 4. FEEDBACK SYSTEEM ───
-- Bug reports, feature requests, NPS scores
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'nps', 'general')),
    score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
    message TEXT NOT NULL,
    page_url TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
    ON public.feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can submit feedback"
    ON public.feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage feedback"
    ON public.feedback
    USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type, status);
CREATE INDEX IF NOT EXISTS idx_feedback_nps ON public.feedback(created_at)
    WHERE type = 'nps';


-- ─── 5. UREN → OFFERTE KOPPELING ───
-- Link uren aan offertes voor automatische facturatie
ALTER TABLE public.hours_log ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;
ALTER TABLE public.hours_log ADD COLUMN IF NOT EXISTS quote_line_id UUID;
ALTER TABLE public.hours_log ADD COLUMN IF NOT EXISTS project_name TEXT;

CREATE INDEX IF NOT EXISTS idx_hours_log_quote ON public.hours_log(quote_id)
    WHERE quote_id IS NOT NULL;


-- ─── 6. LEARNING RULES UITBREIDEN ───
-- Voeg confidence scoring en auto-apply logica toe
ALTER TABLE public.categorization_rules ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2) DEFAULT 0.5;
ALTER TABLE public.categorization_rules ADD COLUMN IF NOT EXISTS times_applied INTEGER DEFAULT 0;
ALTER TABLE public.categorization_rules ADD COLUMN IF NOT EXISTS times_corrected INTEGER DEFAULT 0;
ALTER TABLE public.categorization_rules ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN DEFAULT FALSE;
ALTER TABLE public.categorization_rules ADD COLUMN IF NOT EXISTS rule_type TEXT DEFAULT 'categorization';
ALTER TABLE public.categorization_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- ─── 7. ADMIN AUDIT LOG ───
-- Alle admin-acties bijhouden
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT,           -- 'user', 'lead', 'invoice', 'subscription'
    target_id TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
    ON public.admin_audit_log FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can insert audit log"
    ON public.admin_audit_log FOR INSERT
    WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_admin_audit_date ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_log(target_type, target_id);

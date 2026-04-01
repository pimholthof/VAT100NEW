-- ══════════════════════════════════════════════════════════════
-- ECOSYSTEM FOUNDATION: Event Bus & CRM
-- ══════════════════════════════════════════════════════════════

-- 1. SYSTEM EVENTS (The Event Bus)
-- Records every major action to trigger AI agents
CREATE TABLE IF NOT EXISTS public.system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,       -- e.g., 'lead.created', 'invoice.paid'
    payload JSONB DEFAULT '{}',     -- Data relevant to the event
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ        -- When the agent fleet has finished processing
);

-- Index for cron jobs to find unprocessed events
CREATE INDEX IF NOT EXISTS idx_system_events_unprocessed ON public.system_events (created_at) 
WHERE processed_at IS NULL;


-- 2. LEADS (The Sales Pipeline)
-- Central CRM for prospects from Website & Substack
CREATE TYPE public.lead_source AS ENUM ('website', 'substack', 'referral', 'manual');
CREATE TYPE public.lead_lifecycle AS ENUM ('Nieuw', 'Contact Gelegd', 'Kennismaking', 'Voorstel', 'Klant', 'On hold', 'Niet Relevant');

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    source public.lead_source NOT NULL DEFAULT 'website',
    lifecycle_stage public.lead_lifecycle NOT NULL DEFAULT 'Nieuw',
    
    score_fit NUMERIC(3,2) DEFAULT 0,       -- 0.0 to 1.0 (fit with VAT100 target)
    score_engagement NUMERIC(3,2) DEFAULT 0, -- 0.0 to 1.0 (activity level)
    
    vat100_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Linked after conversion
    
    metadata JSONB DEFAULT '{}',            -- Flexible fields (KVK, industry, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3. LEAD ACTIVITIES (Interaction Log)
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,    -- 'email', 'call', 'note', 'system_alert'
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 4. LEAD TASKS (SOP Actions)
CREATE TABLE IF NOT EXISTS public.lead_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- SECURITY: RLS Policies (Admin Only)
-- ══════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

-- Helper Function for Admin Check (if not already exists)
-- This assumes profiles.role = 'admin' pattern from 20260326_001_admin_role.sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Admins
CREATE POLICY "Admins can manage system_events" ON public.system_events
    USING (public.is_admin());

CREATE POLICY "Admins can manage leads" ON public.leads
    USING (public.is_admin());

CREATE POLICY "Admins can manage activities" ON public.lead_activities
    USING (public.is_admin());

CREATE POLICY "Admins can manage tasks" ON public.lead_tasks
    USING (public.is_admin());


-- ══════════════════════════════════════════════════════════════
-- TRIGGERS: Updated At
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lead_updated
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

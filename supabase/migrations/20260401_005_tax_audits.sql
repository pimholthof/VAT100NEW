-- ══════════════════════════════════════════════════════════════
-- PROACTIVE TAX AUDITOR: Audit Schema
-- ══════════════════════════════════════════════════════════════

-- 1. TAX AUDITS: History of fiscal health runs
CREATE TABLE IF NOT EXISTS public.tax_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    year INTEGER NOT NULL,
    
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    
    -- Findings: Detailed list of issues (Missing receipts, unlinked tx, hours progress)
    findings JSONB DEFAULT '{
        "missing_receipts": [],
        "unlinked_invoices": [],
        "hours_gap": 0,
        "anomalies": []
    }',
    
    status TEXT NOT NULL DEFAULT 'Gedaan' CHECK (status IN ('Gedaan', 'Aandacht Vereist', 'Kritiek')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Users can only see their own audits
ALTER TABLE public.tax_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audits" ON public.tax_audits
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own audits" ON public.tax_audits
    FOR ALL 
    USING (auth.uid() = user_id);

-- 2. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_tax_audits_user_quarter_year ON public.tax_audits(user_id, quarter, year);

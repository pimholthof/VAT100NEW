-- ══════════════════════════════════════════════════════════════
-- NETWORK & KNOWLEDGE HUB: Community Schema
-- ══════════════════════════════════════════════════════════════

-- 1. EXTEND PROFILES: Network Data
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS expertise TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS industry TEXT;

-- 2. RESOURCES: The Knowledge Base
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('guide', 'template', 'checklist', 'video')),
    category TEXT NOT NULL DEFAULT 'Algemeen', -- e.g., 'Fiscaal', 'Business', 'Growth'
    
    download_url TEXT, -- Link to actual file (e.g. in Supabase Storage)
    thumbnail_url TEXT,
    
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Public Profiles are visible to all AUTHENTICATED users
-- (But ONLY if is_public = TRUE)
CREATE POLICY "Public profiles are viewable by all members" ON public.profiles
    FOR SELECT 
    USING (is_public = TRUE OR auth.uid() = id);

-- RLS: Resources are visible to all AUTHENTICATED users
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resources are viewable by all members" ON public.resources
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- RLS: Admins can manage resources
CREATE POLICY "Admins can manage resources" ON public.resources
    FOR ALL 
    USING (public.is_admin());


-- 3. SEED RESOURCES: Initial Knowledge Base Content
INSERT INTO public.resources (title, description, type, category, download_url)
VALUES 
    ('Fiscale Gids voor Creators (v1.0)', 'Een must-read over BTW-vrijstellingen voor internationaal werk en de KOR-regeling.', 'guide', 'Fiscaal', '#'),
    ('Urendeclaratie Model (Excel)', 'De officiële VAT100 template voor je urenverantwoording richting de fiscus.', 'template', 'Business', '#'),
    ('Investerings-aftrek Checklist', 'Mis nooit meer extra aftrekposten door deze KIA/MIA/VAMIL checklist bij elke aankoop.', 'checklist', 'Fiscaal', '#')
ON CONFLICT DO NOTHING;

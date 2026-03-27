-- Waitlist table for collecting email signups from the landing page
CREATE TABLE public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  source TEXT DEFAULT 'landing_page'
);

CREATE INDEX idx_waitlist_email ON public.waitlist (email);

-- Enable RLS with no policies = only service role can access
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

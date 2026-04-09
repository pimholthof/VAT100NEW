-- Lookup Cache: stores KvK and VIES API responses to reduce external calls.
-- Accessed via service client only (no user-level RLS needed).

CREATE TABLE IF NOT EXISTS public.lookup_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_type text NOT NULL,  -- 'kvk' or 'vies'
  cache_key text NOT NULL,   -- search query or vat number
  data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(cache_type, cache_key)
);

CREATE INDEX idx_lookup_cache_type_key ON public.lookup_cache(cache_type, cache_key);

ALTER TABLE public.lookup_cache ENABLE ROW LEVEL SECURITY;

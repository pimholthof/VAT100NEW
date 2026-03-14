-- Supabase Storage setup (handmatig in dashboard):
-- 1. Maak bucket "receipts" aan in Supabase Dashboard > Storage
-- 2. Voeg RLS policy toe zodat authenticated users kunnen uploaden naar hun eigen user_id prefix:
--    - Policy naam: "Users can upload to own folder"
--    - Allowed operation: INSERT
--    - Target roles: authenticated
--    - WITH CHECK: (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
-- 3. Voeg RLS policy toe voor lezen:
--    - Policy naam: "Users can read own receipts"
--    - Allowed operation: SELECT
--    - Target roles: authenticated
--    - USING: (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
-- Pad format: {user_id}/{receipt_id}/{filename}

ALTER TABLE public.receipts ADD COLUMN cost_code integer;

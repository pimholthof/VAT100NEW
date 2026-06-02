-- ============================================================================
-- Verwijder expliciete-AI quota-infrastructuur
--
-- De zichtbare AI-assistent/chat is uit het product gehaald. De
-- tekstherkenning op bonnen/facturen blijft bestaan, maar zonder
-- maandelijkse AI-quota. Deze migratie ruimt de nu-ongebruikte
-- quota-objecten op. Idempotent (if exists).
-- ============================================================================

-- Atomic increment RPC (had alleen de quota nodig)
drop function if exists public.consume_ai_quota(uuid, date, text, integer);

-- Verbruik-tracking tabel (ocr_count/chat_count per maand)
drop table if exists public.ai_usage;

-- Per-plan quota-kolommen
alter table public.plans
  drop column if exists ai_ocr_quota,
  drop column if exists ai_chat_quota;

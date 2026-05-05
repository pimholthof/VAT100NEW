-- Compleet-tier uit launch-scope (v1).
--
-- Reden: Compleet verkocht "AI-chat (200 berichten/mnd)", "AI auto-boeking
-- zonder goedkeuring" en "Prioriteit support" — drie beloften zonder
-- werkende implementatie. Liever twee eerlijke tiers dan een derde tier
-- met broken promises.
--
-- v1 = Start €29 + Studio €39. Jaarrekening verhuist mee naar Studio
-- (zie wijziging in app/api/jaarrekening/[year]/route.ts).
--
-- Compleet blijft schema-aanwezig voor heractivatie in v1.x zodra:
--   - LLM-backend voor chat draait
--   - Auto-boeking zonder goedkeuring veilig is
--   - SLA-systeem voor prioriteit support staat
update public.plans
   set is_active = false
 where id in ('compleet', 'compleet_yearly');

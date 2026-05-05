-- Bankkoppeling-bullet uit Studio-tier voor v1.
--
-- Reden: Tink-integratie werkt in sandbox maar productie-credentials +
-- 4-bank-test (ING/ABN/Rabo/Bunq) zijn niet gevalideerd binnen de launch-
-- timeline. Liever niet beloven dan klant een halfwerkende koppeling
-- aanbieden met PSD2 90-dagen-reconsent-friction.
--
-- v1.x: Tink in productie + relaunch met "Bankrekening koppeling" terug.
-- Tot die tijd: CSV-import van bank via /dashboard/import is de fallback.
update public.plans
   set features = (
     select coalesce(jsonb_agg(value), '[]'::jsonb)
       from jsonb_array_elements_text(features) as t(value)
      where value <> 'Bankrekening koppeling'
   )
 where id in ('studio', 'studio_yearly');

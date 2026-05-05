-- Plus-tier uit launch-scope (v1).
--
-- Reden: Plus verkoopt "Directe Digipoort BTW-aangifte", maar de Digipoort-
-- integratie staat in mock-mode tot het PKIoverheid-certificaat is
-- aangeschaft. Plus blijft schema-aanwezig voor heractivatie in v1.1.
update public.plans
   set is_active = false
 where id in ('plus', 'plus_yearly');

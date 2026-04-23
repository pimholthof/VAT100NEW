-- ============================================================================
-- Grandfathering backfill — eerlijke behandeling bestaande klanten
--
-- De prijsrevisie van 20260421_001 verhoogt Compleet naar €79 en introduceert
-- Plus €149. Klanten die al voor die verhoging op Compleet zaten krijgen
-- eenmalig hun huidige prijs (€59) vastgezet + de founding-member vlag.
-- ============================================================================

-- Alle actieve/lopende subscriptions op het oude Compleet-plan krijgen
-- hun huidige prijs vastgezet op €59 en worden gemarkeerd als founding member.
update public.subscriptions
set
  price_lock_cents   = 5900,
  is_founding_member = true,
  updated_at         = now()
where plan_id = 'compleet'
  and price_lock_cents is null
  and status in ('active', 'past_due', 'pending')
  and created_at < now();

-- Zelfde voor Studio: prijs bleef €39, dus geen verhoging — maar we zetten
-- wel de founding-member vlag voor zichtbaarheid + toekomstige prijsstabiliteit.
update public.subscriptions
set
  is_founding_member = true,
  updated_at         = now()
where plan_id = 'studio'
  and is_founding_member = false
  and status in ('active', 'past_due', 'pending')
  and created_at < now();

-- Basis-tier (Start) bleef €29; geen prijsactie nodig.
-- Plus-tier is nieuw; geen bestaande klanten.

-- Diagnostisch: tel hoeveel klanten gegrandfathered zijn (voor admin-audit).
-- Deze NOTICE verschijnt in migratie-logs.
do $$
declare
  v_compleet_grandfathered integer;
  v_studio_founding        integer;
begin
  select count(*) into v_compleet_grandfathered
    from public.subscriptions
    where plan_id = 'compleet' and price_lock_cents = 5900;

  select count(*) into v_studio_founding
    from public.subscriptions
    where plan_id = 'studio' and is_founding_member = true;

  raise notice 'Grandfathered: % Compleet-klanten @ €59, % Studio founding members',
    v_compleet_grandfathered, v_studio_founding;
end $$;

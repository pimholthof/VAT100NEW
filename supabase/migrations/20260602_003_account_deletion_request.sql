-- AVG: recht op verwijdering via verzoek. We deactiveren direct (status =
-- 'suspended') en leggen het verzoek vast. Volledige wissing gebeurt ná de
-- fiscale bewaartermijn of door een admin — daarom alleen een tijdstempel.

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz;

create index if not exists idx_profiles_deletion_requested
  on public.profiles (deletion_requested_at)
  where deletion_requested_at is not null;

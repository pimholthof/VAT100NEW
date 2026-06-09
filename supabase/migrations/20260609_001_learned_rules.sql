-- Generieke geleerde regels: domein-onafhankelijke "verbetert zichzelf"-opslag.
-- Bestaande categorization_rules (tegenpartij → categorie) blijft voor de
-- banktransactie-lus; deze tabel verbreedt het leren naar andere domeinen,
-- bv. "receipt_cost_code" (leverancier → kostsoort).
create table public.learned_rules (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  domain      text        not null,                 -- bv. 'receipt_cost_code'
  pattern     text        not null,                 -- genormaliseerd (lowercased)
  value       text        not null,                 -- de geleerde uitkomst
  strength    integer     not null default 1,       -- hoe vaak eensluidend bevestigd
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, domain, pattern)
);

alter table public.learned_rules enable row level security;

create policy "Users can view own learned rules"
  on public.learned_rules for select
  using (auth.uid() = user_id);

create policy "Users can insert own learned rules"
  on public.learned_rules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own learned rules"
  on public.learned_rules for update
  using (auth.uid() = user_id);

create policy "Users can delete own learned rules"
  on public.learned_rules for delete
  using (auth.uid() = user_id);

create index learned_rules_user_domain_idx
  on public.learned_rules (user_id, domain);

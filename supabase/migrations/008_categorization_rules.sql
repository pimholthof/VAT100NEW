-- Categorization rules: stores learned corrections for AI auto-categorization
create table public.categorization_rules (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  counterpart_pattern text      not null,
  category          text        not null,
  is_income         boolean     not null default false,
  created_at        timestamptz not null default now(),
  unique(user_id, counterpart_pattern)
);

alter table public.categorization_rules enable row level security;

create policy "Users can view own rules"
  on public.categorization_rules for select
  using (auth.uid() = user_id);

create policy "Users can insert own rules"
  on public.categorization_rules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rules"
  on public.categorization_rules for update
  using (auth.uid() = user_id);

create policy "Users can delete own rules"
  on public.categorization_rules for delete
  using (auth.uid() = user_id);

-- Bèta-feedback: lichtgewicht kanaal om snel en wrijvingsloos reacties van de
-- eerste gebruikers te verzamelen. Bewust minimaal — later uit te breiden met
-- categorieën, screenshots of statusworkflow.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  page_url text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Gebruiker stuurt eigen feedback in...
create policy "Users insert own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

-- ...en kan die zelf teruglezen.
create policy "Users read own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- Admins lezen en beheren alle feedback.
create policy "Admins manage feedback"
  on public.feedback for all
  using (public.is_admin());

create index if not exists idx_feedback_created_at on public.feedback (created_at desc);
create index if not exists idx_feedback_status on public.feedback (status);

-- =============================================
-- Migration 011: Action Feed & AI Agent Support
-- =============================================

-- 1. Create the action_feed table
create table if not exists action_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('missing_receipt', 'match_suggestion', 'tax_alert', 'uncategorized')),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'ignored')),
  title text not null,
  description text not null default '',
  amount numeric,
  related_transaction_id uuid references bank_transactions(id) on delete set null,
  related_receipt_id uuid references receipts(id) on delete set null,
  suggested_category text,
  ai_confidence numeric,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Index for fast dashboard queries (pending items for a user)
create index idx_action_feed_user_pending 
  on action_feed (user_id, status) 
  where status = 'pending';

-- 2. Add AI columns to bank_transactions
alter table bank_transactions 
  add column if not exists ai_confidence numeric,
  add column if not exists ai_category_suggestion text;

-- 3. RLS policies for action_feed
alter table action_feed enable row level security;

create policy "Users can view own action_feed items"
  on action_feed for select
  using (auth.uid() = user_id);

create policy "Users can insert own action_feed items"
  on action_feed for insert
  with check (auth.uid() = user_id);

create policy "Users can update own action_feed items"
  on action_feed for update
  using (auth.uid() = user_id);

create policy "Users can delete own action_feed items"
  on action_feed for delete
  using (auth.uid() = user_id);

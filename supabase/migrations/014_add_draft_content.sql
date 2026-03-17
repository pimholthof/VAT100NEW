-- Migration to add draft_content column for proactive agent features
alter table public.action_feed 
add column if not exists draft_content text;

comment on column public.action_feed.draft_content is 'Pre-generated content for the action (e.g. email draft or reminder text).';

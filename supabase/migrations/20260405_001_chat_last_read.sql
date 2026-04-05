-- Add last_read_at to chat_conversations for unread message tracking
ALTER TABLE public.chat_conversations ADD COLUMN last_read_at timestamptz DEFAULT now();

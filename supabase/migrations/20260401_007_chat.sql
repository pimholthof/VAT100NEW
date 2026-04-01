-- ============================================================================
-- Chat: Klantenservice conversations & messages
-- ============================================================================

-- 1. Conversations (one per user)
CREATE TABLE public.chat_conversations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chat_conversations_user_unique UNIQUE (user_id)
);

-- 2. Messages
CREATE TABLE public.chat_messages (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender            text NOT NULL CHECK (sender IN ('user', 'admin')),
    message           text NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users: own conversation
CREATE POLICY "Users can manage own conversation"
    ON public.chat_conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users: own messages (via conversation ownership)
CREATE POLICY "Users can view own messages"
    ON public.chat_messages FOR SELECT
    USING (conversation_id IN (
        SELECT id FROM public.chat_conversations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        sender = 'user'
        AND conversation_id IN (
            SELECT id FROM public.chat_conversations WHERE user_id = auth.uid()
        )
    );

-- Admins: full access
CREATE POLICY "Admins can manage all conversations"
    ON public.chat_conversations FOR ALL
    USING (public.is_admin());

CREATE POLICY "Admins can manage all messages"
    ON public.chat_messages FOR ALL
    USING (public.is_admin());

-- 4. Indexes
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages (conversation_id, created_at);
CREATE INDEX idx_chat_conversations_updated ON public.chat_conversations (updated_at DESC);

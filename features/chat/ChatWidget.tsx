"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { m as motion, AnimatePresence } from "framer-motion";
import { getChatMessages, sendChatMessage } from "./actions";
import { ButtonPrimary } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/context";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { t } = useLocale();

  const { data: result } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: getChatMessages,
    refetchInterval: isOpen ? 5000 : false,
  });

  const messages = result?.data ?? [];

  const { mutate: send, isPending } = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function handleSend() {
    if (!input.trim() || isPending) return;
    send(input.trim());
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn-primary"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            padding: "10px 20px",
            fontSize: "10px",
            letterSpacing: "0.18em",
            fontWeight: 600,
            textTransform: "uppercase",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {t.chat.button}
        </button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 380,
              maxWidth: "calc(100vw - 48px)",
              height: 500,
              maxHeight: "calc(100vh - 120px)",
              zIndex: 1000,
              background: "var(--background)",
              border: "0.5px solid rgba(0,0,0,0.12)",
              borderRadius: "var(--radius)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.10)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <span
                className="label-strong"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.15em",
                  fontWeight: 700,
                }}
              >
                {t.chat.title}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  fontSize: "11px",
                  letterSpacing: "0.15em",
                  fontWeight: 600,
                  opacity: 0.4,
                  transition: "opacity 0.2s ease",
                  color: "var(--foreground)",
                  textTransform: "uppercase",
                }}
                className="label-strong"
              >
                {t.common.close}
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {messages.length === 0 && (
                <p
                  style={{
                    fontSize: "var(--text-body-sm)",
                    opacity: 0.4,
                    textAlign: "center",
                    marginTop: 40,
                    lineHeight: 1.6,
                    padding: "0 16px",
                  }}
                >
                  {t.chat.empty}
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    background: msg.sender === "user" ? "var(--color-black)" : "transparent",
                    color: msg.sender === "user" ? "var(--color-white)" : "var(--color-black)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    maxWidth: "85%",
                    whiteSpace: "pre-wrap",
                    fontSize: "var(--text-body-sm)",
                    lineHeight: 1.5,
                    border: msg.sender === "admin" ? "0.5px solid rgba(0,0,0,0.12)" : "none",
                  }}
                >
                  {msg.sender === "admin" && (
                    <strong
                      style={{
                        color: "var(--color-accent)",
                        display: "block",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontSize: "9px",
                        fontWeight: 700,
                      }}
                    >
                      VAT100
                    </strong>
                  )}
                  {msg.message}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                display: "flex",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t.chat.placeholder}
                disabled={isPending}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.015)",
                  color: "var(--foreground)",
                  fontFamily: '"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif',
                  fontSize: "13px",
                  fontWeight: 400,
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
              />
              <ButtonPrimary
                onClick={handleSend}
                disabled={!input.trim() || isPending}
                style={{
                  padding: "10px 16px",
                  fontSize: "10px",
                  flexShrink: 0,
                }}
              >
                {isPending ? t.chat.sending : t.chat.send}
              </ButtonPrimary>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChatMessages, sendChatMessage, markMessagesRead } from "./actions";
import { ButtonPrimary } from "@/components/ui/Button";

export function BerichtenPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: result } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: getChatMessages,
    refetchInterval: 5000,
  });

  const messages = result?.data ?? [];

  const { mutate: send, isPending } = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });

  // Mark messages as read on mount
  useEffect(() => {
    markMessagesRead();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSend() {
    if (!input.trim() || isPending) return;
    send(input.trim());
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 200px)",
        maxWidth: 720,
      }}
    >
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: 24,
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              fontSize: "var(--text-body-sm)",
              opacity: 0.3,
              marginTop: 60,
              lineHeight: 1.8,
            }}
          >
            Nog geen berichten. Stuur een bericht en we reageren zo snel mogelijk.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              background:
                msg.sender === "user" ? "var(--color-black)" : "transparent",
              color:
                msg.sender === "user"
                  ? "var(--color-white)"
                  : "var(--color-black)",
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              maxWidth: "75%",
              whiteSpace: "pre-wrap",
              fontSize: "var(--text-body-sm)",
              lineHeight: 1.6,
              border:
                msg.sender === "admin"
                  ? "0.5px solid rgba(0,0,0,0.12)"
                  : "none",
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
          display: "flex",
          gap: 8,
          paddingTop: 16,
          borderTop: "0.5px solid rgba(0,0,0,0.08)",
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
          placeholder="Schrijf een bericht..."
          disabled={isPending}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: "8px",
            background: "rgba(0,0,0,0.015)",
            color: "var(--foreground)",
            fontFamily:
              '"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif',
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
            padding: "12px 20px",
            fontSize: "10px",
            flexShrink: 0,
          }}
        >
          {isPending ? "Versturen..." : "Verstuur"}
        </ButtonPrimary>
      </div>
    </div>
  );
}

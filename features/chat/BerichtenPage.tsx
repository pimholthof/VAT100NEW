"use client";

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@/lib/types";
import { getChatMessages, sendChatMessage, markMessagesRead } from "./actions";
import { ButtonPrimary, useToast } from "@/components/ui";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Vandaag";
  if (sameDay(d, yesterday)) return "Gisteren";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

export function BerichtenPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: result } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: getChatMessages,
    refetchInterval: 5000,
  });

  const messages: ChatMessage[] = result?.data ?? [];

  const { mutate: send, isPending } = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
    onError: () => {
      toast("Bericht kon niet worden verstuurd.", "error");
    },
  });

  useEffect(() => {
    markMessagesRead();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isPending) return;
    send(trimmed);
  }, [input, isPending, send]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Group messages by day for the date header
  const grouped: Array<{ day: string; items: ChatMessage[] }> = [];
  let currentDay = "";
  for (const msg of messages) {
    const day = formatDayHeader(msg.created_at);
    if (day !== currentDay) {
      grouped.push({ day, items: [] });
      currentDay = day;
    }
    grouped[grouped.length - 1].items.push(msg);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 220px)",
        minHeight: 420,
        maxWidth: 720,
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--background)",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "0.5px solid rgba(0, 0, 0, 0.06)",
          display: "flex",
          alignItems: "baseline",
          gap: 10,
        }}
      >
        <span
          className="label"
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.5,
            fontWeight: 500,
          }}
        >
          VAT100 · Support
        </span>
        <span style={{ fontSize: 11, opacity: 0.35 }}>Reactie binnen één werkdag</span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 360 }}>
            <p
              style={{
                fontSize: "clamp(16px, 2vw, 20px)",
                fontWeight: 400,
                letterSpacing: "-0.015em",
                margin: "0 0 6px",
              }}
            >
              Stel je vraag aan het VAT100 team
            </p>
            <p style={{ fontSize: 13, opacity: 0.55, margin: 0, lineHeight: 1.5 }}>
              Voor fiscale vragen, accountkoppelingen of bug-meldingen. We reageren
              meestal binnen een werkdag.
            </p>
          </div>
        )}

        {grouped.map((group) => (
          <div
            key={group.day}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.35,
                padding: "8px 0",
                fontWeight: 500,
              }}
            >
              {group.day}
            </div>
            {group.items.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          borderTop: "0.5px solid rgba(0, 0, 0, 0.06)",
          padding: "14px 16px",
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Schrijf een bericht…"
          aria-label="Schrijf een bericht aan VAT100 support"
          rows={1}
          disabled={isPending}
          style={{
            flex: 1,
            minHeight: 38,
            maxHeight: 140,
            resize: "none",
            padding: "10px 14px",
            border: "0.5px solid rgba(0, 0, 0, 0.12)",
            borderRadius: "var(--radius-sm)",
            background: "rgba(0, 0, 0, 0.015)",
            fontFamily: "var(--font-geist)",
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--foreground)",
            outline: "none",
          }}
        />
        <ButtonPrimary
          onClick={handleSend}
          loading={isPending}
          disabled={!input.trim()}
          style={{ padding: "10px 18px", fontSize: 11 }}
        >
          Verstuur
        </ButtonPrimary>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 4,
      }}
    >
      {!isUser && (
        <span
          className="label"
          style={{
            fontSize: 9,
            opacity: 0.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: "var(--color-accent)",
          }}
        >
          VAT100
        </span>
      )}
      <div
        style={{
          maxWidth: "78%",
          padding: isUser ? "10px 14px" : "10px 14px",
          background: isUser ? "var(--foreground)" : "rgba(0, 0, 0, 0.03)",
          color: isUser ? "var(--background)" : "var(--foreground)",
          borderRadius: "var(--radius-sm)",
          fontSize: 13.5,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.message}
      </div>
      <span
        style={{
          fontSize: 10,
          opacity: 0.35,
          fontVariantNumeric: "tabular-nums",
          marginTop: 2,
        }}
      >
        {formatTime(message.created_at)}
      </span>
    </div>
  );
}

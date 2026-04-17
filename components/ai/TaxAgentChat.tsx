"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ReactNode } from "react";
import { useToast, ButtonPrimary } from "@/components/ui";

interface TaxData {
  nettoIB: number;
  effectiefTarief: number;
  [key: string]: unknown;
}

interface Compliance {
  score: number;
  issues: string[];
  [key: string]: unknown;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  taxData?: TaxData;
}

interface TaxAgentChatProps {
  userId?: string;
  initialMessage?: string;
}

const SUGGESTIONS = [
  "Wat is mijn verwachte belasting dit jaar?",
  "Welke aftrekposten laat ik liggen?",
  "Hoe staat mijn BTW-aangifte ervoor?",
  "Moet ik uren blijven bijhouden?",
];

function formatEuro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

// Minimal safe renderer: splits on \n and only applies **bold** inline.
function renderMessageBody(content: string): ReactNode {
  return content.split("\n").map((line, lineIdx) => {
    if (!line.trim()) return <div key={lineIdx} style={{ height: 6 }} />;
    const isBullet = line.startsWith("- ") || line.startsWith("• ");
    const body = isBullet ? line.slice(2) : line;
    const segments = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <p
        key={lineIdx}
        style={{
          margin: 0,
          paddingLeft: isBullet ? 16 : 0,
          position: "relative",
          lineHeight: 1.55,
        }}
      >
        {isBullet && (
          <span
            aria-hidden="true"
            style={{ position: "absolute", left: 0, opacity: 0.4 }}
          >
            ·
          </span>
        )}
        {segments.map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} style={{ fontWeight: 600 }}>
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export default function TaxAgentChat({ userId, initialMessage }: TaxAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        type: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai/tax-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            context: { userId, compliance },
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const data = await response.json();

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          type: "assistant",
          content: data.response,
          timestamp: new Date(),
          taxData: data.taxData,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (data.compliance) setCompliance(data.compliance);
      } catch {
        toast("De fiscale assistent reageerde niet. Probeer opnieuw.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [compliance, isLoading, toast, userId]
  );

  useEffect(() => {
    fetch("/api/ai/tax-agent/compliance")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.compliance) setCompliance(data.compliance);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialMessage) sendMessage(initialMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const complianceSeverity: "ok" | "attention" | "urgent" | null = compliance
    ? compliance.score >= 90
      ? "ok"
      : compliance.score >= 70
      ? "attention"
      : "urgent"
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 420,
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--background)",
      }}
    >
      {/* Header — restrained, on-brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "0.5px solid rgba(0, 0, 0, 0.06)",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
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
            VAT100 · Fiscale assistent
          </span>
          <span style={{ fontSize: 11, opacity: 0.35 }}>Live uit jouw cijfers</span>
        </div>
        {complianceSeverity && complianceSeverity !== "ok" && (
          <ComplianceChip
            severity={complianceSeverity}
            score={compliance!.score}
            issues={compliance!.issues}
          />
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {messages.length === 0 && !isLoading && (
          <EmptyState
            onPick={(q) => {
              setInput(q);
              inputRef.current?.focus();
            }}
          />
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}

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
          placeholder="Stel je fiscale vraag…"
          aria-label="Bericht aan fiscale assistent"
          rows={1}
          disabled={isLoading}
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
          onClick={() => sendMessage(input)}
          loading={isLoading}
          disabled={!input.trim()}
          style={{ padding: "10px 18px", fontSize: 11 }}
        >
          Verstuur
        </ButtonPrimary>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div style={{ padding: "8px 0 16px" }}>
      <p
        style={{
          fontSize: "clamp(18px, 2.5vw, 22px)",
          fontWeight: 400,
          letterSpacing: "-0.02em",
          lineHeight: 1.3,
          margin: "0 0 8px",
        }}
      >
        Waar kan ik mee helpen?
      </p>
      <p
        style={{
          fontSize: 13,
          opacity: 0.55,
          margin: "0 0 20px",
          lineHeight: 1.5,
          maxWidth: 520,
        }}
      >
        Ik reken met jouw facturen, bonnen en fiscale instellingen. Antwoorden zijn
        indicatief — bevestig grote besluiten met een adviseur.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 520,
        }}
      >
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            style={{
              textAlign: "left",
              padding: "10px 14px",
              background: "transparent",
              border: "0.5px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              cursor: "pointer",
              color: "var(--foreground)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.type === "user";
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
            opacity: 0.4,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          VAT100
        </span>
      )}
      <div
        style={{
          maxWidth: "82%",
          padding: isUser ? "10px 14px" : 0,
          background: isUser ? "var(--foreground)" : "transparent",
          color: isUser ? "var(--background)" : "var(--foreground)",
          borderRadius: isUser ? "var(--radius-sm)" : 0,
          fontSize: 14,
          lineHeight: 1.55,
          letterSpacing: "-0.005em",
        }}
      >
        {renderMessageBody(message.content)}

        {message.taxData && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "0.5px solid rgba(0, 0, 0, 0.08)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: 20,
              rowGap: 4,
              fontSize: 12,
            }}
          >
            <span style={{ opacity: 0.5 }}>Netto belasting</span>
            <span style={{ opacity: 0.5 }}>Effectief tarief</span>
            <span
              className="mono-amount"
              style={{ fontWeight: 600, fontSize: 14 }}
            >
              {formatEuro(message.taxData.nettoIB)}
            </span>
            <span
              className="mono-amount"
              style={{ fontWeight: 600, fontSize: 14 }}
            >
              {message.taxData.effectiefTarief}%
            </span>
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 10,
          opacity: 0.35,
          fontVariantNumeric: "tabular-nums",
          marginTop: 2,
        }}
      >
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <span
        className="label"
        style={{
          fontSize: 9,
          opacity: 0.4,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        VAT100
      </span>
      <span
        role="status"
        aria-label="VAT100 denkt na"
        style={{
          fontSize: 13,
          opacity: 0.55,
          fontStyle: "italic",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        Denkt na
        <span className="vat100-typing-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </span>
    </div>
  );
}

function ComplianceChip({
  severity,
  score,
  issues,
}: {
  severity: "attention" | "urgent";
  score: number;
  issues: string[];
}) {
  const color =
    severity === "urgent" ? "var(--color-accent)" : "var(--color-warning)";
  const label = issues[0] ?? (severity === "urgent" ? "Actie vereist" : "Aandacht");
  return (
    <span
      title={issues.join("\n")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        border: `0.5px solid ${color}`,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        color,
        maxWidth: 280,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
      <span style={{ opacity: 0.55 }}>· {score}</span>
    </span>
  );
}

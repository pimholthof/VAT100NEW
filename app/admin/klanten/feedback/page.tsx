"use client";

import { useState, useRef, useEffect, useMemo, useCallback, type KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getChatConversations,
  getChatConversationMessages,
  sendAdminChatMessage,
  getChatKpis,
} from "@/features/admin/actions";
import type { ChatConversationWithUser } from "@/features/admin/actions";
import { AdminPageKpis } from "@/features/admin/AdminPageKpis";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonPrimary, useToast } from "@/components/ui";
import type { ChatMessage } from "@/lib/types";
import { AdminStatePanel } from "../../AdminStatePanel";

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

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "zojuist";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}u`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

type FilterMode = "all" | "unanswered";

export default function AdminKlantenFeedbackPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversationWithUser | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pageSize = 50;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-chat", search, page],
    queryFn: () => getChatConversations({ search, page, pageSize }),
  });

  const entries = useMemo(() => result?.data?.entries ?? [], [result?.data?.entries]);
  const total = result?.data?.total ?? 0;

  const filtered = useMemo(() => {
    const base =
      filterMode === "unanswered"
        ? entries.filter((e) => e.last_sender === "user")
        : entries;
    // Pull unanswered to the top even when showing all
    return [...base].sort((a, b) => {
      const aNeeds = a.last_sender === "user" ? 0 : 1;
      const bNeeds = b.last_sender === "user" ? 0 : 1;
      if (aNeeds !== bNeeds) return aNeeds - bNeeds;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [entries, filterMode]);

  const unansweredCount = useMemo(
    () => entries.filter((e) => e.last_sender === "user").length,
    [entries]
  );
  const totalPages = Math.ceil(total / pageSize);

  const { data: messagesResult } = useQuery({
    queryKey: ["admin-chat-messages", selectedConversation?.id],
    queryFn: () => getChatConversationMessages(selectedConversation!.id),
    enabled: !!selectedConversation,
    refetchInterval: selectedConversation ? 5000 : false,
  });

  const messages: ChatMessage[] = useMemo(
    () => messagesResult?.data ?? [],
    [messagesResult?.data]
  );

  const { mutate: sendReply, isPending: isSending } = useMutation({
    mutationFn: () =>
      sendAdminChatMessage(selectedConversation!.id, replyInput.trim()),
    onSuccess: (r) => {
      if (r?.error) {
        toast(r.error, "error");
        return;
      }
      setReplyInput("");
      queryClient.invalidateQueries({
        queryKey: ["admin-chat-messages", selectedConversation?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-chat"] });
    },
    onError: () => {
      toast("Antwoord kon niet worden verstuurd.", "error");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedConversation?.id]);

  useEffect(() => {
    if (selectedConversation) replyInputRef.current?.focus();
  }, [selectedConversation]);

  const handleSendReply = useCallback(() => {
    if (!replyInput.trim() || isSending || !selectedConversation) return;
    sendReply();
  }, [replyInput, isSending, selectedConversation, sendReply]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  const groupedMessages = useMemo(() => {
    const groups: Array<{ day: string; items: ChatMessage[] }> = [];
    let currentDay = "";
    for (const msg of messages) {
      const day = formatDayHeader(msg.created_at);
      if (day !== currentDay) {
        groups.push({ day, items: [] });
        currentDay = day;
      }
      groups[groups.length - 1].items.push(msg);
    }
    return groups;
  }, [messages]);

  if (result?.error) {
    return (
      <div className="admin-layout">
        <PageHeader title="Gesprekken" backHref="/admin/klanten" backLabel="Klanten" />
        <AdminStatePanel
          eyebrow="Gesprekken"
          title="Gesprekken konden niet worden geladen"
          description={result.error}
          actions={[{ href: "/admin/klanten", label: "Terug", variant: "secondary" }]}
        />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <PageHeader title="Gesprekken" backHref="/admin/klanten" backLabel="Klanten" />

      <AdminPageKpis queryKey="chat-kpis" queryFn={getChatKpis} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selectedConversation ? "minmax(320px, 380px) 1fr" : "1fr",
          gap: 24,
          minHeight: 560,
        }}
      >
        {/* Conversations list */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <FilterTab
              active={filterMode === "all"}
              onClick={() => setFilterMode("all")}
            >
              Alles <span style={{ opacity: 0.45 }}>{total}</span>
            </FilterTab>
            <FilterTab
              active={filterMode === "unanswered"}
              onClick={() => setFilterMode("unanswered")}
              accent={unansweredCount > 0}
            >
              Onbeantwoord <span style={{ opacity: 0.7 }}>{unansweredCount}</span>
            </FilterTab>
          </div>

          <input
            type="text"
            placeholder="Zoek op naam of e-mail…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="admin-field"
            style={{ marginBottom: 12 }}
          />

          {isLoading ? (
            <div className="admin-empty-state">Gesprekken laden…</div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                border: "0.5px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "var(--radius)",
                color: "var(--foreground)",
                opacity: 0.55,
                fontSize: 13,
              }}
            >
              {filterMode === "unanswered"
                ? "Geen onbeantwoorde gesprekken — goed bezig."
                : "Nog geen gesprekken"}
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                border: "0.5px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
              }}
            >
              {filtered.map((entry, i) => {
                const isActive = selectedConversation?.id === entry.id;
                const needsReply = entry.last_sender === "user";
                return (
                  <li
                    key={entry.id}
                    style={{
                      borderTop: i === 0 ? "none" : "0.5px solid rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedConversation(entry)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: isActive ? "rgba(0, 0, 0, 0.03)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "14px 16px",
                        color: "var(--foreground)",
                        transition: "background 0.12s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: 12,
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                          {needsReply && (
                            <span
                              aria-hidden="true"
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "var(--color-accent)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontWeight: needsReply ? 600 : 500,
                              fontSize: 13.5,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.user_name || entry.user_email}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            opacity: 0.45,
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                          }}
                        >
                          {formatRelative(entry.updated_at)}
                        </span>
                      </div>
                      {entry.user_name && (
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.45,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginBottom: 4,
                          }}
                        >
                          {entry.user_email}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 12,
                          opacity: needsReply ? 0.85 : 0.55,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          lineHeight: 1.45,
                        }}
                      >
                        {entry.last_sender === "admin" && (
                          <span
                            style={{
                              opacity: 0.45,
                              marginRight: 4,
                            }}
                          >
                            Jij:
                          </span>
                        )}
                        {entry.last_message ?? "—"}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="admin-pagination" style={{ marginTop: 12 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="admin-page-button"
              >
                Vorige
              </button>
              <span className="admin-page-button label">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="admin-page-button"
              >
                Volgende
              </button>
            </div>
          )}
        </div>

        {/* Chat view */}
        {selectedConversation && (
          <div
            style={{
              border: "0.5px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "var(--radius)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "var(--background)",
              minHeight: 560,
            }}
          >
            {/* Context header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "0.5px solid rgba(0, 0, 0, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedConversation.user_name || selectedConversation.user_email}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedConversation.user_email} ·{" "}
                  <a
                    href={`/admin/klanten/${selectedConversation.user_id}`}
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    Klantprofiel
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConversation(null)}
                aria-label="Sluiten"
                style={{
                  background: "transparent",
                  border: "0.5px solid rgba(0, 0, 0, 0.12)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  opacity: 0.6,
                }}
              >
                Sluiten
              </button>
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
                minHeight: 300,
              }}
            >
              {messages.length === 0 ? (
                <p style={{ opacity: 0.4, fontSize: 13, margin: "auto" }}>
                  Geen berichten
                </p>
              ) : (
                groupedMessages.map((group) => (
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
                      <AdminMessageBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
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
                ref={replyInputRef}
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Antwoord aan klant…"
                aria-label="Antwoord schrijven"
                rows={1}
                disabled={isSending}
                style={{
                  flex: 1,
                  minHeight: 38,
                  maxHeight: 160,
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
                onClick={handleSendReply}
                loading={isSending}
                disabled={!replyInput.trim()}
                style={{ padding: "10px 18px", fontSize: 11 }}
              >
                Antwoord
              </ButtonPrimary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTab({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: active
          ? "0.5px solid var(--foreground)"
          : `0.5px solid ${accent ? "var(--color-accent)" : "rgba(0,0,0,0.12)"}`,
        background: active ? "var(--foreground)" : "transparent",
        color: active ? "var(--background)" : accent ? "var(--color-accent)" : "var(--foreground)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function AdminMessageBubble({ message }: { message: ChatMessage }) {
  const isAdmin = message.sender === "admin";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isAdmin ? "flex-end" : "flex-start",
        gap: 4,
      }}
    >
      <span
        className="label"
        style={{
          fontSize: 9,
          opacity: 0.45,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: isAdmin ? undefined : "var(--color-accent)",
        }}
      >
        {isAdmin ? "Jij" : "Klant"}
      </span>
      <div
        style={{
          maxWidth: "82%",
          padding: "10px 14px",
          background: isAdmin ? "var(--foreground)" : "rgba(0, 0, 0, 0.03)",
          color: isAdmin ? "var(--background)" : "var(--foreground)",
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

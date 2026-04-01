"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getChatConversations,
  getChatConversationMessages,
  sendAdminChatMessage,
  getChatKpis,
} from "@/features/admin/actions";
import type { ChatConversationWithUser } from "@/features/admin/actions";
import { AdminPageKpis } from "@/features/admin/AdminPageKpis";
import {
  PageHeader,
  TableWrapper,
  Th,
  Td,
  Input,
  ButtonPrimary,
  SkeletonTable,
} from "@/components/ui";
import { formatDateLong } from "@/lib/format";

export default function AdminFeedbackPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversationWithUser | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const pageSize = 50;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-chat", search, page],
    queryFn: () => getChatConversations({ search, page, pageSize }),
  });

  const entries = result?.data?.entries ?? [];
  const total = result?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Messages for selected conversation
  const { data: messagesResult } = useQuery({
    queryKey: ["admin-chat-messages", selectedConversation?.id],
    queryFn: () => getChatConversationMessages(selectedConversation!.id),
    enabled: !!selectedConversation,
    refetchInterval: selectedConversation ? 5000 : false,
  });

  const messages = messagesResult?.data ?? [];

  const { mutate: sendReply, isPending: isSending } = useMutation({
    mutationFn: () => sendAdminChatMessage(selectedConversation!.id, replyInput.trim()),
    onSuccess: (result) => {
      if (!result.error) {
        setReplyInput("");
        queryClient.invalidateQueries({ queryKey: ["admin-chat-messages", selectedConversation?.id] });
        queryClient.invalidateQueries({ queryKey: ["admin-chat"] });
      }
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus reply input when conversation selected
  useEffect(() => {
    if (selectedConversation) replyInputRef.current?.focus();
  }, [selectedConversation]);

  function handleSendReply() {
    if (!replyInput.trim() || isSending || !selectedConversation) return;
    sendReply();
  }

  return (
    <div>
      <PageHeader title="Feedback" backHref="/admin" backLabel="Beheer" />

      <AdminPageKpis queryKey="chat-kpis" queryFn={getChatKpis} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selectedConversation ? "1fr 1fr" : "1fr",
          gap: 32,
          minHeight: 500,
        }}
      >
        {/* Conversations list */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <Input
              type="text"
              placeholder="Zoek op naam of e-mail..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ maxWidth: 400 }}
            />
          </div>

          <p className="label" style={{ marginBottom: 16 }}>
            {total} gesprek{total !== 1 ? "ken" : ""}
          </p>

          {isLoading ? (
            <SkeletonTable
              columns="2fr 3fr 1fr"
              rows={10}
              headerWidths={[60, 70, 50]}
              bodyWidths={[50, 60, 40]}
            />
          ) : entries.length === 0 ? (
            <p className="empty-state">Nog geen gesprekken</p>
          ) : (
            <TableWrapper>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Gebruiker</Th>
                    <Th>Laatste bericht</Th>
                    <Th>Datum</Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedConversation(entry)}
                      style={{
                        cursor: "pointer",
                        background:
                          selectedConversation?.id === entry.id
                            ? "rgba(0,0,0,0.03)"
                            : "transparent",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <Td>
                        <div>
                          <span style={{ fontWeight: 500, display: "block" }}>
                            {entry.user_name || "—"}
                          </span>
                          <span
                            className="label"
                            style={{ fontSize: "var(--text-body-xs)", opacity: 0.5 }}
                          >
                            {entry.user_email}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {entry.last_sender === "user" && (
                            <span
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
                              fontSize: "var(--text-body-sm)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 250,
                              display: "block",
                              opacity: 0.6,
                            }}
                          >
                            {entry.last_message || "—"}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="label">
                          {formatDateLong(entry.updated_at)}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrapper>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 32,
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Vorige
              </button>
              <span className="label" style={{ padding: "8px 16px" }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn-secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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
              border: "0.5px solid rgba(0,0,0,0.12)",
              borderRadius: "var(--radius)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "var(--background)",
            }}
          >
            {/* Chat header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: "var(--text-body-md)" }}>
                  {selectedConversation.user_name || selectedConversation.user_email}
                </span>
                {selectedConversation.user_name && (
                  <span
                    className="label"
                    style={{
                      display: "block",
                      fontSize: "var(--text-body-xs)",
                      opacity: 0.4,
                      marginTop: 2,
                    }}
                  >
                    {selectedConversation.user_email}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="label-strong"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  letterSpacing: "0.15em",
                  fontWeight: 600,
                  opacity: 0.4,
                  color: "var(--foreground)",
                  textTransform: "uppercase",
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
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 300,
                maxHeight: 500,
              }}
            >
              {messages.length === 0 && (
                <p
                  style={{
                    fontSize: "var(--text-body-sm)",
                    opacity: 0.4,
                    textAlign: "center",
                    marginTop: 40,
                  }}
                >
                  Geen berichten
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-start" : "flex-end",
                    background: msg.sender === "admin" ? "var(--color-black)" : "transparent",
                    color: msg.sender === "admin" ? "var(--color-white)" : "var(--color-black)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    maxWidth: "85%",
                    whiteSpace: "pre-wrap",
                    fontSize: "var(--text-body-sm)",
                    lineHeight: 1.5,
                    border: msg.sender === "user" ? "0.5px solid rgba(0,0,0,0.12)" : "none",
                  }}
                >
                  {msg.message}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                display: "flex",
                gap: 8,
              }}
            >
              <input
                ref={replyInputRef}
                type="text"
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Typ een antwoord..."
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: "10px 14px",
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
                onClick={handleSendReply}
                disabled={!replyInput.trim() || isSending}
                style={{ padding: "10px 16px", fontSize: "10px", flexShrink: 0 }}
              >
                {isSending ? "Versturen..." : "Verstuur"}
              </ButtonPrimary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminStatePanel } from "../../AdminStatePanel";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function AdminKlantenFeedbackPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversationWithUser | null>(null);
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

  const { data: messagesResult } = useQuery({
    queryKey: ["admin-chat-messages", selectedConversation?.id],
    queryFn: () => getChatConversationMessages(selectedConversation!.id),
    enabled: !!selectedConversation,
    refetchInterval: selectedConversation ? 5000 : false,
  });

  const messages = messagesResult?.data ?? [];

  const { mutate: sendReply, isPending: isSending } = useMutation({
    mutationFn: () =>
      sendAdminChatMessage(selectedConversation!.id, replyInput.trim()),
    onSuccess: (r) => {
      if (!r.error) {
        setReplyInput("");
        queryClient.invalidateQueries({
          queryKey: ["admin-chat-messages", selectedConversation?.id],
        });
        queryClient.invalidateQueries({ queryKey: ["admin-chat"] });
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (selectedConversation) replyInputRef.current?.focus();
  }, [selectedConversation]);

  function handleSendReply() {
    if (!replyInput.trim() || isSending || !selectedConversation) return;
    sendReply();
  }

  if (result?.error) {
    return (
      <div className="admin-layout">
        <PageHeader title="Feedback" backHref="/admin/klanten" backLabel="Klanten" />
        <AdminStatePanel
          eyebrow="Feedback"
          title="Feedback kon niet worden geladen"
          description={result.error}
          actions={[{ href: "/admin/klanten", label: "Terug", variant: "secondary" }]}
        />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <PageHeader title="Feedback" backHref="/admin/klanten" backLabel="Klanten" />

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
          <div className="admin-toolbar">
            <input
              type="text"
              placeholder="Zoek op naam of e-mail..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="admin-field mono-amount"
            />
          </div>

          <div className="admin-summary-row">
            <p className="label">
              {total} gesprek{total !== 1 ? "ken" : ""}
            </p>
            <p className="label">
              Pagina {page}
              {totalPages > 0 ? ` van ${totalPages}` : ""}
            </p>
          </div>

          {isLoading ? (
            <div className="admin-table-shell">
              <div className="admin-empty-state">Gesprekken laden...</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="admin-table-shell">
              <div className="admin-empty-state">Nog geen gesprekken</div>
            </div>
          ) : (
            <div className="admin-table-shell">
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {["Gebruiker", "Laatste bericht", "Datum"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
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
                              : undefined,
                        }}
                      >
                        <td>
                          <span style={{ fontWeight: 500, display: "block" }}>
                            {entry.user_name || "\u2014"}
                          </span>
                          <span className="label" style={{ opacity: 0.5 }}>
                            {entry.user_email}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250, display: "block", opacity: 0.6 }}>
                              {entry.last_message || "\u2014"}
                            </span>
                          </span>
                        </td>
                        <td className="label">{formatDate(entry.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="admin-page-button">Vorige</button>
              <span className="admin-page-button label">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="admin-page-button">Volgende</button>
            </div>
          )}
        </div>

        {/* Chat view */}
        {selectedConversation && (
          <div style={{ border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--background)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "0.5px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: "var(--text-body-md)" }}>
                  {selectedConversation.user_name || selectedConversation.user_email}
                </span>
                {selectedConversation.user_name && (
                  <span className="label" style={{ display: "block", opacity: 0.4, marginTop: 2 }}>
                    {selectedConversation.user_email}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="label-strong"
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "11px", letterSpacing: "0.15em", fontWeight: 600, opacity: 0.4, color: "var(--foreground)", textTransform: "uppercase" }}
              >
                Sluiten
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12, minHeight: 300, maxHeight: 500 }}>
              {messages.length === 0 && (
                <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.4, textAlign: "center", marginTop: 40 }}>Geen berichten</p>
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

            <div style={{ padding: "12px 16px", borderTop: "0.5px solid rgba(0,0,0,0.08)", display: "flex", gap: 8 }}>
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
                className="admin-field"
                style={{ flex: 1 }}
              />
              <button
                className="btn-primary"
                onClick={handleSendReply}
                disabled={!replyInput.trim() || isSending}
                style={{ padding: "10px 16px", fontSize: "10px", flexShrink: 0 }}
              >
                {isSending ? "Versturen..." : "Verstuur"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

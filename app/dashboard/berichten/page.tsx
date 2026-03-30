"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCoachMessages, markMessageRead } from "@/features/coach/actions";
import type { CoachMessage } from "@/features/coach/actions";
import { formatDate } from "@/lib/format";

export default function BerichtenPage() {
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["coach-messages"],
    queryFn: () => getCoachMessages(),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => markMessageRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-messages"] });
    },
  });

  const messages = result?.data ?? [];

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="display-title">Berichten</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Persoonlijke tips en berichten van je boekhouder
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ opacity: 0.12 }}>
          <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
        </div>
      ) : messages.length === 0 ? (
        <div style={{ borderTop: "var(--border-rule)", borderBottom: "var(--border-rule)", padding: 48, textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: 0, opacity: 0.5 }}>
            Nog geen berichten. Je boekhouder stuurt hier persoonlijke tips en feedback.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(13,13,11,0.06)" }}>
          {messages.map((msg: CoachMessage) => (
            <div
              key={msg.id}
              onClick={() => {
                if (!msg.is_read) markReadMut.mutate(msg.id);
              }}
              style={{
                padding: "24px 32px",
                background: "var(--background)",
                cursor: msg.is_read ? "default" : "pointer",
                borderLeft: msg.is_read ? "3px solid transparent" : "3px solid var(--foreground)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--foreground)",
                    color: "var(--background)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {msg.sender_name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "var(--text-body)" }}>
                      {msg.sender_name}
                    </span>
                    {msg.subject && (
                      <span style={{ fontWeight: msg.is_read ? 300 : 500, fontSize: "var(--text-body)", marginLeft: 8 }}>
                        {msg.subject}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: "var(--text-body-xs)", opacity: 0.4, whiteSpace: "nowrap" }}>
                  {formatDate(msg.created_at)}
                </span>
              </div>
              <p style={{
                fontSize: "var(--text-body)",
                fontWeight: 300,
                margin: 0,
                paddingLeft: 44,
                opacity: msg.is_read ? 0.6 : 1,
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}>
                {msg.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

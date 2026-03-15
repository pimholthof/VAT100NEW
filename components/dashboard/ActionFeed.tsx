"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

type ActionItem = {
  id: string;
  type: "match_suggestion" | "missing_receipt";
  title: string;
  description: string;
  amount?: number;
};

// Dummy data for Sprint 1
const DUMMY_ACTIONS: ActionItem[] = [
  {
    id: "act_1",
    type: "missing_receipt",
    title: "Ontbrekend bonnetje",
    description: "Afschrijving van Shell Nederland op 14 maart.",
    amount: 45.0,
  },
  {
    id: "act_2",
    type: "match_suggestion",
    title: "Mogelijke match",
    description: "Is deze afschrijving voor factuur #2024-001?",
    amount: 1250.0,
  },
];

export function ActionFeed() {
  const [actions, setActions] = useState<ActionItem[]>(DUMMY_ACTIONS);

  const handleAction = (id: string) => {
    // In Sprint 2, this will call a server action
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  if (actions.length === 0) {
    return (
      <div
        className="editorial-divider"
        style={{
          padding: "32px 0",
          textAlign: "center",
          marginBottom: "var(--space-section)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            margin: "0 0 8px",
          }}
        >
          Inbox Zero
        </p>
        <p className="label" style={{ opacity: 0.6, margin: 0 }}>
          Je administratie is volledig up-to-date.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "var(--space-section)" }}>
      <h2 className="section-header" style={{ margin: "0 0 16px" }}>
        Acties ({actions.length})
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map((action) => (
          <div
            key={action.id}
            style={{
              padding: 16,
              border: "1px solid rgba(13,13,11,0.12)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--background)",
            }}
          >
            <div>
              <p className="label" style={{ opacity: 0.8, margin: "0 0 4px" }}>
                {action.type === "missing_receipt" ? "Bonnetje" : "Match"}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-body-md)",
                  fontWeight: 500,
                  margin: "0 0 4px",
                }}
              >
                {action.title}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-body-sm)",
                  color: "rgba(13,13,11,0.6)",
                  margin: 0,
                }}
              >
                {action.description}
              </p>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
              {action.amount && (
                <span
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "var(--text-mono-md)",
                  }}
                >
                  {formatCurrency(action.amount)}
                </span>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleAction(action.id)}
                  style={{
                    background: "rgba(13,13,11,0.06)",
                    border: "none",
                    padding: "6px 12px",
                    fontFamily: "var(--font-body), sans-serif",
                    fontSize: "var(--text-label)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-label)",
                    cursor: "pointer",
                  }}
                >
                  Negeer
                </button>
                <button
                  onClick={() => handleAction(action.id)}
                  style={{
                    background: "var(--foreground)",
                    color: "var(--background)",
                    border: "none",
                    padding: "6px 12px",
                    fontFamily: "var(--font-body), sans-serif",
                    fontSize: "var(--text-label)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-label)",
                    cursor: "pointer",
                  }}
                >
                  {action.type === "missing_receipt" ? "Upload" : "Bevestig"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

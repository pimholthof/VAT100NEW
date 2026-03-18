"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import {
  getActionFeedItems,
  resolveActionItem,
  ignoreActionItem,
} from "@/lib/actions/action-feed";
import type { ActionFeedItem } from "@/lib/types";

export function ActionFeed() {
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["action-feed"],
    queryFn: () => getActionFeedItems(),
  });

  const actions = result?.data ?? [];

  const resolveMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft?: string }) => resolveActionItem(id, undefined, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-feed"] });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: (id: string) => ignoreActionItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-feed"] });
    },
  });

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ width: "30%", height: 9, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "100%", height: 60 }} />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div style={{
        padding: "var(--space-block) 0",
        borderTop: "var(--border-rule)",
        borderBottom: "var(--border-rule)",
      }}>
        <p className="empty-state">SYSTEEM OPTIMAAL</p>
        <p className="label" style={{ opacity: 0.3 }}>
          Alle protocollen voltooid. Geen actie vereist.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-header" style={{ margin: "0 0 var(--space-element)" }}>
        ACTIES [{actions.length}]
      </h2>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <AnimatePresence>
          {actions.map((action, index) => (
            <ActionCard
              key={action.id}
              action={action}
              index={index}
              onResolve={(draft) => resolveMutation.mutate({ id: action.id, draft })}
              onIgnore={() => ignoreMutation.mutate(action.id)}
              isPending={resolveMutation.isPending || ignoreMutation.isPending}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  index,
  onResolve,
  onIgnore,
  isPending,
}: {
  action: ActionFeedItem;
  index: number;
  onResolve: (draftContent?: string) => void;
  onIgnore: () => void;
  isPending: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(action.draft_content || "");

  const typeLabel: Record<string, string> = {
    missing_receipt: "DOCUMENTATIE",
    match_suggestion: "RECONCILIATIE",
    tax_alert: "BELASTING",
    uncategorized: "RUBRIEK",
    reminder_suggestion: "COMMUNICATIE",
  };

  const actionLabel: Record<string, string> = {
    missing_receipt: "TOEVOEGEN",
    match_suggestion: "AKKOORD",
    tax_alert: "INZIEN",
    uncategorized: "VERWERKEN",
    reminder_suggestion: "VERZENDEN",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      style={{
        padding: "20px 0",
        borderBottom: "0.5px solid rgba(13, 13, 11, 0.06)",
        opacity: isPending ? 0.4 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p className="label" style={{ margin: "0 0 6px" }}>
            {typeLabel[action.type] ?? action.type}
            {action.ai_confidence != null && (
              <span style={{ opacity: 0.6, marginLeft: 12 }}>
                {Math.round(action.ai_confidence * 100)}%
              </span>
            )}
          </p>
          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 12,
            fontWeight: 500,
            margin: "0 0 4px",
          }}>
            {action.title}
          </p>
          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            opacity: 0.4,
            margin: 0,
          }}>
            {action.description}
          </p>
        </div>
        {action.amount != null && (
          <span className="mono-amount" style={{ marginLeft: 24 }}>
            {formatCurrency(action.amount)}
          </span>
        )}
      </div>

      {isEditing && action.draft_content && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          style={{ overflow: "hidden", marginTop: 16 }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              width: "100%",
              height: 120,
              background: "transparent",
              border: "var(--border-input)",
              padding: 12,
              color: "var(--foreground)",
              fontFamily: '"Inter", sans-serif',
              fontSize: 13,
              fontWeight: 300,
              lineHeight: 1.5,
              outline: "none",
              resize: "none",
            }}
            placeholder="Typ hier de tekst voor de herinnering..."
          />
        </motion.div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        {action.draft_content && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            disabled={isPending}
            className="label-strong"
            style={{
              background: "transparent",
              color: "var(--foreground)",
              border: "0.5px solid rgba(13, 13, 11, 0.25)",
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            {isEditing ? "SLUIT" : "CONCEPT"}
          </button>
        )}
        <button
          onClick={onIgnore}
          disabled={isPending}
          className="label"
          style={{
            background: "transparent",
            color: "var(--foreground)",
            border: "none",
            padding: "6px 14px",
            cursor: "pointer",
          }}
        >
          NEGEREN
        </button>
        <button
          onClick={() => onResolve(isEditing ? draft : undefined)}
          disabled={isPending}
          style={{
            background: "var(--foreground)",
            color: "var(--background)",
            border: "none",
            padding: "6px 14px",
            fontFamily: '"Inter", sans-serif',
            fontSize: 9,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            cursor: "pointer",
          }}
        >
          {actionLabel[action.type] ?? "OK"}
        </button>
      </div>
    </motion.div>
  );
}

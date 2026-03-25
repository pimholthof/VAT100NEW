"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { m as motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import {
  getActionFeedItems,
  resolveActionItem,
  ignoreActionItem,
} from "@/features/dashboard/action-feed";
import type { ActionFeedItem } from "@/lib/types";
import { playSound } from "@/lib/utils/sound";

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
      playSound("glass-ping");
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: (id: string) => ignoreActionItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-feed"] });
      playSound("tink");
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="skeleton" style={{ width: "30%", height: 10, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "100%", height: 48 }} />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div style={{
        padding: "48px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}>
        <p style={{
          fontSize: "var(--text-display-sm)",
          fontWeight: 600,
          margin: 0,
          opacity: 0.08,
          textTransform: "uppercase",
        }}>
          Systeem optimaal
        </p>
        <p className="label" style={{ opacity: 0.25, margin: 0 }}>
          Geen actie vereist
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 12px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

import { useState } from "react";

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
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
        layout: { duration: 0.25 },
      }}
      style={{
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        opacity: isPending ? 0.4 : 1,
        border: "0.5px solid rgba(0,0,0,0.04)",
        background: "var(--background)",
        transition: "border-color 0.2s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p className="label" style={{ opacity: 0.35, margin: "0 0 6px" }}>
            {typeLabel[action.type] ?? action.type}
            {action.ai_confidence != null && (
              <span style={{ color: "var(--color-accent)", opacity: 0.7, marginLeft: 10 }}>
                {Math.round(action.ai_confidence * 100)}%
              </span>
            )}
          </p>
          <p style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 600,
            margin: "0 0 2px",
            letterSpacing: "-0.01em",
          }}>
            {action.title}
          </p>
          <p style={{
            fontSize: "var(--text-body-sm)",
            opacity: 0.35,
            margin: 0,
          }}>
            {action.description}
          </p>
        </div>
        {action.amount != null && (
          <span style={{
            fontSize: "var(--text-mono-md)",
            fontWeight: 500,
            marginLeft: 20,
            fontVariantNumeric: "tabular-nums",
          }}>
            {formatCurrency(action.amount)}
          </span>
        )}
      </div>

      {isEditing && action.draft_content && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          style={{ overflow: "hidden" }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              width: "100%",
              height: "100px",
              background: "rgba(0,0,0,0.015)",
              border: "0.5px solid rgba(0,0,0,0.08)",
              padding: "10px 12px",
              color: "var(--foreground)",
              fontSize: "13px",
              lineHeight: "1.5",
              outline: "none",
              resize: "none",
            }}
            placeholder="Typ hier de tekst voor de herinnering..."
          />
        </motion.div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        {action.draft_content && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            disabled={isPending}
            className="label-strong"
            style={{
              background: "transparent",
              color: "var(--foreground)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              padding: "5px 12px",
              cursor: "pointer",
              opacity: 0.5,
            }}
          >
            {isEditing ? "SLUIT" : "CONCEPT"}
          </button>
        )}
        <button
          onClick={onIgnore}
          disabled={isPending}
          className="label-strong"
          style={{
            background: "rgba(0,0,0,0.03)",
            color: "var(--foreground)",
            border: "none",
            padding: "5px 12px",
            cursor: "pointer",
            opacity: 0.4,
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
            padding: "5px 12px",
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: "pointer",
          }}
        >
          {actionLabel[action.type] ?? "OK"}
        </button>
      </div>
    </motion.div>
  );
}

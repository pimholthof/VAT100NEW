"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { m as motion , AnimatePresence } from "framer-motion";
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
      <div style={{ marginBottom: "var(--space-section)" }}>
        <div className="skeleton" style={{ width: "30%", height: 14, marginBottom: 16, opacity: 0.08 }} />
        <div className="skeleton" style={{ width: "100%", height: 60, opacity: 0.04 }} />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="editorial-divider"
        style={{
          padding: "48px 0",
          marginBottom: "var(--space-section)",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          borderTop: "var(--border-rule)",
          borderBottom: "var(--border-rule)",
        }}
      >
        <p
          style={{
            fontSize: "var(--text-display-md)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Je bent helemaal bij
        </p>
        <p className="label" style={{ opacity: 0.4, margin: 0 }}>
          Geen openstaande taken. Tijd voor koffie.
        </p>
      </motion.div>
    );
  }

  return (
    <div style={{ marginBottom: "var(--space-section)" }}>
      <h2 className="section-header" style={{ margin: "0 0 16px" }}>
        Nog te doen [{actions.length}]
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
    missing_receipt: "BONNETJE",
    match_suggestion: "CONTROLE",
    tax_alert: "BELASTING",
    uncategorized: "CATEGORIE",
    reminder_suggestion: "HERINNERING",
  };

  const actionLabel: Record<string, string> = {
    missing_receipt: "TOEVOEGEN",
    match_suggestion: "KLopt",
    tax_alert: "CHECK",
    uncategorized: "INDELEN",
    reminder_suggestion: "VERSTUREN",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05, 
        ease: "anticipate",
        layout: { duration: 0.3 }
      }}
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        borderRadius: 0,
        opacity: isPending ? 0.5 : 1,
        border: "var(--border-light)",
        background: "rgba(0,0,0,0.02)",
        marginBottom: 16
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p className="label" style={{ opacity: 0.5, margin: "0 0 8px", fontSize: 10 }}>
            {typeLabel[action.type] ?? action.type}
            {action.ai_confidence != null && (
              <span style={{ color: "var(--color-accent)", opacity: 0.8, marginLeft: 12 }}>
                {Math.round(action.ai_confidence * 100)}% zeker
              </span>
            )}
          </p>
          <p
            style={{
              fontFamily: "var(--font-geist), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 600,
              margin: "0 0 4px",
              letterSpacing: "-0.01em"
            }}
          >
            {action.title}
          </p>
          <p
            style={{
              fontFamily: "var(--font-geist), sans-serif",
              fontSize: "var(--text-body-sm)",
              opacity: 0.4,
              margin: 0,
            }}
          >
            {action.description}
          </p>
        </div>
        {action.amount != null && (
          <span
            style={{
              fontSize: "var(--text-mono-md)",
              fontWeight: 500,
              marginLeft: 24
            }}
          >
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
              height: "120px",
              background: "rgba(0,0,0,0.02)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              padding: "12px",
              color: "var(--foreground)",
              fontFamily: "var(--font-geist), sans-serif",
              fontSize: "13px",
              lineHeight: "1.5",
              outline: "none",
              resize: "none"
            }}
            placeholder="Typ hier je herinnering..."
          />
        </motion.div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {action.draft_content && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            disabled={isPending}
            style={{
              background: "transparent",
              color: "var(--foreground)",
              border: "0.5px solid rgba(0,0,0,0.2)",
              padding: "6px 14px",
              borderRadius: 0,
              fontFamily: "var(--font-geist), sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {isEditing ? "Sluiten" : "Bekijk concept"}
          </button>
        )}
        <button
          onClick={onIgnore}
          disabled={isPending}
          style={{
            background: "rgba(0,0,0,0.05)",
            color: "var(--foreground)",
            border: "none",
            padding: "6px 14px",
            borderRadius: 0,
            fontFamily: "var(--font-geist), sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          Negeren
        </button>
        <button
          onClick={() => onResolve(isEditing ? draft : undefined)}
          disabled={isPending}
          style={{
            background: "var(--color-accent)",
            color: "white",
            border: "none",
            padding: "6px 14px",
            borderRadius: 0,
            fontFamily: "var(--font-geist), sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {actionLabel[action.type] ?? "OK"}
        </button>
      </div>
    </motion.div>
  );
}

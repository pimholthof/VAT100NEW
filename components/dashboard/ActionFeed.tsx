"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import {
  getActionFeedItems,
  resolveActionItem,
  ignoreActionItem,
} from "@/lib/actions/action-feed";
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
      playSound("tink");
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
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
          borderBottom: "0.5px solid rgba(13,13,11,0.15)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Helemaal bij
        </p>
        <p className="label" style={{ opacity: 0.4, margin: 0 }}>
          Administratie actueel. Geen actie vereist.
        </p>
      </motion.div>
    );
  }

  return (
    <div style={{ marginBottom: "var(--space-section)" }}>
      <h2 className="section-header" style={{ margin: "0 0 16px" }}>
        Acties ({actions.length})
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
    missing_receipt: "Document",
    match_suggestion: "Match",
    tax_alert: "Belasting",
    uncategorized: "Rubriceer",
    reminder_suggestion: "Herinnering",
  };

  const actionLabel: Record<string, string> = {
    missing_receipt: "Aanleveren",
    match_suggestion: "Accorderen",
    tax_alert: "Bekijken",
    uncategorized: "Rubriceren",
    reminder_suggestion: "Versturen",
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
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      className="glass"
      style={{
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        borderRadius: 0,
        opacity: isPending ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p className="label" style={{ opacity: 0.5, margin: "0 0 6px" }}>
            {typeLabel[action.type] ?? action.type}
            {action.ai_confidence != null && (
              <span style={{ color: "var(--color-accent)", opacity: 0.8, marginLeft: 12 }}>
                {Math.round(action.ai_confidence * 100)}% Match
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
              color: "var(--color-white)",
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
              fontFamily: "var(--font-mono), monospace",
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
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              padding: "12px",
              color: "white",
              fontFamily: "var(--font-geist), sans-serif",
              fontSize: "13px",
              lineHeight: "1.5",
              outline: "none",
              resize: "none"
            }}
            placeholder="Typ hier de tekst voor de herinnering..."
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
              color: "white",
              border: "0.5px solid rgba(255,255,255,0.2)",
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
            {isEditing ? "Sluit Concept" : "Concept Bekijken"}
          </button>
        )}
        <button
          onClick={onIgnore}
          disabled={isPending}
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "white",
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
          Negeer
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
            boxShadow: "0 0 20px -5px var(--color-accent)"
          }}
        >
          {actionLabel[action.type] ?? "OK"}
        </button>
      </div>
    </motion.div>
  );
}

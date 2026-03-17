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

export function ActionFeed() {
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["action-feed"],
    queryFn: () => getActionFeedItems(),
  });

  const actions = result?.data ?? [];

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveActionItem(id),
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
              onResolve={() => resolveMutation.mutate(action.id)}
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
  onResolve: () => void;
  onIgnore: () => void;
  isPending: boolean;
}) {
  const typeLabel: Record<string, string> = {
    missing_receipt: "Document",
    match_suggestion: "Match",
    tax_alert: "Belasting",
    uncategorized: "Rubriceer",
  };

  const actionLabel: Record<string, string> = {
    missing_receipt: "Aanleveren",
    match_suggestion: "Accorderen",
    tax_alert: "Bekijken",
    uncategorized: "Rubriceren",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05, 
        ease: "easeOut",
        layout: { duration: 0.3 }
      }}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      style={{
        padding: 16,
        border: "0.5px solid rgba(13,13,11,0.12)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--background)",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      <div>
        <p className="label" style={{ opacity: 0.6, margin: "0 0 4px" }}>
          {typeLabel[action.type] ?? action.type}
          {action.ai_confidence != null && (
            <span style={{ opacity: 0.5, marginLeft: 8 }}>
              {Math.round(action.ai_confidence * 100)}% zeker
            </span>
          )}
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
        {action.amount != null && (
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
            onClick={onIgnore}
            disabled={isPending}
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
            onClick={onResolve}
            disabled={isPending}
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
            {actionLabel[action.type] ?? "OK"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

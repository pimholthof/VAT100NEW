"use client";


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    missing_receipt: "Bonnetje",
    match_suggestion: "Match",
    tax_alert: "Belasting",
    uncategorized: "Categoriseer",
  };

  const actionLabel: Record<string, string> = {
    missing_receipt: "Upload",
    match_suggestion: "Bevestig",
    tax_alert: "Bekijk",
    uncategorized: "Categoriseer",
  };

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid rgba(13,13,11,0.12)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--background)",
        transition: "opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
        opacity: isPending ? 0.5 : 1,
        animation: `feedSlideIn 0.3s ease ${index * 0.06}s both`,
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateX(4px)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(13,13,11,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div>
        <p className="label" style={{ opacity: 0.8, margin: "0 0 4px" }}>
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
    </div>
  );
}

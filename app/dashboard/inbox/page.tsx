"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInboxItems,
  getInboxStats,
  assignCostCode,
  categorizeInboxTransaction,
  resolveInboxAction,
  ignoreInboxAction,
} from "@/features/inbox/actions";
import type { InboxItemType } from "@/features/inbox/actions";
import { KOSTENSOORTEN } from "@/lib/constants/costs";
import { formatCurrency, formatDate } from "@/lib/format";
import { Th, Td, SkeletonTable } from "@/components/ui";

const TRANSACTION_CATEGORIES = [
  "Omzet",
  ...KOSTENSOORTEN.map((k) => k.label),
];

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: "none",
  border: "none",
  borderBottom: active ? "2px solid var(--foreground)" : "2px solid transparent",
  padding: "0 0 8px 0",
  fontSize: "var(--text-body-lg)",
  fontWeight: active ? 500 : 300,
  color: "var(--foreground)",
  opacity: active ? 1 : 0.5,
  cursor: "pointer",
});

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 2px",
  border: "none",
  borderBottom: "var(--border-input)",
  background: "transparent",
  color: "var(--foreground)",
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  outline: "none",
  cursor: "pointer",
};

type FilterTab = "all" | InboxItemType;

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data: statsResult } = useQuery({
    queryKey: ["inbox-stats"],
    queryFn: () => getInboxStats(),
  });

  const { data: itemsResult, isLoading } = useQuery({
    queryKey: ["inbox-items", filter],
    queryFn: () => getInboxItems(filter === "all" ? undefined : filter),
  });

  const stats = statsResult?.data;
  const items = itemsResult?.data ?? [];

  const categorizeTxMut = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      categorizeInboxTransaction(id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
    },
  });

  const assignCodeMut = useMutation({
    mutationFn: ({ id, code }: { id: string; code: number }) =>
      assignCostCode(id, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
    },
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => resolveInboxAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
    },
  });

  const ignoreMut = useMutation({
    mutationFn: (id: string) => ignoreInboxAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <div>
          <h1 className="display-title">Inbox</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Items die aandacht nodig hebben
          </p>
        </div>
      </div>

      {/* Stats summary */}
      {stats && stats.total > 0 && (
        <div className="responsive-grid-3" style={{ marginBottom: 48 }}>
          <StatCard label="Transacties" count={stats.unmatchedTransactions} />
          <StatCard label="Bonnen" count={stats.uncategorizedReceipts} />
          <StatCard label="Acties" count={stats.pendingActions} />
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "24px", borderBottom: "0.5px solid rgba(13,13,11,0.12)" }}>
        <button onClick={() => setFilter("all")} style={tabStyle(filter === "all")}>
          Alles {stats ? `(${stats.total})` : ""}
        </button>
        <button onClick={() => setFilter("unmatched_transaction")} style={tabStyle(filter === "unmatched_transaction")}>
          Transacties {stats ? `(${stats.unmatchedTransactions})` : ""}
        </button>
        <button onClick={() => setFilter("uncategorized_receipt")} style={tabStyle(filter === "uncategorized_receipt")}>
          Bonnen {stats ? `(${stats.uncategorizedReceipts})` : ""}
        </button>
        <button onClick={() => setFilter("pending_action")} style={tabStyle(filter === "pending_action")}>
          Acties {stats ? `(${stats.pendingActions})` : ""}
        </button>
      </div>

      {/* Items list */}
      {isLoading ? (
        <SkeletonTable />
      ) : items.length === 0 ? (
        <div style={{ borderTop: "var(--border-rule)", borderBottom: "var(--border-rule)", padding: 48, textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: 0 }}>
            Alles is verwerkt. Geen openstaande items.
          </p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-body-md)" }}>
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>Datum</Th>
              <Th>Omschrijving</Th>
              <Th style={{ textAlign: "right" }}>Bedrag</Th>
              <Th>Actie</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.itemType}-${item.id}`} style={{ borderBottom: "var(--border)" }}>
                <Td>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    opacity: 0.5,
                  }}>
                    {item.itemType === "unmatched_transaction" ? "Bank"
                      : item.itemType === "uncategorized_receipt" ? "Bon"
                      : "Actie"}
                  </span>
                </Td>
                <Td>{formatDate(item.date)}</Td>
                <Td>
                  <span style={{ fontWeight: 500 }}>{item.title}</span>
                  {item.description && item.description !== item.title && (
                    <span style={{ display: "block", fontSize: "var(--text-body-xs)", opacity: 0.5, marginTop: 2 }}>
                      {item.description.length > 80 ? item.description.slice(0, 80) + "..." : item.description}
                    </span>
                  )}
                </Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {item.amount !== null ? formatCurrency(item.amount) : "—"}
                </Td>
                <Td>
                  {item.itemType === "unmatched_transaction" && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          categorizeTxMut.mutate({ id: item.id, category: e.target.value });
                        }
                      }}
                      style={{ ...selectStyle, minWidth: 140 }}
                    >
                      <option value="">Categoriseer...</option>
                      {TRANSACTION_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}

                  {item.itemType === "uncategorized_receipt" && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          assignCodeMut.mutate({ id: item.id, code: Number(e.target.value) });
                        }
                      }}
                      style={{ ...selectStyle, minWidth: 140 }}
                    >
                      <option value="">Kostensoort...</option>
                      {KOSTENSOORTEN.map((k) => (
                        <option key={k.code} value={k.code}>{k.label}</option>
                      ))}
                    </select>
                  )}

                  {item.itemType === "pending_action" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => resolveMut.mutate(item.id)}
                        disabled={resolveMut.isPending}
                        className="label-strong"
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--foreground)",
                          color: "var(--background)",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Bevestig
                      </button>
                      <button
                        onClick={() => ignoreMut.mutate(item.id)}
                        disabled={ignoreMut.isPending}
                        className="label"
                        style={{
                          padding: "6px 12px",
                          border: "0.5px solid rgba(13,13,11,0.2)",
                          borderRadius: "var(--radius-sm)",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Negeer
                      </button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div>
      <div style={{ fontSize: "var(--text-body-sm)", fontWeight: 500, letterSpacing: "0.02em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: "var(--text-display-md)", fontWeight: 700, letterSpacing: "var(--tracking-display)", fontVariantNumeric: "tabular-nums" }}>
        {count}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBankConnections,
  getBankTransactions,
  categorizeTransaction,
  deleteBankConnection,
  syncTransactions,
  initiateBankConnection,
  completeBankConnection,
  autoCategorizeTransactions,
  learnFromCorrection,
} from "@/lib/actions/banking";
import { KOSTENSOORTEN } from "@/lib/constants/costs";
import type { BankConnection, BankTransaction } from "@/lib/types";
import { Th, Td, SkeletonTable } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

const TRANSACTION_CATEGORIES = [
  "Omzet",
  ...KOSTENSOORTEN.map((k) => k.label),
];

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function getMonthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const from = `${year}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const to = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 2px",
  border: "none",
  borderBottom: "var(--border-input)",
  background: "transparent",
  color: "var(--foreground)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  outline: "none",
  cursor: "pointer",
};

export default function BankPage() {
  const queryClient = useQueryClient();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const { data: connectionsResult, isLoading: connectionsLoading } = useQuery({
    queryKey: ["bank-connections"],
    queryFn: () => getBankConnections(),
  });

  const { data: transactionsResult, isLoading: transactionsLoading } = useQuery({
    queryKey: ["bank-transactions", selectedMonth], // Simplified to fetch all for month or all time, adjust to your backend
    queryFn: () => getBankTransactions({ from: getMonthRange(selectedMonth).from, to: getMonthRange(selectedMonth).to }),
  });

  const [activeTab, setActiveTab] = useState<"todo" | "auto">("todo");

  const categorizeMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      const result = await categorizeTransaction(id, category);
      // Learn from manual correction
      await learnMutation.mutateAsync({ transactionId: id, category });
      return result;
    },
    onSuccess: (_, variables) => {
      // Remove from AI-categorized set once manually confirmed/changed
      setAiCategorized((prev) => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBankConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-connections"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => syncTransactions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-connections"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
    },
  });

  const [aiCategorized, setAiCategorized] = useState<Set<string>>(new Set());

  const autoCategorizeMutation = useMutation({
    mutationFn: (ids: string[]) => autoCategorizeTransactions(ids),
    onSuccess: (result) => {
      if (result.data) {
        setAiCategorized(new Set(Object.keys(result.data)));
      }
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
    },
  });

  const learnMutation = useMutation({
    mutationFn: ({ transactionId, category }: { transactionId: string; category: string }) =>
      learnFromCorrection(transactionId, category),
  });

  const connectMutation = useMutation({
    mutationFn: async (institutionId: string) => {
      const result = await initiateBankConnection(institutionId);
      if (result.error) throw new Error(result.error);
      if (result.data?.redirectUrl.includes("connected=")) {
        const connId = new URL(result.data.redirectUrl, window.location.origin).searchParams.get("connected");
        if (connId) await completeBankConnection(connId);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-connections"] });
    },
  });

  const connections = connectionsResult?.data ?? [];
  const transactions = useMemo(() => transactionsResult?.data ?? [], [transactionsResult?.data]);

  const uncategorizedTransactions = useMemo(
    () => transactions.filter((tx) => !tx.category),
    [transactions]
  );
  
  const categorizedTransactions = useMemo(
    () => transactions.filter((tx) => tx.category),
    [transactions]
  );
  
  const uncategorizedCount = uncategorizedTransactions.length;
  const categorizedCount = categorizedTransactions.length;
  
  const displayTransactions = activeTab === "todo" ? uncategorizedTransactions : categorizedTransactions;

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const t of transactions) {
      if (t.amount >= 0) {
        income += Number(t.amount);
      } else {
        expenses += Number(t.amount);
      }
    }
    return { income, expenses, net: income + expenses };
  }, [transactions]);

  const isLoading = connectionsLoading || transactionsLoading;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 48,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Bank
        </h1>
      </div>

      {/* Section 1: Connected accounts */}
      <div style={{ marginBottom: 48 }}>
        <h2
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
            margin: "0 0 24px",
          }}
        >
          Rekeningen
        </h2>

        {connectionsLoading ? (
          <SkeletonBlock />
        ) : connections.length === 0 ? (
          <div
            style={{
              border: "none",
              borderTop: "var(--border-rule)",
              borderBottom: "var(--border-rule)",
              padding: 48,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-lg)",
                fontWeight: 300,
                margin: "0 0 16px",
              }}
            >
              Nog geen bankrekening gekoppeld.
            </p>
            <button
              onClick={() => connectMutation.mutate("PLACEHOLDER_BANK_NL")}
              disabled={connectMutation.isPending}
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-lg)",
                fontWeight: 500,
                letterSpacing: "0.05em",
                padding: "12px 20px",
                border: "none",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: "pointer",
              }}
            >
              {connectMutation.isPending ? "Bezig..." : "Koppel bankrekening"}
            </button>
          </div>
        ) : (
          <div>
            {connections.map((conn: BankConnection) => (
              <div
                key={conn.id}
                style={{
                  borderBottom: "var(--border)",
                  padding: "16px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-body), sans-serif",
                      fontSize: "var(--text-body-lg)",
                      fontWeight: 500,
                    }}
                  >
                    {conn.institution_name}
                  </span>
                  {conn.iban && (
                    <span
                      style={{
                        fontFamily: "var(--font-body), sans-serif",
                        fontSize: "var(--text-body-md)",
                        fontWeight: 300,
                        marginLeft: 12,
                        opacity: 0.5,
                      }}
                    >
                      {conn.iban}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-body), sans-serif",
                      fontSize: "var(--text-body-xs)",
                      fontWeight: 400,
                      letterSpacing: "0.05em",
                      marginLeft: 12,
                      opacity: 0.4,
                      textTransform: "uppercase",
                    }}
                  >
                    {conn.status}
                  </span>
                  {conn.last_synced_at && (
                    <span
                      style={{
                        fontFamily: "var(--font-body), sans-serif",
                        fontSize: "var(--text-body-xs)",
                        fontWeight: 300,
                        marginLeft: 12,
                        opacity: 0.4,
                      }}
                    >
                      Laatst gesynchroniseerd: {formatDate(conn.last_synced_at)}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => syncMutation.mutate(conn.id)}
                    disabled={syncMutation.isPending}
                    style={{
                      fontFamily: "var(--font-body), sans-serif",
                      fontSize: "var(--text-body-xs)",
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      background: "none",
                      border: "1px solid rgba(13, 13, 11, 0.2)",
                      color: "var(--foreground)",
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
                  >
                    {syncMutation.isPending ? "Bezig..." : "Synchroniseren"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Weet je zeker dat je deze bankverbinding wilt verwijderen?")) {
                        deleteMutation.mutate(conn.id);
                      }
                    }}
                    style={{
                      fontFamily: "var(--font-body), sans-serif",
                      fontSize: "var(--text-body-xs)",
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      background: "none",
                      border: "none",
                      color: "var(--foreground)",
                      opacity: 0.6,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Verwijder
                  </button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => connectMutation.mutate("PLACEHOLDER_BANK_NL")}
                disabled={connectMutation.isPending}
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-body-md)",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  padding: "10px 16px",
                  border: "1px solid rgba(13, 13, 11, 0.2)",
                  background: "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                + Nog een rekening koppelen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Transactions */}
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "var(--text-display-md)",
              fontWeight: 700,
              letterSpacing: "var(--tracking-display)",
              lineHeight: 1,
              margin: 0,
            }}
          >
            Transacties
          </h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              ...selectStyle,
              width: "auto",
              minWidth: 160,
              borderBottom: "none",
              border: "1px solid rgba(13, 13, 11, 0.2)",
              padding: "8px 12px",
            }}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Auto-categorization banner */}
        {!transactionsLoading && uncategorizedCount > 0 && (
          <div
            style={{
              borderLeft: "2px solid var(--foreground)",
              padding: "12px 16px",
              marginBottom: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-lg)",
                fontWeight: 300,
              }}
            >
              {uncategorizedCount} transactie{uncategorizedCount !== 1 ? "s" : ""} wacht{uncategorizedCount === 1 ? "" : "en"} op categorisatie
            </span>
            <button
              onClick={() =>
                autoCategorizeMutation.mutate(
                  uncategorizedTransactions.map((tx) => tx.id)
                )
              }
              disabled={autoCategorizeMutation.isPending}
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-lg)",
                fontWeight: 500,
                letterSpacing: "0.05em",
                padding: "12px 20px",
                border: "none",
                background: "var(--foreground)",
                color: "var(--background)",
                cursor: "pointer",
              }}
            >
              {autoCategorizeMutation.isPending
                ? "Bezig met categoriseren..."
                : "Categoriseer automatisch"}
            </button>
          </div>
        )}

        {/* Tabs for To-Do vs Auto-Processed */}
        <div style={{ display: "flex", gap: "24px", marginBottom: "24px", borderBottom: "1px solid rgba(13,13,11,0.12)" }}>
           <button
             onClick={() => setActiveTab("todo")}
             style={{
               background: "none",
               border: "none",
               borderBottom: activeTab === "todo" ? "2px solid var(--foreground)" : "2px solid transparent",
               padding: "0 0 8px 0",
               fontFamily: "var(--font-body), sans-serif",
               fontSize: "var(--text-body-lg)",
               fontWeight: activeTab === "todo" ? 500 : 300,
               color: "var(--foreground)",
               opacity: activeTab === "todo" ? 1 : 0.5,
               cursor: "pointer",
             }}
           >
             Actie vereist ({uncategorizedCount})
           </button>
           <button
             onClick={() => setActiveTab("auto")}
             style={{
               background: "none",
               border: "none",
               borderBottom: activeTab === "auto" ? "2px solid var(--foreground)" : "2px solid transparent",
               padding: "0 0 8px 0",
               fontFamily: "var(--font-body), sans-serif",
               fontSize: "var(--text-body-lg)",
               fontWeight: activeTab === "auto" ? 500 : 300,
               color: "var(--foreground)",
               opacity: activeTab === "auto" ? 1 : 0.5,
               cursor: "pointer",
             }}
           >
             Verwerkt ({categorizedCount})
           </button>
        </div>

        {transactionsLoading ? (
          <SkeletonTable />
        ) : displayTransactions.length === 0 ? (
          <div
            style={{
              border: "none",
              borderTop: "var(--border-rule)",
              borderBottom: "var(--border-rule)",
              padding: 48,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-lg)",
                fontWeight: 300,
                margin: 0,
              }}
            >
              Inbox Zero. Geen transacties meer in deze lijst.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--foreground)",
                  textAlign: "left",
                }}
              >
                <Th>Datum</Th>
                <Th>Omschrijving</Th>
                <Th>Tegenpartij</Th>
                <Th>Categorie (Swipe/Selecteer)</Th>
                <Th style={{ textAlign: "right" }}>Bedrag</Th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((tx: BankTransaction) => (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: "var(--border)",
                    borderLeft: aiCategorized.has(tx.id)
                      ? "2px solid var(--foreground)"
                      : "2px solid transparent",
                  }}
                >
                  <Td>{formatDate(tx.booking_date)}</Td>
                  <Td>{tx.description ?? "—"}</Td>
                  <Td>{tx.counterpart_name ?? "—"}</Td>
                  <Td>
                    <select
                      value={tx.category ?? ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          categorizeMutation.mutate({
                            id: tx.id,
                            category: e.target.value,
                          });
                        }
                      }}
                      style={selectStyle}
                    >
                      <option value="">—</option>
                      {TRANSACTION_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td
                    style={{
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(Number(tx.amount))}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 3: Summary */}
      {!isLoading && transactions.length > 0 && (
        <div
          style={{
            borderTop: "1px solid var(--foreground)",
            paddingTop: 24,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "var(--text-display-md)",
              fontWeight: 700,
              letterSpacing: "var(--tracking-display)",
              lineHeight: 1,
              margin: "0 0 24px",
            }}
          >
            Samenvatting
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
            }}
          >
            <SummaryItem label="Inkomsten" amount={totals.income} />
            <SummaryItem label="Uitgaven" amount={totals.expenses} />
            <SummaryItem label="Netto" amount={totals.net} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, amount }: { label: string; amount: number }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-sm)",
          fontWeight: 500,
          letterSpacing: "0.02em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-md)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-display)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatCurrency(amount)}
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div style={{ opacity: 0.12 }}>
      <div
        style={{
          borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
          padding: "16px 0",
        }}
      >
        <div className="skeleton" style={{ width: "40%", height: 14 }} />
      </div>
    </div>
  );
}

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

const TRANSACTION_CATEGORIES = [
  "Omzet",
  ...KOSTENSOORTEN.map((k) => k.label),
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
  const { from, to } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);

  const { data: connectionsResult, isLoading: connectionsLoading } = useQuery({
    queryKey: ["bank-connections"],
    queryFn: () => getBankConnections(),
  });

  const { data: transactionsResult, isLoading: transactionsLoading } = useQuery({
    queryKey: ["bank-transactions", from, to],
    queryFn: () => getBankTransactions({ from, to }),
  });

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
  const uncategorizedCount = uncategorizedTransactions.length;

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
            fontWeight: 900,
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

        {transactionsLoading ? (
          <SkeletonTable />
        ) : transactions.length === 0 ? (
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
              Geen transacties in deze periode.
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
                <Th>Categorie</Th>
                <Th style={{ textAlign: "right" }}>Bedrag</Th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: BankTransaction) => (
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

function Th({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        fontWeight: 500,
        fontSize: "var(--text-body-sm)",
        letterSpacing: "0.02em",
        padding: "12px 8px",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "12px 8px",
        fontWeight: 300,
        ...style,
      }}
    >
      {children}
    </td>
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

function SkeletonTable() {
  return (
    <div style={{ opacity: 0.12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr",
          gap: 12,
          padding: "10px 12px",
          borderBottom: "1px solid var(--foreground)",
        }}
      >
        {[60, 80, 70, 60, 50].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: `${w}%`, height: 9 }} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr",
            gap: 12,
            padding: "12px 12px",
            borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
          }}
        >
          {[50, 70, 60, 50, 40].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: `${w}%`, height: 13 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { m as motion, AnimatePresence } from "framer-motion";
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
} from "@/features/banking/actions";
import { InstitutionSelector } from "@/features/dashboard/components/InstitutionSelector";
import { KOSTENSOORTEN } from "@/lib/constants/costs";
import type { BankConnection, BankTransaction } from "@/lib/types";
import { Th, Td, SkeletonTable } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";

const TRANSACTION_CATEGORIES = [
  "Omzet",
  ...KOSTENSOORTEN.map((k) => k.label),
];

function getMonthOptions(locale: string): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const dateLocale = locale === "en" ? "en-GB" : "nl-NL";
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
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
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  outline: "none",
  cursor: "pointer",
};

export default function BankTab() {
  const { locale, t } = useLocale();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const monthOptions = useMemo(() => getMonthOptions(locale), [locale]);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const { data: connectionsResult, isLoading: connectionsLoading } = useQuery({
    queryKey: ["bank-connections"],
    queryFn: () => getBankConnections(),
  });

  const { data: transactionsResult, isLoading: transactionsLoading } = useQuery({
    queryKey: ["bank-transactions", selectedMonth],
    queryFn: () => getBankTransactions({ from: getMonthRange(selectedMonth).from, to: getMonthRange(selectedMonth).to }),
  });

  const [activeTab, setActiveTab] = useState<"todo" | "auto">("todo");
  const [completionStatus, setCompletionStatus] = useState<{ loading: boolean; error: string | null; success: boolean }>({
    loading: false,
    error: null,
    success: false,
  });

  useEffect(() => {
    const requisitionId = searchParams.get("requisition_id");
    if (requisitionId && !completionStatus.loading && !completionStatus.success && !completionStatus.error) {
      const handleComplete = async () => {
        setCompletionStatus(prev => ({ ...prev, loading: true }));
        const res = await completeBankConnection(requisitionId);
        if (res.error) {
          setCompletionStatus({ loading: false, error: res.error, success: false });
        } else {
          setCompletionStatus({ loading: false, error: null, success: true });
          queryClient.invalidateQueries({ queryKey: ["bank-connections"] });
          queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
        }
      };

      handleComplete();
    }
  }, [searchParams, completionStatus, queryClient]);

  const categorizeMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      const result = await categorizeTransaction(id, category);
      await learnMutation.mutateAsync({ transactionId: id, category });
      return result;
    },
    onSuccess: (_, variables) => {
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
      if (result.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      }
      return result;
    },
    onSuccess: () => {
      setIsSelectorOpen(false);
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

  const subTabStyle = (active: boolean): React.CSSProperties => ({
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

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 48 }}>
        <h1 className="display-title">{t.bank.title}</h1>
        <a
          href="/api/export/transactions"
          download
          className="btn-secondary"
        >
          {t.common.downloadList}
        </a>
      </div>

      {/* Return Status Feedback */}
      <AnimatePresence>
        {(completionStatus.loading || completionStatus.error || completionStatus.success) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              overflow: "hidden",
              marginBottom: 48,
              borderLeft: "2px solid var(--foreground)",
              background: "rgba(13, 13, 11, 0.04)",
              padding: "24px",
            }}
          >
            {completionStatus.loading && (
              <p style={{ margin: 0, opacity: 0.6 }}>{t.bank.configuring}</p>
            )}
            {completionStatus.error && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, color: "#e63946" }}>{t.bank.connectError.replace("{error}", completionStatus.error)}</p>
                <button
                  onClick={() => setCompletionStatus({ loading: false, error: null, success: false })}
                  style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}
                >
                  {t.common.close}
                </button>
              </div>
            )}
            {completionStatus.success && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0 }}>{t.bank.connectSuccess}</p>
                <button
                  onClick={() => setCompletionStatus({ loading: false, error: null, success: false })}
                  style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}
                >
                  {t.common.close}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <InstitutionSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelect={(id) => connectMutation.mutate(id)}
        isPending={connectMutation.isPending}
      />

      {/* Section 1: Connected accounts */}
      <div style={{ marginBottom: 48 }}>
        <h2 className="section-header" style={{ margin: "0 0 24px" }}>{t.bank.accounts}</h2>

        {connectionsLoading ? (
          <SkeletonBlock />
        ) : connections.length === 0 ? (
          <div style={{ borderTop: "var(--border-rule)", borderBottom: "var(--border-rule)", padding: 48, textAlign: "center", background: "rgba(13, 13, 11, 0.02)" }}>
            <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "0 0 24px", opacity: 0.6 }}>
              {t.bank.connectPrompt}
            </p>
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="btn-primary"
              style={{ border: "none", cursor: "pointer" }}
            >
              {t.bank.connectBank}
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
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "var(--text-body-lg)", fontWeight: 500 }}>{conn.institution_name}</span>
                  {conn.iban && <span style={{ fontSize: "var(--text-body-md)", fontWeight: 300, opacity: 0.5 }}>{conn.iban}</span>}
                  <span className="label" style={{ opacity: 0.4 }}>{conn.status}</span>
                  {conn.last_synced_at && <span style={{ fontSize: "var(--text-body-xs)", fontWeight: 300, opacity: 0.4 }}>{t.bank.lastUpdate.replace("{date}", formatDate(conn.last_synced_at))}</span>}
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => syncMutation.mutate(conn.id)}
                    disabled={syncMutation.isPending}
                    className="btn-secondary"
                    style={{ cursor: "pointer" }}
                  >
                    {syncMutation.isPending ? t.common.busy : t.bank.sync}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t.bank.disconnectConfirm)) {
                        deleteMutation.mutate(conn.id);
                      }
                    }}
                    className="label"
                    style={{ background: "none", border: "none", color: "var(--foreground)", opacity: 0.6, cursor: "pointer", padding: 0 }}
                  >
                    {t.bank.disconnect}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => setIsSelectorOpen(true)}
                className="btn-secondary"
                style={{ cursor: "pointer" }}
              >
                {t.bank.connectExtra}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Transactions */}
      <div style={{ marginBottom: 48 }}>
        <div className="page-header" style={{ marginBottom: 24 }}>
          <h2 className="section-header" style={{ margin: 0 }}>{t.bank.payments}</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ ...selectStyle, width: "auto", minWidth: 160, borderBottom: "none", border: "0.5px solid rgba(13, 13, 11, 0.25)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Auto-categorization banner */}
        {!transactionsLoading && uncategorizedCount > 0 && (
          <div style={{ borderLeft: "2px solid var(--foreground)", padding: "12px 16px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: "var(--text-body-lg)", fontWeight: 300 }}>
              {t.bank.toCategorize.replace("{count}", String(uncategorizedCount)).replace("{plural}", uncategorizedCount !== 1 ? "en" : "")}
            </span>
            <button
              onClick={() => autoCategorizeMutation.mutate(uncategorizedTransactions.map((tx) => tx.id))}
              disabled={autoCategorizeMutation.isPending}
              className="btn-primary"
              style={{ border: "none", cursor: "pointer" }}
            >
              {autoCategorizeMutation.isPending ? t.common.busy : t.bank.autoCategorize}
            </button>
          </div>
        )}

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: "24px", marginBottom: "24px", borderBottom: "0.5px solid rgba(13,13,11,0.12)" }}>
          <button onClick={() => setActiveTab("todo")} style={subTabStyle(activeTab === "todo")}>
            {`${t.bank.todo} (${uncategorizedCount})`}
          </button>
          <button onClick={() => setActiveTab("auto")} style={subTabStyle(activeTab === "auto")}>
            {`${t.bank.processed} (${categorizedCount})`}
          </button>
        </div>

        {transactionsLoading ? (
          <SkeletonTable />
        ) : displayTransactions.length === 0 ? (
          <div style={{ borderTop: "var(--border-rule)", borderBottom: "var(--border-rule)", padding: 48, textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: 0 }}>
              {t.bank.allProcessed}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-body-md)" }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
                <Th>{t.common.date}</Th>
                <Th>{t.common.description}</Th>
                <Th>{t.bank.fromTo}</Th>
                <Th>{t.common.category}</Th>
                <Th style={{ textAlign: "right" }}>{t.common.amount}</Th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((tx: BankTransaction) => (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: "var(--border)",
                    borderLeft: aiCategorized.has(tx.id) ? "2px solid var(--foreground)" : "2px solid transparent",
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
                          categorizeMutation.mutate({ id: tx.id, category: e.target.value });
                        }
                      }}
                      style={selectStyle}
                    >
                      <option value="">—</option>
                      {TRANSACTION_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </Td>
                  <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
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
        <div style={{ borderTop: "0.5px solid rgba(13,13,11,0.15)", paddingTop: 24 }}>
          <h2 className="section-header" style={{ margin: "0 0 24px" }}>{t.bank.summary}</h2>
          <div className="responsive-grid-3">
            <SummaryItem label={t.bank.income} amount={totals.income} />
            <SummaryItem label={t.bank.expenses} amount={totals.expenses} />
            <SummaryItem label={t.bank.result} amount={totals.net} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, amount }: { label: string; amount: number }) {
  return (
    <div>
      <div style={{ fontSize: "var(--text-body-sm)", fontWeight: 500, letterSpacing: "0.02em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "var(--text-display-md)", fontWeight: 700, letterSpacing: "var(--tracking-display)", fontVariantNumeric: "tabular-nums" }}>
        {formatCurrency(amount)}
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div style={{ opacity: 0.12 }}>
      <div style={{ borderBottom: "1px solid rgba(13, 13, 11, 0.08)", padding: "16px 0" }}>
        <div className="skeleton" style={{ width: "40%", height: 14 }} />
      </div>
    </div>
  );
}

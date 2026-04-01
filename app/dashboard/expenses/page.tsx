"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useLocale } from "@/lib/i18n/context";

const ReceiptsTab = dynamic(() => import("./ReceiptsTab"));
const BankTab = dynamic(() => import("./BankTab"));

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: "none",
  border: "none",
  borderBottom: active ? "1.5px solid var(--foreground)" : "1.5px solid transparent",
  padding: "0 0 12px 0",
  fontSize: 14,
  fontWeight: active ? 600 : 400,
  color: "var(--foreground)",
  opacity: active ? 1 : 0.4,
  cursor: "pointer",
  letterSpacing: "-0.01em",
  transition: "opacity 0.2s ease",
});

export default function ExpensesPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "bank" ? "bank" : "bonnen";
  const [activeTab, setActiveTab] = useState<"bonnen" | "bank">(initialTab);

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 28, marginBottom: 40, borderBottom: "0.5px solid rgba(0, 0, 0, 0.08)" }}>
        <button onClick={() => setActiveTab("bonnen")} style={tabStyle(activeTab === "bonnen")}>
          {t.expenses.receipts}
        </button>
        <button onClick={() => setActiveTab("bank")} style={tabStyle(activeTab === "bank")}>
          {t.expenses.bank}
        </button>
      </div>

      {activeTab === "bonnen" ? <ReceiptsTab /> : <BankTab />}
    </div>
  );
}

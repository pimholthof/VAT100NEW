"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const ReceiptsTab = dynamic(() => import("./ReceiptsTab"));
const BankTab = dynamic(() => import("./BankTab"));

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

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "bank" ? "bank" : "bonnen";
  const [activeTab, setActiveTab] = useState<"bonnen" | "bank">(initialTab);

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "40px", borderBottom: "0.5px solid rgba(13,13,11,0.12)" }}>
        <button onClick={() => setActiveTab("bonnen")} style={tabStyle(activeTab === "bonnen")}>
          Bonnen
        </button>
        <button onClick={() => setActiveTab("bank")} style={tabStyle(activeTab === "bank")}>
          Bank
        </button>
      </div>

      {activeTab === "bonnen" ? <ReceiptsTab /> : <BankTab />}
    </div>
  );
}

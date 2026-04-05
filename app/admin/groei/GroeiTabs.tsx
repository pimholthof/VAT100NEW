"use client";

import { useState } from "react";

export function GroeiTabs({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  const [tab, setTab] = useState<"metrics" | "prognoses">("metrics");

  return (
    <div>
      <div className="admin-toolbar" style={{ gap: 0, borderBottom: "0.5px solid rgba(0,0,0,0.08)", marginBottom: 24 }}>
        <button
          onClick={() => setTab("metrics")}
          className="admin-page-button"
          style={{
            borderBottom: tab === "metrics" ? "2px solid #000" : "2px solid transparent",
            borderTop: "none", borderLeft: "none", borderRight: "none",
            opacity: tab === "metrics" ? 1 : 0.4,
            minHeight: 36,
          }}
        >
          Metrics
        </button>
        <button
          onClick={() => setTab("prognoses")}
          className="admin-page-button"
          style={{
            borderBottom: tab === "prognoses" ? "2px solid #000" : "2px solid transparent",
            borderTop: "none", borderLeft: "none", borderRight: "none",
            opacity: tab === "prognoses" ? 1 : 0.4,
            minHeight: 36,
          }}
        >
          Prognoses
        </button>
      </div>
      {tab === "metrics" ? children[0] : children[1]}
    </div>
  );
}

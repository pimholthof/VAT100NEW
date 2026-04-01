"use client";

import { useState } from "react";
import { stopImpersonation } from "@/features/admin/actions/impersonate";

interface ImpersonationBannerProps {
  userName: string;
}

export function ImpersonationBanner({ userName }: ImpersonationBannerProps) {
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopping(true);
    await stopImpersonation();
    window.location.href = "/admin/customers";
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "8px 24px",
        background: "#f59e0b",
        color: "#000",
        fontSize: "var(--text-body-sm)",
        fontWeight: 600,
      }}
    >
      <span>
        Je bekijkt het dashboard als {userName} — Alleen-lezen modus
      </span>
      <button
        onClick={handleStop}
        disabled={stopping}
        style={{
          background: "#000",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "4px 12px",
          cursor: "pointer",
          fontSize: "var(--text-body-sm)",
          fontWeight: 600,
        }}
      >
        {stopping ? "Stoppen..." : "Stop impersonatie"}
      </button>
    </div>
  );
}

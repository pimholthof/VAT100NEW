"use client";

import { ButtonPrimary, ButtonSecondary } from "@/components/ui";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: { label: string; onClick: () => void; variant?: "primary" | "danger" }[];
}

export function BulkActionBar({ selectedCount, onClearSelection, actions }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 24px",
        background: "var(--background)",
        border: "0.5px solid rgba(0,0,0,0.12)",
        borderRadius: 12,
        boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
        zIndex: 100,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <span style={{ fontWeight: 600, fontSize: "var(--text-body-sm)", whiteSpace: "nowrap" }}>
        {selectedCount} geselecteerd
      </span>

      {actions.map((action) => (
        action.variant === "danger" ? (
          <ButtonSecondary
            key={action.label}
            onClick={action.onClick}
            style={{ borderColor: "rgba(165,28,48,0.3)", color: "var(--color-accent)", fontSize: "var(--text-body-sm)", padding: "6px 16px" }}
          >
            {action.label}
          </ButtonSecondary>
        ) : (
          <ButtonPrimary
            key={action.label}
            onClick={action.onClick}
            style={{ fontSize: "var(--text-body-sm)", padding: "6px 16px" }}
          >
            {action.label}
          </ButtonPrimary>
        )
      ))}

      <button
        onClick={onClearSelection}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          opacity: 0.4,
          fontSize: "var(--text-body-sm)",
        }}
      >
        Wis selectie
      </button>
    </div>
  );
}

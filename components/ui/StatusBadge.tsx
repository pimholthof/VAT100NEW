"use client";

import { useState, useRef, useEffect } from "react";

interface StatusOption {
  value: string;
  label: string;
}

interface StatusBadgeProps {
  value: string;
  options: StatusOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

const statusColors: Record<string, { bg: string; dot: string; text: string }> = {
  draft: { bg: "rgba(0,0,0,0.03)", dot: "rgba(0,0,0,0.25)", text: "var(--foreground)" },
  sent: { bg: "rgba(0,0,0,0.04)", dot: "rgba(0,0,0,0.4)", text: "var(--foreground)" },
  paid: { bg: "rgba(26,122,58,0.06)", dot: "var(--color-success)", text: "var(--color-success)" },
  overdue: { bg: "rgba(165,28,48,0.06)", dot: "var(--color-accent)", text: "var(--color-accent)" },
  accepted: { bg: "rgba(26,122,58,0.06)", dot: "var(--color-success)", text: "var(--color-success)" },
  invoiced: { bg: "rgba(0,0,0,0.03)", dot: "rgba(0,0,0,0.25)", text: "var(--foreground)" },
  rejected: { bg: "rgba(165,28,48,0.06)", dot: "var(--color-accent)", text: "var(--color-accent)" },
};

const defaultColor = { bg: "rgba(0,0,0,0.03)", dot: "rgba(0,0,0,0.3)", text: "var(--foreground)" };

export function StatusBadge({ value, options, onChange, disabled, ariaLabel }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const colors = statusColors[value] ?? defaultColor;
  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: colors.bg,
          border: "none",
          borderRadius: 999,
          cursor: disabled ? "default" : "pointer",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: colors.text,
          opacity: disabled ? 0.4 : 0.8,
          transition: "opacity 0.15s ease",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: colors.dot,
          }}
        />
        {currentLabel}
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: 120,
            background: "var(--background)",
            border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            padding: "4px 0",
            zIndex: 50,
          }}
        >
          {options.map((option) => {
            const optColors = statusColors[option.value] ?? defaultColor;
            return (
              <button
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  background: option.value === value ? "rgba(0,0,0,0.03)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 500,
                  color: optColors.text,
                  textAlign: "left",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = option.value === value ? "rgba(0,0,0,0.03)" : "transparent";
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: optColors.dot,
                  }}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

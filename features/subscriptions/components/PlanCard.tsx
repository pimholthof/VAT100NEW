"use client";

import type { Plan } from "@/lib/types";

interface PlanCardProps {
  plan: Plan;
  isSelected?: boolean;
  isCurrent?: boolean;
  onSelect?: (planId: string) => void;
  disabled?: boolean;
}

export function PlanCard({
  plan,
  isSelected = false,
  isCurrent = false,
  onSelect,
  disabled = false,
}: PlanCardProps) {
  const features: string[] = Array.isArray(plan.features) ? plan.features : [];

  return (
    <button
      onClick={() => onSelect?.(plan.id)}
      disabled={disabled || isCurrent}
      style={{
        padding: 32,
        background: isSelected ? "var(--foreground)" : "transparent",
        color: isSelected ? "var(--background)" : "var(--foreground)",
        border: `0.5px solid ${isSelected ? "var(--foreground)" : "rgba(0,0,0,0.1)"}`,
        cursor: disabled || isCurrent ? "default" : "pointer",
        textAlign: "left",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        opacity: disabled ? 0.5 : 1,
        position: "relative",
      }}
    >
      {isCurrent && (
        <span
          className="label"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: "10px",
            opacity: 0.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Huidig plan
        </span>
      )}

      <div>
        <p
          className="label"
          style={{
            margin: 0,
            opacity: 0.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {plan.name}
        </p>
        <p
          style={{
            fontSize: "clamp(2rem, 3vw, 2.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            margin: "8px 0 0",
            lineHeight: 1,
          }}
        >
          &euro;{plan.price_cents / 100}
          <span
            style={{
              fontSize: "14px",
              fontWeight: 400,
              opacity: 0.5,
              marginLeft: 4,
            }}
          >
            /mnd
          </span>
        </p>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
        }}
      >
        {features.map((feature) => (
          <li
            key={feature}
            style={{
              fontSize: "13px",
              opacity: 0.7,
              lineHeight: 1.5,
            }}
          >
            {feature}
          </li>
        ))}
      </ul>
    </button>
  );
}

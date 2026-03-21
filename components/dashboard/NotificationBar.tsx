"use client";

import { useState } from "react";

export interface Notification {
  id: string;
  type: "warning" | "info" | "urgent";
  message: string;
}

interface NotificationBarProps {
  notifications: Notification[];
}

const typeStyles: Record<Notification["type"], { bg: string; border: string; text: string }> = {
  urgent: {
    bg: "bg-[var(--color-reserved)]/10",
    border: "border-l-[var(--color-reserved)]",
    text: "text-[var(--color-reserved)]",
  },
  warning: {
    bg: "bg-[var(--color-warning)]/10",
    border: "border-l-[var(--color-warning)]",
    text: "text-[var(--color-warning)]",
  },
  info: {
    bg: "bg-foreground/5",
    border: "border-l-foreground/50",
    text: "text-foreground/70",
  },
};

export function NotificationBar({ notifications }: NotificationBarProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  return (
    <div className="flex flex-col gap-2">
      {visible.map((notification) => {
        const styles = typeStyles[notification.type];

        return (
          <div
            key={notification.id}
            className={`flex items-center justify-between w-full px-4 py-3 border-l-2 ${styles.border} ${styles.bg}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-[9px] uppercase tracking-[0.12em] font-semibold ${styles.text}`}
              >
                {notification.type === "urgent"
                  ? "Dringend"
                  : notification.type === "warning"
                    ? "Let op"
                    : "Info"}
              </span>
              <span className={`text-sm ${styles.text}`}>
                {notification.message}
              </span>
            </div>
            <button
              onClick={() => dismiss(notification.id)}
              className={`ml-4 bg-transparent border-none cursor-pointer text-sm leading-none ${styles.text} opacity-60 hover:opacity-100`}
              aria-label="Sluiten"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

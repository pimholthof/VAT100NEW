"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitFeedback } from "@/features/feedback/actions";
import type { FeedbackType } from "@/lib/types";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const handleSubmit = () => {
    if (!message.trim()) return;
    startTransition(async () => {
      const result = await submitFeedback({ type, message: message.trim(), pageUrl: pathname });
      if (result.error) {
        setStatus("error");
      } else {
        setStatus("success");
        setTimeout(() => { setOpen(false); setMessage(""); setType("general"); setStatus("idle"); }, 1500);
      }
    });
  };

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="label-strong"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          padding: "8px 16px",
          background: open ? "var(--color-black)" : "var(--background)",
          color: open ? "var(--background)" : "var(--foreground)",
          border: "0.5px solid rgba(0,0,0,0.15)",
          borderRadius: "9999px",
          cursor: "pointer",
          fontSize: 10,
          transition: "all 0.2s ease",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        {open ? "Sluiten" : "Feedback"}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 64,
            right: 24,
            zIndex: 999,
            width: 320,
            background: "var(--background)",
            border: "0.5px solid rgba(0,0,0,0.12)",
            borderRadius: "var(--radius)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
            padding: 24,
            animation: "slideUp 0.3s ease",
          }}
        >
          {status === "success" ? (
            <p style={{ textAlign: "center", fontWeight: 500, color: "var(--color-success)" }}>
              Bedankt voor je feedback!
            </p>
          ) : (
            <>
              <p style={{ fontWeight: 600, fontSize: "var(--text-body-lg)", marginBottom: 16 }}>
                Feedback geven
              </p>

              {/* Type selector */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {([
                  { key: "bug" as const, label: "Bug" },
                  { key: "feature" as const, label: "Verzoek" },
                  { key: "general" as const, label: "Algemeen" },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setType(opt.key)}
                    className="label-strong"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "9999px",
                      border: "0.5px solid rgba(0,0,0,0.12)",
                      background: type === opt.key ? "var(--color-black)" : "transparent",
                      color: type === opt.key ? "var(--background)" : "var(--foreground)",
                      cursor: "pointer",
                      fontSize: 9,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Beschrijf je feedback..."
                rows={4}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.015)",
                  fontSize: "var(--text-body-md)",
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  marginBottom: 12,
                }}
              />

              {status === "error" && (
                <p style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", marginBottom: 8 }}>
                  Er ging iets mis. Probeer het opnieuw.
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isPending || !message.trim()}
                className="btn-primary"
                style={{ width: "100%" }}
              >
                {isPending ? "Verzenden..." : "Verstuur"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

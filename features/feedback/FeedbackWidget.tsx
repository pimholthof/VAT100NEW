"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitFeedback } from "./actions";

const CATEGORIES = ["bug", "suggestie", "vraag"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  bug: "Bug",
  suggestie: "Suggestie",
  vraag: "Vraag",
};

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const reset = useCallback(() => {
    setCategory(null);
    setMessage("");
    setError(null);
    setSuccess(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) handleClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Auto-close after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => handleClose(), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, handleClose]);

  function handleSubmit() {
    if (!category || message.length < 5) return;

    const formData = new FormData();
    formData.set("category", category);
    formData.set("message", message);
    formData.set("pageUrl", pathname);

    startTransition(async () => {
      const result = await submitFeedback(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Feedback geven"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 999,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--color-black, #000000)",
            color: "var(--color-white, #FFFFFF)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: 700,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          ?
        </button>
      )}

      {/* Modal overlay + panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: 24,
          }}
        >
          {/* Backdrop */}
          <div
            onClick={handleClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.08)",
              backdropFilter: "blur(2px)",
            }}
          />

          {/* Panel */}
          <div
            style={{
              position: "relative",
              width: 360,
              maxWidth: "calc(100vw - 48px)",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "0.5px solid rgba(0,0,0,0.05)",
              borderRadius: 16,
              boxShadow: "0 24px 48px rgba(0,0,0,0.10)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--color-black, #000000)",
                }}
              >
                Feedback
              </span>
              <button
                onClick={handleClose}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  opacity: 0.4,
                  color: "var(--foreground, #000000)",
                  padding: 4,
                }}
              >
                Sluit
              </button>
            </div>

            {success ? (
              <p
                style={{
                  fontSize: 14,
                  textAlign: "center",
                  padding: "32px 0",
                  color: "var(--color-black, #000000)",
                  fontWeight: 500,
                }}
              >
                Bedankt voor je feedback!
              </p>
            ) : (
              <>
                {/* Category selector */}
                <div style={{ display: "flex", gap: 8 }}>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        border:
                          category === cat
                            ? "1.5px solid var(--color-black, #000000)"
                            : "0.5px solid rgba(0,0,0,0.12)",
                        borderRadius: 8,
                        background:
                          category === cat
                            ? "var(--color-black, #000000)"
                            : "transparent",
                        color:
                          category === cat
                            ? "var(--color-white, #FFFFFF)"
                            : "var(--color-black, #000000)",
                        cursor: "pointer",
                        transition:
                          "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                {/* Message textarea */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Beschrijf je feedback..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "0.5px solid rgba(0,0,0,0.12)",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.015)",
                    color: "var(--foreground, #000000)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    resize: "vertical",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                    boxSizing: "border-box",
                  }}
                />

                {/* Error */}
                {error && (
                  <p style={{ fontSize: 12, color: "#D32F2F", margin: 0 }}>
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!category || message.length < 5 || isPending}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    background:
                      !category || message.length < 5
                        ? "rgba(0,0,0,0.15)"
                        : "var(--color-black, #000000)",
                    color: "var(--color-white, #FFFFFF)",
                    border: "none",
                    borderRadius: 8,
                    cursor:
                      !category || message.length < 5 || isPending
                        ? "not-allowed"
                        : "pointer",
                    transition: "background 0.2s ease, opacity 0.2s ease",
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? "Verzenden..." : "Verstuur feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

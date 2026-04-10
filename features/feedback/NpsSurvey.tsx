"use client";

import { useState, useEffect, useTransition } from "react";
import { submitNps } from "./actions";

const NPS_DISMISSED_KEY = "vat100_nps_dismissed";

export function NpsSurvey() {
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(NPS_DISMISSED_KEY);
      if (!dismissed) {
        setVisible(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(NPS_DISMISSED_KEY, "true");
    } catch {
      // localStorage not available
    }
    setVisible(false);
  }

  function handleSubmit() {
    if (score === null) return;

    startTransition(async () => {
      const result = await submitNps(score, reason || undefined);
      if (!result.error) {
        setSubmitted(true);
        try {
          localStorage.setItem(NPS_DISMISSED_KEY, "true");
        } catch {
          // localStorage not available
        }
        setTimeout(() => setVisible(false), 2000);
      }
    });
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 998,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px 16px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 560,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "0.5px solid rgba(0,0,0,0.05)",
          borderRadius: 16,
          boxShadow: "0 24px 48px rgba(0,0,0,0.10)",
          padding: 24,
          position: "relative",
        }}
      >
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          aria-label="Sluiten"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            opacity: 0.3,
            color: "var(--foreground, #000000)",
            padding: 4,
            transition: "opacity 0.2s ease",
          }}
        >
          &times;
        </button>

        {submitted ? (
          <p
            style={{
              fontSize: 14,
              textAlign: "center",
              padding: "16px 0",
              color: "var(--color-black, #000000)",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Bedankt voor je score!
          </p>
        ) : (
          <>
            {/* Question */}
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: "0 0 16px",
                color: "var(--color-black, #000000)",
                lineHeight: 1.5,
                paddingRight: 24,
              }}
            >
              Hoe waarschijnlijk is het dat je VAT100 aanbeveelt aan een
              collega-freelancer?
            </p>

            {/* Score buttons */}
            <div
              style={{
                display: "flex",
                gap: 4,
                marginBottom: score !== null ? 16 : 0,
              }}
            >
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    fontSize: 12,
                    fontWeight: 600,
                    border:
                      score === i
                        ? "1.5px solid var(--color-black, #000000)"
                        : "0.5px solid rgba(0,0,0,0.12)",
                    borderRadius: 6,
                    background:
                      score === i
                        ? "var(--color-black, #000000)"
                        : "transparent",
                    color:
                      score === i
                        ? "var(--color-white, #FFFFFF)"
                        : "var(--color-black, #000000)",
                    cursor: "pointer",
                    transition:
                      "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                    minWidth: 0,
                  }}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* Labels */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: score !== null ? 12 : 0,
              }}
            >
              <span style={{ fontSize: 10, opacity: 0.4 }}>
                Zeer onwaarschijnlijk
              </span>
              <span style={{ fontSize: 10, opacity: 0.4 }}>
                Zeer waarschijnlijk
              </span>
            </div>

            {/* Reason + Submit (shown after score selection) */}
            {score !== null && (
              <>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Wat is de belangrijkste reden?"
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "0.5px solid rgba(0,0,0,0.12)",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.015)",
                    color: "var(--foreground, #000000)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                    resize: "none",
                    outline: "none",
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    background: "var(--color-black, #000000)",
                    color: "var(--color-white, #FFFFFF)",
                    border: "none",
                    borderRadius: 8,
                    cursor: isPending ? "not-allowed" : "pointer",
                    transition: "opacity 0.2s ease",
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? "Verzenden..." : "Verstuur"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

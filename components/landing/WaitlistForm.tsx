"use client";

import { useState } from "react";
import { joinWaitlist } from "@/features/waitlist/actions";

interface WaitlistLabels {
  waitlistLabel: string;
  waitlistTitle: string;
  waitlistDescription: string;
  waitlistName: string;
  waitlistNamePlaceholder: string;
  waitlistEmail: string;
  waitlistEmailPlaceholder: string;
  waitlistButton: string;
  waitlistSuccess: string;
  waitlistPosition: string;
  waitlistConfirm: string;
  waiting: string;
}

export default function WaitlistForm({ labels }: { labels: WaitlistLabels }) {
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWaitlistError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await joinWaitlist(formData);

    if (result.error) {
      setWaitlistError(result.error);
      setPending(false);
    } else {
      setPosition(result.data?.position ?? null);
      setSubmitted(true);
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          padding: "32px",
          border: "0.5px solid rgba(0,0,0,0.08)",
          borderRadius: "var(--radius)",
        }}
      >
        <p
          className="label-strong"
          style={{ marginBottom: 8, fontSize: 13 }}
        >
          {labels.waitlistSuccess}
        </p>
        <p
          style={{
            fontSize: 14,
            opacity: 0.5,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {position ? labels.waitlistPosition.replace("{position}", String(position)) : ""}
          {labels.waitlistConfirm}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="label-strong" style={{ marginBottom: 16, fontSize: 11 }}>
        {labels.waitlistLabel}
      </p>
      <h2
        style={{
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          margin: 0,
          marginBottom: 16,
        }}
      >
        {labels.waitlistTitle}
      </h2>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.8,
          margin: 0,
          marginBottom: 32,
          opacity: 0.55,
        }}
      >
        {labels.waitlistDescription}
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label
              htmlFor="waitlist-name"
              className="label"
              style={{ opacity: 0.35, display: "block", marginBottom: 4 }}
            >
              {labels.waitlistName}
            </label>
            <input
              id="waitlist-name"
              name="name"
              type="text"
              required
              placeholder={labels.waitlistNamePlaceholder}
              style={{
                fontSize: "13px",
                fontWeight: 400,
                padding: "14px 0",
                border: "none",
                borderBottom: "0.5px solid rgba(0,0,0,0.1)",
                background: "transparent",
                color: "var(--color-black)",
                outline: "none",
                width: "100%",
                transition: "border-color 0.2s ease",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label
              htmlFor="waitlist-email"
              className="label"
              style={{ opacity: 0.35, display: "block", marginBottom: 4 }}
            >
              {labels.waitlistEmail}
            </label>
            <input
              id="waitlist-email"
              name="email"
              type="email"
              required
              placeholder={labels.waitlistEmailPlaceholder}
              style={{
                fontSize: "13px",
                fontWeight: 400,
                padding: "14px 0",
                border: "none",
                borderBottom: "0.5px solid rgba(0,0,0,0.1)",
                background: "transparent",
                color: "var(--color-black)",
                outline: "none",
                width: "100%",
                transition: "border-color 0.2s ease",
              }}
            />
          </div>
        </div>

        {waitlistError && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              background: "rgba(165, 28, 48, 0.04)",
              borderLeft: "2px solid var(--color-accent)",
              fontSize: "12px",
            }}
          >
            {waitlistError}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
          style={{
            padding: "18px 32px",
            alignSelf: "flex-start",
          }}
        >
          {pending ? labels.waiting : labels.waitlistButton}
        </button>
      </form>
    </div>
  );
}

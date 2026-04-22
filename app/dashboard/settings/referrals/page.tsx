"use client";

import { useEffect, useState } from "react";
import { getReferralStats, type ReferralStats } from "@/features/referrals/actions";

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReferralStats().then((result) => {
      if (result.error || !result.data) {
        setError(result.error ?? "Kon referral-gegevens niet laden.");
      } else {
        setStats(result.data);
      }
    });
  }, []);

  async function handleCopy() {
    if (!stats) return;
    await navigator.clipboard.writeText(stats.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: 600, padding: "48px 0" }}>
      <h2
        style={{
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          margin: 0,
        }}
      >
        Verdien maanden gratis
      </h2>
      <p
        className="label"
        style={{ marginTop: 16, opacity: 0.5, maxWidth: 520, lineHeight: 1.6 }}
      >
        Stuur je persoonlijke link naar een andere ZZP&apos;er. Zodra ze hun
        eerste betaling doen, krijgen jullie allebei één maand VAT100 gratis.
      </p>

      {error && (
        <p role="alert" style={{ marginTop: 32, color: "var(--color-accent)", fontSize: 13 }}>
          {error}
        </p>
      )}

      {stats && (
        <>
          <div
            style={{
              marginTop: 40,
              padding: 32,
              border: "0.5px solid rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p
              className="label"
              style={{ margin: 0, opacity: 0.5, letterSpacing: "0.12em", textTransform: "uppercase" }}
            >
              Jouw code
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                fontFamily: "var(--font-geist-mono, monospace)",
              }}
            >
              {stats.code}
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                paddingTop: 16,
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
              }}
            >
              <input
                readOnly
                value={stats.shareUrl}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  background: "transparent",
                  fontSize: 13,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  color: "var(--foreground)",
                }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                {copied ? "Gekopieerd" : "Kopieer"}
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <Stat label="Uitgenodigd" value={stats.totalReferred} />
            <Stat label="Betaald" value={stats.qualifiedCount} />
            <Stat label="Maanden gratis" value={stats.monthsEarned} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 20, border: "0.5px solid rgba(0,0,0,0.1)" }}>
      <p
        className="label"
        style={{ margin: 0, opacity: 0.5, letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { requestAccountDeletion } from "@/features/account/actions";

const sectionStyle: React.CSSProperties = {
  paddingTop: 28,
  marginTop: 28,
  borderTop: "0.5px solid rgba(0,0,0,0.08)",
};

export default function PrivacySettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleDelete() {
    setError(null);
    setPending(true);
    const res = await requestAccountDeletion();
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 2800);
  }

  if (done) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>Verzoek ontvangen</h1>
        <p style={{ fontSize: 14, opacity: 0.6, lineHeight: 1.6 }}>
          Je account is gedeactiveerd en je bent uitgelogd. Je wordt doorgestuurd…
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
      <Link href="/dashboard/settings" className="label" style={{ opacity: 0.4, textDecoration: "none", color: "var(--foreground)" }}>
        ← Instellingen
      </Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "16px 0 4px" }}>
        Privacy &amp; gegevens
      </h1>
      <p style={{ fontSize: 14, opacity: 0.55, margin: "0 0 8px", lineHeight: 1.6 }}>
        Jouw gegevens, jouw controle.
      </p>

      {/* Export */}
      <section style={sectionStyle}>
        <p className="label-strong" style={{ margin: "0 0 8px" }}>Je gegevens downloaden</p>
        <p style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.6, margin: "0 0 16px" }}>
          Download al je gegevens — profiel, facturen, klanten, bonnen, transacties
          en meer — als één JSON-bestand.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            window.location.href = "/api/export/my-data";
          }}
        >
          Download mijn gegevens
        </button>
      </section>

      {/* Verwijderen */}
      <section style={sectionStyle}>
        <p className="label-strong" style={{ margin: "0 0 8px" }}>Account verwijderen</p>
        <p style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.6, margin: "0 0 16px" }}>
          Je account wordt direct gedeactiveerd en je wordt uitgelogd. Vanwege de
          fiscale bewaarplicht (7 jaar) worden je administratiegegevens niet meteen
          volledig gewist; dat gebeurt ná de bewaartermijn. <strong>Download eerst
          je gegevens</strong> als je ze wilt bewaren.
        </p>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 18px",
              border: "0.5px solid var(--color-accent)",
              borderRadius: 8,
              background: "transparent",
              color: "var(--color-accent)",
              cursor: "pointer",
            }}
          >
            Account verwijderen
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
              Weet je het zeker? Dit deactiveert je account direct.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: 8,
                  background: "var(--color-accent)",
                  color: "var(--background)",
                  cursor: pending ? "default" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Bezig…" : "Ja, verwijder mijn account"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "10px 18px",
                  border: "0.5px solid rgba(0,0,0,0.15)",
                  borderRadius: 8,
                  background: "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" style={{ fontSize: 12, color: "var(--color-accent)", marginTop: 12 }}>
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
